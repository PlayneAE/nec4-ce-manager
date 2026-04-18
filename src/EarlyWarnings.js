import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Documents from './Documents'
import EWNDetail from './EWNDetail'

function EarlyWarnings({ userRole, inline, onClose }) {
  const [warnings, setWarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subcontracts, setSubcontracts] = useState([])
  const [selectedEW, setSelectedEW] = useState(null)
  const [file, setFile] = useState(null)
  const [fileTitle, setFileTitle] = useState('')
  const [form, setForm] = useState({
    subcontract_id: '',
    reference: '',
    description: '',
    raised_by: 'contractor',
    risk_type: [],
    notification_date: '',
    rrm_date: '',
    notes: '',
  })

  useEffect(() => {
    fetchWarnings()
    fetchSubcontracts()
  }, [])

  async function fetchWarnings() {
    const { data } = await supabase
      .from('early_warnings')
      .select(`*, subcontracts (reference, subcontractor_name)`)
      .order('notification_date', { ascending: false })
    setWarnings(data || [])
    setLoading(false)
  }

  async function fetchSubcontracts() {
    const { data } = await supabase
      .from('subcontracts')
      .select('id, reference, subcontractor_name')
    setSubcontracts(data || [])
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleRiskTypeChange(value) {
    const current = form.risk_type
    if (current.includes(value)) {
      setForm({ ...form, risk_type: current.filter(v => v !== value) })
    } else {
      setForm({ ...form, risk_type: [...current, value] })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: ewData, error } = await supabase
      .from('early_warnings')
      .insert({
        ...form,
        rrm_date: form.rrm_date || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (!error && ewData && file) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (!uploadError) {
        await supabase.from('documents').insert({
          title: fileTitle || file.name,
          url: filePath,
          document_type: 'early_warning',
          ew_id: ewData.id,
          created_by: user.id,
        })
      }
    }

    if (!error) {
      setForm({ subcontract_id: '', reference: '', description: '', raised_by: 'contractor', risk_type: [], notification_date: '', rrm_date: '', notes: '' })
      setFile(null)
      setFileTitle('')
      setShowForm(false)
      fetchWarnings()
    }
    setSaving(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('early_warnings').update({ status }).eq('id', id)
    fetchWarnings()
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

  const inputStyle = { width: '100%', padding: '8px 12px', fontSize: '14px', border: '0.5px solid #b4b2a9', borderRadius: '6px', boxSizing: 'border-box', background: '#fff' }
  const labelStyle = { fontSize: '12px', color: '#5f5e5a', display: 'block', marginBottom: '6px' }
  const fieldStyle = { marginBottom: '16px' }

  const content = (
    <>
      {showForm && (
        <div style={{ background: '#f9f8f5', border: '0.5px solid #e0ddd5', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Subcontract</label>
                <select name="subcontract_id" value={form.subcontract_id} onChange={handleChange} required style={inputStyle}>
                  <option value="">Select subcontract...</option>
                  {subcontracts.map(s => (
                    <option key={s.id} value={s.id}>{s.reference} — {s.subcontractor_name}</option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>EWN reference</label>
                <input name="reference" value={form.reference} onChange={handleChange} required placeholder="e.g. EW-001" style={inputStyle} />
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Description of risk</label>
              <textarea name="description" value={form.description} onChange={handleChange} required rows={3} placeholder="Describe the risk and potential impact..." style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Raised by</label>
                <select name="raised_by" value={form.raised_by} onChange={handleChange} style={inputStyle}>
                  <option value="contractor">Contractor</option>
                  <option value="pm">Project manager</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Notification date</label>
                <input name="notification_date" type="date" value={form.notification_date} onChange={handleChange} required style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>RRM date (if scheduled)</label>
                <input name="rrm_date" type="date" value={form.rrm_date} onChange={handleChange} style={inputStyle} />
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Risk type (select all that apply)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', border: '0.5px solid #b4b2a9', borderRadius: '6px', background: '#fff' }}>
                {[
                  { value: 'cost', label: 'Cost increase' },
                  { value: 'delay_completion', label: 'Delay to completion date' },
                  { value: 'delay_key_date', label: 'Delay to key date' },
                  { value: 'delay_sectional_completion', label: 'Delay to sectional completion' },
                  { value: 'performance', label: 'Performance impairment' },
                  { value: 'employers_business', label: "Employer's business" },
                  { value: 'other', label: 'Other' },
                ].map(option => (
                  <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.risk_type.includes(option.value)} onChange={() => handleRiskTypeChange(option.value)} />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Notes</label>
              <input name="notes" value={form.notes} onChange={handleChange} placeholder="Additional notes..." style={inputStyle} />
            </div>

            <div style={{ borderTop: '0.5px solid #e0ddd5', paddingTop: '16px', marginTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#5f5e5a', marginBottom: '12px' }}>Attach notice document (optional)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Document title</label>
                  <input value={fileTitle} onChange={e => setFileTitle(e.target.value)} placeholder="e.g. EW-001 Early Warning Notice" style={inputStyle} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>File</label>
                  <input type="file" onChange={e => setFile(e.target.files[0])} accept=".pdf,.doc,.docx,.xls,.xlsx,.msg,.eml,.jpg,.png" style={{ ...inputStyle, padding: '6px 12px' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 20px', fontSize: '13px', border: '0.5px solid #b4b2a9', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#5f5e5a' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, background: '#2c2c2a', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save EWN'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 1fr 140px 120px 110px 90px', padding: '8px 20px', borderBottom: '0.5px solid #e0ddd5', background: '#f9f8f5' }}>
          {['Ref', 'Subcontract', 'Description', 'Risk type', 'Status', 'Notified', ''].map(h => (
            <span key={h} style={{ fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888780', fontSize: '14px' }}>Loading...</div>
        ) : warnings.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888780', fontSize: '14px' }}>No early warnings yet. Click + New EWN to add one.</div>
        ) : (
          warnings.map(ew => {
            const sc = statusColors[ew.status] || statusColors.open
            return (
              <div key={ew.id} style={{ display: 'grid', gridTemplateColumns: '80px 100px 1fr 140px 120px 110px 90px', padding: '12px 20px', borderBottom: '0.5px solid #f1efe8', alignItems: 'center' }}>
                <span
                  style={{ fontWeight: 500, fontSize: '13px', cursor: 'pointer', color: '#185fa5', textDecoration: 'underline' }}
                  onClick={() => setSelectedEW(ew)}
                >
                  {ew.reference}
                </span>
                <span style={{ fontSize: '13px', color: '#888780' }}>{ew.subcontracts?.reference}</span>
                <span style={{ fontSize: '13px', color: '#3d3d3a', paddingRight: '12px' }}>{ew.description}</span>
                <span style={{ fontSize: '12px', color: '#5f5e5a' }}>
                  {Array.isArray(ew.risk_type) ? ew.risk_type.map(r => riskTypeLabels[r]).join(', ') : riskTypeLabels[ew.risk_type]}
                </span>
                <span>
                  <select value={ew.status} onChange={e => updateStatus(ew.id, e.target.value)} style={{ ...sc, fontSize: '11px', fontWeight: 500, padding: '3px 6px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
                    <option value="open">Open</option>
                    <option value="rrm_requested">RRM requested</option>
                    <option value="rrm_held">RRM held</option>
                    <option value="actioned">Actioned</option>
                    <option value="closed">Closed</option>
                    <option value="became_ce">Became CE</option>
                  </select>
                </span>
                <span style={{ fontSize: '13px', color: '#888780' }}>
                  {new Date(ew.notification_date).toLocaleDateString('en-GB')}
                </span>
                <span>
                  {(ew.status === 'rrm_requested' || ew.status === 'rrm_held') && (
                    <button
                      onClick={() => setSelectedEW(ew)}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer', color: '#5f5e5a' }}
                    >
                      RRM docs
                    </button>
                  )}
                </span>
              </div>
            )
          })
        )}
      </div>

      {selectedEW && (
        <EWNDetail
          ew={selectedEW}
          onClose={() => setSelectedEW(null)}
          onUpdated={() => { fetchWarnings(); setSelectedEW(null) }}
        />
      )}
    </>
  )

  if (inline) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button onClick={() => setShowForm(!showForm)} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer' }}>
            {showForm ? 'Cancel' : '+ New EWN'}
          </button>
        </div>
        {content}
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #e0ddd5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 500, fontSize: '16px' }}>Early warning register</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => setShowForm(!showForm)} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer' }}>
              {showForm ? 'Cancel' : '+ New EWN'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780' }}>×</button>
          </div>
        </div>
        <div style={{ padding: '24px 28px' }}>{content}</div>
      </div>
    </div>
  )
}

export default EarlyWarnings