import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import Documents from './Documents'

function CEDetail({ ce, onClose, onUpdated }) {
  const [timelineEvents, setTimelineEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDocuments, setShowDocuments] = useState(false)

  const fetchTimeline = useCallback(async () => {
    const { data } = await supabase
      .from('ce_timeline_events')
      .select('*')
      .eq('ce_id', ce.id)
      .order('event_date', { ascending: true })
    setTimelineEvents(data || [])
    setLoading(false)
  }, [ce.id])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  function daysRemaining(dateString) {
    if (!dateString) return null
    const today = new Date()
    const due = new Date(dateString)
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  }

  const dueDate = ce.quotation_due_date || ce.pm_reply_due_date
  const days = daysRemaining(dueDate)
  const isDeemed = ce.status === 'pm_reply_due' && days !== null && days < 0

  async function advanceStage() {
    const transitions = {
      draft:             'notified',
      notified:          'quotation_due',
      quotation_due:     'quoted',
      quoted:            'pm_reply_due',
      pm_reply_due:      isDeemed ? 'deemed_acceptance' : 'implemented',
      deemed_acceptance: 'implemented',
    }

    const stageLabels = {
      draft:             { label: 'CE notified', clause: '61.3' },
      notified:          { label: 'Quotation instructed', clause: '62.1' },
      quotation_due:     { label: 'Quotation submitted', clause: '62.3' },
      quoted:            { label: 'PM reply received', clause: '62.3' },
      pm_reply_due:      isDeemed ? { label: 'Clause 62.6 notice issued', clause: '62.6' } : { label: 'PM reply received', clause: '62.3' },
      deemed_acceptance: { label: 'CE deemed accepted', clause: '62.6' },
    }

    const nextStatus = transitions[ce.status]
    if (!nextStatus) return

    const { data: { user } } = await supabase.auth.getUser()
    const today = new Date().toISOString().split('T')[0]
    const info = stageLabels[ce.status]

    await supabase.from('ce_timeline_events').insert({
      ce_id: ce.id,
      stage: info.label,
      nec4_clause: info.clause,
      event_date: today,
      deadline_date: ce.quotation_due_date || ce.pm_reply_due_date,
      deadline_met: !isDeemed,
      recorded_by: user.id,
    })

    const updateData = { status: nextStatus }

    if (ce.status === 'pm_reply_due' && isDeemed) {
      const newDeadline = new Date()
      newDeadline.setDate(newDeadline.getDate() + 14)
      updateData.pm_reply_due_date = newDeadline.toISOString().split('T')[0]
    }

    await supabase
      .from('compensation_events')
      .update(updateData)
      .eq('id', ce.id)

    onUpdated()
  }

  const statusColors = {
    draft:             { bg: '#f1efe8', color: '#5f5e5a' },
    notified:          { bg: '#e6f1fb', color: '#185fa5' },
    quotation_due:     { bg: '#faeeda', color: '#854f0b' },
    quoted:            { bg: '#eaf3de', color: '#3b6d11' },
    pm_reply_due:      { bg: '#fcebeb', color: '#a32d2d' },
    deemed_acceptance: { bg: '#faeeda', color: '#854f0b' },
    implemented:       { bg: '#e1f5ee', color: '#0f6e56' },
    disputed:          { bg: '#fbeaf0', color: '#993556' },
  }

  const nextActionLabels = {
    draft:             'Mark as notified',
    notified:          'Instruction to quote received',
    quotation_due:     'Quotation submitted',
    quoted:            'PM reply received',
    pm_reply_due:      isDeemed ? 'Issue clause 62.6 notice' : 'PM reply received',
    deemed_acceptance: 'Mark as deemed accepted',
  }

  const sc = statusColors[ce.status] || statusColors.draft

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #e0ddd5' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 500, fontSize: '16px' }}>{ce.reference}</span>
                <span style={{ background: sc.bg, color: sc.color, fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '4px' }}>
                  {ce.status.replace(/_/g, ' ')}
                </span>
                {isDeemed && (
                  <span style={{ background: '#fcebeb', color: '#a32d2d', fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '4px' }}>
                    Deemed acceptance available
                  </span>
                )}
              </div>
              <div style={{ fontSize: '13px', color: '#5f5e5a', marginBottom: '4px' }}>{ce.description}</div>
              <div style={{ fontSize: '12px', color: '#888780' }}>
                {ce.subcontracts?.reference} — {ce.subcontracts?.subcontractor_name}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '16px' }}>
              <button
                onClick={() => setShowDocuments(true)}
                style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer', color: '#2c2c2a' }}
              >
                Documents
              </button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780' }}>×</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '0' }}>

          {/* Timeline */}
          <div style={{ padding: '24px 28px', borderRight: '0.5px solid #e0ddd5' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#5f5e5a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>Timeline</div>

            {loading ? (
              <div style={{ fontSize: '13px', color: '#888780' }}>Loading...</div>
            ) : timelineEvents.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#888780' }}>No timeline events yet.</div>
            ) : (
              timelineEvents.map((event, i) => (
                <div key={event.id} style={{ display: 'flex', gap: '12px', marginBottom: '16px', position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: event.deadline_met ? '#0f6e56' : '#a32d2d', flexShrink: 0, marginTop: '3px' }} />
                    {i < timelineEvents.length - 1 && (
                      <div style={{ width: '1px', background: '#e0ddd5', flex: 1, marginTop: '4px' }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#2c2c2a' }}>{event.stage}</div>
                    <div style={{ fontSize: '12px', color: '#888780', marginTop: '2px' }}>
                      {new Date(event.event_date).toLocaleDateString('en-GB')}
                      {event.nec4_clause && ` · clause ${event.nec4_clause}`}
                    </div>
                    {event.notes && (
                      <div style={{ fontSize: '12px', color: '#5f5e5a', marginTop: '4px' }}>{event.notes}</div>
                    )}
                  </div>
                </div>
              ))
            )}

            {nextActionLabels[ce.status] && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#e0ddd5', flexShrink: 0, marginTop: '3px', border: '2px solid #b4b2a9' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#888780' }}>{nextActionLabels[ce.status]}</div>
                    <div style={{ fontSize: '12px', color: '#b4b2a9', marginTop: '2px' }}>Pending</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {dueDate && (
              <div>
                <div style={{ fontSize: '11px', color: '#888780', marginBottom: '6px' }}>Next deadline</div>
                <div style={{ fontSize: '22px', fontWeight: 500, color: days < 0 ? '#a32d2d' : days <= 3 ? '#a32d2d' : days <= 7 ? '#854f0b' : '#2c2c2a' }}>
                  {days < 0 ? `${days} days` : `${days} days`}
                </div>
                <div style={{ fontSize: '12px', color: '#888780', marginTop: '2px' }}>
                  {new Date(dueDate).toLocaleDateString('en-GB')}
                </div>
              </div>
            )}

            <div style={{ borderTop: '0.5px solid #e0ddd5', paddingTop: '16px' }}>
              <div style={{ fontSize: '11px', color: '#888780', marginBottom: '4px' }}>NEC4 clause</div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>{ce.nec4_clause || '61.3'}</div>
            </div>

            <div style={{ borderTop: '0.5px solid #e0ddd5', paddingTop: '16px' }}>
              <div style={{ fontSize: '11px', color: '#888780', marginBottom: '4px' }}>Notified by</div>
              <div style={{ fontSize: '13px', fontWeight: 500, textTransform: 'capitalize' }}>{ce.notified_by}</div>
            </div>

            {ce.notified_value && (
              <div style={{ borderTop: '0.5px solid #e0ddd5', paddingTop: '16px' }}>
                <div style={{ fontSize: '11px', color: '#888780', marginBottom: '4px' }}>Notified value</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>£{Number(ce.notified_value).toLocaleString('en-GB')}</div>
              </div>
            )}

            {ce.quotation_due_date && (
              <div style={{ borderTop: '0.5px solid #e0ddd5', paddingTop: '16px' }}>
                <div style={{ fontSize: '11px', color: '#888780', marginBottom: '4px' }}>Quotation due</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{new Date(ce.quotation_due_date).toLocaleDateString('en-GB')}</div>
              </div>
            )}

            {ce.pm_reply_due_date && (
              <div style={{ borderTop: '0.5px solid #e0ddd5', paddingTop: '16px' }}>
                <div style={{ fontSize: '11px', color: '#888780', marginBottom: '4px' }}>PM reply due</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{new Date(ce.pm_reply_due_date).toLocaleDateString('en-GB')}</div>
              </div>
            )}

            {nextActionLabels[ce.status] && (
              <div style={{ borderTop: '0.5px solid #e0ddd5', paddingTop: '16px' }}>
                <button
                  onClick={advanceStage}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', fontWeight: 500, background: isDeemed ? '#a32d2d' : '#2c2c2a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  {nextActionLabels[ce.status]}
                </button>
              </div>
            )}

          </div>
        </div>

        {showDocuments && (
          <Documents
            ceId={ce.id}
            onClose={() => setShowDocuments(false)}
          />
        )}

      </div>
    </div>
  )
}

export default CEDetail