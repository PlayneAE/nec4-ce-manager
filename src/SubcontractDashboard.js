import ReportGenerator from './ReportGenerator'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'

function SubcontractDashboard({ subcontract, onClose, onNavigate }) {
  const [ces, setCes] = useState([])
  const [ewns, setEwns] = useState([])
  const [payments, setPayments] = useState([])
  const [amendments, setAmendments] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReport, setShowReport] = useState(false)

  const fetchData = useCallback(async () => {
    const [cesRes, ewnsRes, paymentsRes, amendmentsRes, programmeRes] = await Promise.all([
  supabase.from('compensation_events').select('*').eq('subcontract_id', subcontract.id),
  supabase.from('early_warnings').select('*').eq('subcontract_id', subcontract.id),
  supabase.from('payment_cycles').select('*').eq('subcontract_id', subcontract.id).order('cycle_number', { ascending: false }),
  supabase.from('contract_amendments').select('*').eq('subcontract_id', subcontract.id),
  supabase.from('programme_submissions').select('*').eq('subcontract_id', subcontract.id).order('submission_date', { ascending: false }),
])
    setCes(cesRes.data || [])
    setEwns(ewnsRes.data || [])
    setPayments(paymentsRes.data || [])
    setAmendments(amendmentsRes.data || [])
    setProgrammes(programmeRes.data || [])
    setLoading(false)
  }, [subcontract.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function daysRemaining(dateString) {
    if (!dateString) return null
    const today = new Date()
    const due = new Date(dateString)
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  }

  // CE stats
  const totalCEs = ces.length
  const openCEs = ces.filter(ce => ce.status !== 'implemented').length
  const overdueCEs = ces.filter(ce => {
    const days = daysRemaining(ce.quotation_due_date || ce.pm_reply_due_date)
    return days !== null && days < 0 && ce.status !== 'implemented'
  }).length
  const notifiedValue = ces.reduce((sum, ce) => sum + (parseFloat(ce.notified_value) || 0), 0)

  // EWN stats
  const openEWNs = ewns.filter(ew => ew.status !== 'closed').length
  const rrmPending = ewns.filter(ew => ew.status === 'rrm_requested').length

  // Payment stats
  const latestPayment = payments[0]
  const totalAfp = payments.reduce((sum, p) => sum + (parseFloat(p.afp_amount) || 0), 0)
  const totalCertified = payments.reduce((sum, p) => sum + (parseFloat(p.certified_amount) || 0), 0)
  const nextPaymentDue = payments.find(p => p.status !== 'paid')

  // Outstanding actions
  const contractorActions = ces.filter(ce => 
    ce.status === 'notified' || ce.status === 'quotation_due'
  ).length + ewns.filter(ew => ew.status === 'open').length

  const pmActions = ces.filter(ce => 
    ce.status === 'quoted' || ce.status === 'pm_reply_due' || ce.status === 'deemed_acceptance'
  ).length + ewns.filter(ew => ew.status === 'rrm_requested').length

  const cardStyle = {
    background: '#fff',
    border: '0.5px solid #e0ddd5',
    borderRadius: '12px',
    padding: '24px',
  }

  const labelStyle = {
    fontSize: '11px',
    color: '#888780',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontWeight: 500,
    marginBottom: '16px',
  }

  const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '0.5px solid #f1efe8',
    fontSize: '13px',
  }

  const linkStyle = {
    fontSize: '12px',
    color: '#185fa5',
    cursor: 'pointer',
    textDecoration: 'none',
  }

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', fontSize: '14px', color: '#888780' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#f9f8f5', borderRadius: '12px', width: '100%', maxWidth: '1100px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ background: '#fff', borderBottom: '0.5px solid #e0ddd5', padding: '20px 28px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <div>
    <div style={{ fontWeight: 500, fontSize: '16px', marginBottom: '4px' }}>
      {subcontract.reference} — {subcontract.subcontractor_name}
    </div>
    <div style={{ fontSize: '12px', color: '#888780' }}>
      NEC4 Option {subcontract.nec_option}
      {subcontract.commencement_date && ` · Started ${new Date(subcontract.commencement_date).toLocaleDateString('en-GB')}`}
      {subcontract.completion_date && ` · Completion ${new Date(subcontract.completion_date).toLocaleDateString('en-GB')}`}
    </div>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
    <button
      onClick={() => setShowReport(true)}
      style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer', color: '#2c2c2a' }}
    >
      Export PDF
    </button>
    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780' }}>×</button>
  </div>
</div>

        {/* Dashboard grid */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Row 1 - Contract Price */}
<div></div>
          {/* Contract Price */}
          <div style={cardStyle}>
            <div style={labelStyle}>Contract price</div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Initial price</span>
              <span style={{ fontWeight: 500 }}>—</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Compensation events</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 500 }}>£{notifiedValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
                <span style={linkStyle} onClick={() => { onClose(); onNavigate('dashboard') }}>View</span>
              </div>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Current price</span>
              <span style={{ fontWeight: 500, color: notifiedValue > 0 ? '#854f0b' : '#2c2c2a' }}>
                £{notifiedValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <span style={{ color: '#5f5e5a' }}>Z-clause amendments</span>
              <span style={{ fontWeight: 500 }}>{amendments.length}</span>
            </div>
          </div>

</div>

{/* Row 2 & 3 - remaining cards */}
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {/* Programme */}
<div style={cardStyle}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
    <div style={labelStyle}>Programme</div>
    {onNavigate && <span style={linkStyle} onClick={() => { onClose(); onNavigate('programme') }}>View register</span>}
  </div>

  {programmes.length === 0 ? (
    <div style={{ fontSize: '13px', color: '#888780' }}>No submissions yet.</div>
  ) : (() => {
    const latest = programmes[0]
    const current = programmes.find(p => p.is_current)
    const movement = latest.completion_movement_days

    return (
      <>
        <div style={rowStyle}>
          <span style={{ color: '#5f5e5a' }}>Latest submission</span>
          <span style={{ fontWeight: 500 }}>{new Date(latest.submission_date).toLocaleDateString('en-GB')}</span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: '#5f5e5a' }}>Latest accepted</span>
          <span style={{ fontWeight: 500 }}>
            {current ? new Date(current.submission_date).toLocaleDateString('en-GB') : '—'}
          </span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: '#5f5e5a' }}>Planned completion</span>
          <span style={{ fontWeight: 500 }}>{new Date(latest.planned_completion).toLocaleDateString('en-GB')}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={{ color: '#5f5e5a' }}>Movement</span>
          <span style={{ fontWeight: 500, color: movement > 0 ? '#a32d2d' : movement < 0 ? '#0f6e56' : '#2c2c2a' }}>
            {movement > 0 ? `+${movement} days` : movement < 0 ? `${movement} days` : '—'}
          </span>
        </div>
      </>
    )
  })()}
</div>

          {/* Contract Dates */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={labelStyle}>Contract dates</div>
            </div>
            {[
              { label: 'Commencement date', date: subcontract.commencement_date },
              { label: 'Original completion date', date: subcontract.completion_date },
              { label: 'Quotation period', date: null, value: `${subcontract.quotation_period_weeks} weeks` },
              { label: 'PM reply period', date: null, value: `${subcontract.pm_reply_period_weeks} weeks` },
            ].map(item => (
              <div key={item.label} style={rowStyle}>
                <span style={{ color: '#5f5e5a' }}>{item.label}</span>
                <span style={{ fontWeight: 500 }}>
                  {item.date ? new Date(item.date).toLocaleDateString('en-GB') : item.value || '—'}
                </span>
              </div>
            ))}
          </div>

          {/* Outstanding Actions */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={labelStyle}>Outstanding actions</div>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Contractor</span>
              <span style={{ fontWeight: 500, color: contractorActions > 0 ? '#a32d2d' : '#0f6e56' }}>{contractorActions}</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Project manager</span>
              <span style={{ fontWeight: 500, color: pmActions > 0 ? '#a32d2d' : '#0f6e56' }}>{pmActions}</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Overdue CEs</span>
              <span style={{ fontWeight: 500, color: overdueCEs > 0 ? '#a32d2d' : '#0f6e56' }}>{overdueCEs}</span>
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <span style={{ color: '#5f5e5a' }}>RRM pending</span>
              <span style={{ fontWeight: 500, color: rrmPending > 0 ? '#854f0b' : '#0f6e56' }}>{rrmPending}</span>
            </div>
          </div>

          {/* Compensation Events */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={labelStyle}>Compensation events</div>
              <span style={linkStyle} onClick={() => { onClose(); onNavigate('dashboard') }}>View register</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Total CEs</span>
              <span style={{ fontWeight: 500 }}>{totalCEs}</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Open CEs</span>
              <span style={{ fontWeight: 500, color: openCEs > 0 ? '#854f0b' : '#0f6e56' }}>{openCEs}</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Overdue</span>
              <span style={{ fontWeight: 500, color: overdueCEs > 0 ? '#a32d2d' : '#0f6e56' }}>{overdueCEs}</span>
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <span style={{ color: '#5f5e5a' }}>Notified value</span>
              <span style={{ fontWeight: 500 }}>£{notifiedValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Early Warnings */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={labelStyle}>Early warnings</div>
              <span style={linkStyle} onClick={() => { onClose(); onNavigate('early-warnings') }}>View register</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Total EWNs</span>
              <span style={{ fontWeight: 500 }}>{ewns.length}</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Open</span>
              <span style={{ fontWeight: 500, color: openEWNs > 0 ? '#854f0b' : '#0f6e56' }}>{openEWNs}</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>RRM requested</span>
              <span style={{ fontWeight: 500, color: rrmPending > 0 ? '#854f0b' : '#0f6e56' }}>{rrmPending}</span>
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <span style={{ color: '#5f5e5a' }}>Became CE</span>
              <span style={{ fontWeight: 500 }}>{ewns.filter(ew => ew.status === 'became_ce').length}</span>
            </div>
          </div>

          {/* Payments */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={labelStyle}>Payments</div>
              <span style={linkStyle} onClick={() => { onClose(); onNavigate('payments') }}>View register</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Total AFPs</span>
              <span style={{ fontWeight: 500 }}>£{totalAfp.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Total certified</span>
              <span style={{ fontWeight: 500 }}>£{totalCertified.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: '#5f5e5a' }}>Latest cycle</span>
              <span style={{ fontWeight: 500 }}>
                {latestPayment ? `#${latestPayment.cycle_number}` : '—'}
              </span>
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <span style={{ color: '#5f5e5a' }}>Next payment due</span>
              <span style={{ fontWeight: 500, color: nextPaymentDue && daysRemaining(nextPaymentDue.final_payment_date) < 7 ? '#a32d2d' : '#2c2c2a' }}>
                {nextPaymentDue ? new Date(nextPaymentDue.final_payment_date).toLocaleDateString('en-GB') : '—'}
              </span>
            </div>
          </div>

        </div>
        <DeadlineTimeline
  ces={ces}
  ewns={ewns}
  payments={payments}
/>
      </div>
      {showReport && (
  <ReportGenerator
    subcontract={subcontract}
    project={null}
    onClose={() => setShowReport(false)}
  />
)}
    </div>
  )
}

function DeadlineTimeline({ ces, ewns, payments }) {
  const today = new Date()
  const thirtyDays = new Date(today)
  thirtyDays.setDate(today.getDate() + 30)

  // Collect all deadlines in next 30 days
  const deadlines = []

  ces.forEach(ce => {
    const dueDate = ce.quotation_due_date || ce.pm_reply_due_date
    if (!dueDate || ce.status === 'implemented') return
    const due = new Date(dueDate)
    if (due >= today && due <= thirtyDays) {
      deadlines.push({
        date: due,
        label: ce.reference,
        type: 'ce',
        color: '#a32d2d',
        detail: ce.status.replace(/_/g, ' ')
      })
    }
  })

  ewns.forEach(ew => {
    if (!ew.rrm_date) return
    const due = new Date(ew.rrm_date)
    if (due >= today && due <= thirtyDays) {
      deadlines.push({
        date: due,
        label: ew.reference,
        type: 'ewn',
        color: '#854f0b',
        detail: 'RRM'
      })
    }
  })

  payments.forEach(p => {
    if (p.status === 'paid') return
    const due = new Date(p.final_payment_date)
    if (due >= today && due <= thirtyDays) {
      deadlines.push({
        date: due,
        label: `Cycle #${p.cycle_number}`,
        type: 'payment',
        color: '#185fa5',
        detail: 'Final payment'
      })
    }
    if (p.pay_less_notice_date) {
      const pln = new Date(p.pay_less_notice_date)
      if (pln >= today && pln <= thirtyDays) {
        deadlines.push({
          date: pln,
          label: `Cycle #${p.cycle_number}`,
          type: 'payment',
          color: '#993556',
          detail: 'Pay less notice'
        })
      }
    }
  })

  deadlines.sort((a, b) => a.date - b.date)

  // Generate 30 day strips
  const days = []
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d)
  }

  function formatDay(date) {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  function getDeadlinesForDay(date) {
    return deadlines.filter(d =>
      d.date.toDateString() === date.toDateString()
    )
  }

  return (
    <div style={{ background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: '12px', padding: '24px', marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Deadline timeline — next 30 days
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {[
            { color: '#a32d2d', label: 'CE deadline' },
            { color: '#854f0b', label: 'RRM' },
            { color: '#185fa5', label: 'Payment' },
            { color: '#993556', label: 'Pay less notice' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#888780' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {deadlines.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#888780', textAlign: 'center', padding: '24px 0' }}>
          No deadlines in the next 30 days
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: '0', minWidth: '900px', position: 'relative' }}>
            {days.map((day, i) => {
              const dayDeadlines = getDeadlinesForDay(day)
              const isToday = day.toDateString() === today.toDateString()
              const showLabel = i === 0 || i === 7 || i === 14 || i === 21 || i === 30 || dayDeadlines.length > 0

              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {/* Day label */}
                  <div style={{ fontSize: '10px', color: isToday ? '#2c2c2a' : '#b4b2a9', fontWeight: isToday ? 500 : 400, marginBottom: '6px', whiteSpace: 'nowrap' }}>
                    {showLabel ? formatDay(day) : ''}
                  </div>

                  {/* Timeline line */}
                  <div style={{ width: '100%', height: '2px', background: isToday ? '#2c2c2a' : '#f1efe8', position: 'relative' }}>
                    {isToday && (
                      <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', width: '10px', height: '10px', borderRadius: '50%', background: '#2c2c2a' }} />
                    )}
                  </div>

                  {/* Deadline dots */}
                  {dayDeadlines.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                      {dayDeadlines.map((d, j) => (
                        <div key={j} title={`${d.label} — ${d.detail}`} style={{ cursor: 'pointer' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }} />
                          <div style={{ fontSize: '9px', color: d.color, fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap', maxWidth: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {d.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SubcontractDashboard