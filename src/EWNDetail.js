import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import Documents from './Documents'

function EWNDetail({ ew, onClose, onUpdated }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRRMDocs, setShowRRMDocs] = useState(false)

  const fetchDocuments = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('ew_id', ew.id)
      .order('created_at', { ascending: true })
    setDocuments(data || [])
    setLoading(false)
  }, [ew.id])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  async function handleDownload(doc) {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.url, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function updateStatus(status) {
    await supabase.from('early_warnings').update({ status }).eq('id', ew.id)
    onUpdated()
  }

  const statusColors = {
    open:          { background: '#e6f1fb', color: '#185fa5' },
    rrm_requested: { background: '#faeeda', color: '#854f0b' },
    rrm_held:      { background: '#eaf3de', color: '#3b6d11' },
    actioned:      { background: '#e1f5ee', color: '#0f6e56' },
    closed:        { background: '#f1efe8', color: '#5f5e5a' },
    became_ce:     { background: '#fbeaf0', color: '#993556' },
  }

  const riskTypeLabels = {
    cost:                       'Cost increase',
    delay_completion:           'Delay to completion date',
    delay_key_date:             'Delay to key date',
    delay_sectional_completion: 'Delay to sectional completion',
    performance:                'Performance impairment',
    employers_business:         "Employer's business",
    other:                      'Other',
  }

  const documentTypeLabels = {
    ce_notice:      'CE notice',
    early_warning:  'Early warning',
    payment:        'Payment document',
    programme:      'Programme',
    contract:       'Contract document',
    correspondence: 'Correspondence',
    other:          'Other',
  }

  if (!ew) return null

  const sc = statusColors[ew.status] || statusColors.open

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #e0ddd5' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 500, fontSize: '16px' }}>{ew.reference}</span>
                <span style={{ background: sc.background, color: sc.color, fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '4px' }}>
                  {ew.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#5f5e5a', marginBottom: '4px' }}>{ew.description}</div>
              <div style={{ fontSize: '12px', color: '#888780' }}>
                {ew.subcontracts?.reference} — {ew.subcontracts?.subcontractor_name}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780', marginLeft: '16px' }}>×</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '0' }}>

          <div style={{ padding: '24px 28px', borderRight: '0.5px solid #e0ddd5' }}>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#5f5e5a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Risk types</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Array.isArray(ew.risk_type) && ew.risk_type.map(r => (
                  <span key={r} style={{ fontSize: '12px', background: '#f1efe8', padding: '3px 8px', borderRadius: '4px', color: '#5f5e5a' }}>
                    {riskTypeLabels[r]}
                  </span>
                ))}
              </div>
            </div>

            {ew.notes && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#5f5e5a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Notes</div>
                <div style={{ fontSize: '13px', color: '#3d3d3a' }}>{ew.notes}</div>
              </div>
            )}

            <div style={{ borderTop: '0.5px solid #e0ddd5', paddingTop: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#5f5e5a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>Documents</div>
              {loading ? (
                <div style={{ fontSize: '13px', color: '#888780' }}>Loading...</div>
              ) : documents.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#888780' }}>No documents attached.</div>
              ) : (
                documents.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #f1efe8' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#2c2c2a', marginBottom: '2px' }}>{doc.title}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontSize: '11px', background: '#f1efe8', padding: '2px 6px', borderRadius: '4px', color: '#5f5e5a' }}>
                          {documentTypeLabels[doc.document_type]}
                        </span>
                        <span style={{ fontSize: '11px', color: '#888780' }}>
                          {new Date(doc.created_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => handleDownload(doc)} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer' }}>
                      Open
                    </button>
                  </div>
                ))
              )}

              {(ew.status === 'rrm_requested' || ew.status === 'rrm_held') && (
                <button
                  onClick={() => setShowRRMDocs(true)}
                  style={{ marginTop: '12px', fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer' }}
                >
                  + Add RRM minutes
                </button>
              )}
            </div>
          </div>

          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#888780', marginBottom: '6px' }}>Notified</div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>
                {new Date(ew.notification_date).toLocaleDateString('en-GB')}
              </div>
            </div>

            <div style={{ borderTop: '0.5px solid #e0ddd5', paddingTop: '16px' }}>
              <div style={{ fontSize: '11px', color: '#888780', marginBottom: '6px' }}>Raised by</div>
              <div style={{ fontSize: '13px', fontWeight: 500, textTransform: 'capitalize' }}>{ew.raised_by}</div>
            </div>

            {ew.rrm_date && (
              <div style={{ borderTop: '0.5px solid #e0ddd5', paddingTop: '16px' }}>
                <div style={{ fontSize: '11px', color: '#888780', marginBottom: '6px' }}>RRM date</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>
                  {new Date(ew.rrm_date).toLocaleDateString('en-GB')}
                </div>
              </div>
            )}

            <div style={{ borderTop: '0.5px solid #e0ddd5', paddingTop: '16px' }}>
              <div style={{ fontSize: '11px', color: '#888780', marginBottom: '8px' }}>Update status</div>
              <select
                value={ew.status}
                onChange={e => updateStatus(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', fontSize: '13px', border: '0.5px solid #b4b2a9', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
              >
                <option value="open">Open</option>
                <option value="rrm_requested">RRM requested</option>
                <option value="rrm_held">RRM held</option>
                <option value="actioned">Actioned</option>
                <option value="closed">Closed</option>
                <option value="became_ce">Became CE</option>
              </select>
            </div>
          </div>
        </div>

        {showRRMDocs && (
          <Documents
            ewId={ew.id}
            onClose={() => { setShowRRMDocs(false); fetchDocuments() }}
          />
        )}

      </div>
    </div>
  )
}

export default EWNDetail