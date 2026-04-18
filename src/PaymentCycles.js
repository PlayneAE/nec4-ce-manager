import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Documents from './Documents'

function PaymentCycles({ userRole, inline, onClose }) {
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subcontracts, setSubcontracts] = useState([])
  const [selectedPaymentDocs, setSelectedPaymentDocs] = useState(null)
  const [form, setForm] = useState({
    subcontract_id: '',
    cycle_number: '',
    assessment_date: '',
    afp_amount: '',
    notes: '',
  })
  const [deadlines, setDeadlines] = useState({
    certificate_date: '',
    payment_notice_date: '',
    pay_less_notice_date: '',
    final_payment_date: '',
  })

  useEffect(() => {
    fetchCycles()
    fetchSubcontracts()
  }, [])

  async function fetchCycles() {
    const { data } = await supabase
      .from('payment_cycles')
      .select(`*, subcontracts (reference, subcontractor_name)`)
      .order('assessment_date', { ascending: false })
    setCycles(data || [])
    setLoading(false)
  }

  async function fetchSubcontracts() {
    const { data } = await supabase
      .from('subcontracts')
      .select('id, reference, subcontractor_name')
    setSubcontracts(data || [])
  }

  function addDays(dateString, days) {
    if (!dateString) return ''
    const date = new Date(dateString)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  function handleChange(e) {
    const updated = { ...form, [e.target.name]: e.target.value }
    setForm(updated)
    if (updated.assessment_date) {
      setDeadlines({
        certificate_date:     addDays(updated.assessment_date, 5),
        payment_notice_date:  addDays(updated.assessment_date, 5),
        pay_less_notice_date: addDays(updated.assessment_date, 14),
        final_payment_date:   addDays(updated.assessment_date, 21),
      })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('payment_cycles').insert({
      subcontract_id: form.subcontract_id,
      cycle_number: parseInt(form.cycle_number),
      assessment_date: form.assessment_date,
      afp_amount: form.afp_amount ? parseFloat(form.afp_amount) : null,
      notes: form.notes,
      ...deadlines,
      created_by: user.id,
    })
    if (!error) {
      setForm({ subcontract_id: '', cycle_number: '', assessment_date: '', afp_amount: '', notes: '' })
      setDeadlines({ certificate_date: '', payment_notice_date: '', pay_less_notice_date: '', final_payment_date: '' })
      setShowForm(false)
      fetchCycles()
    }
    setSaving(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('payment_cycles').update({ status }).eq('id', id)
    fetchCycles()
  }

  function daysRemaining(dateString) {
    if (!dateString) return null
    const today = new Date()
    const due = new Date(dateString)
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  }

  function daysLabel(days) {
    if (days === null) return '—'
    if (days < 0) return <span style={{ color: '#a32d2d', fontWeight: 500 }}>{days} days</span>
    if (days <= 3) return <span style={{ color: '#a32d2d', fontWeight: 500 }}>{days} days</span>
    if (days <= 7) return <span style={{ color: '#854f0b', fontWeight: 500 }}>{days} days</span>
    return <span style={{ color: '#5f5e5a' }}>{days} days</span>
  }

  const statusColors = {
    pending:                { background: '#f1efe8', color: '#5f5e5a' },
    afp_submitted:          { background: '#e6f1fb', color: '#185fa5' },
    certified:              { background: '#eaf3de', color: '#3b6d11' },
    payment_notice_issued:  { background: '#faeeda', color: '#854f0b' },
    pay_less_notice_issued: { background: '#fcebeb', color: '#a32d2d' },
    paid:                   { background: '#e1f5ee', color: '#0f6e56' },
    overdue:                { background: '#fcebeb', color: '#a32d2d' },
  }

  const inputStyle = { width: '100%', padding: '8px 12px', fontSize: '14px', border: '0.5px solid #b4b2a9', borderRadius: '6px', boxSizing: 'border-box', background: '#fff' }
  const labelStyle = { fontSize: '12px', color: '#5f5e5a', display: 'block', marginBottom: '6px' }
  const fieldStyle = { marginBottom: '16px' }

  const content = (
    <>
      {showForm && (
        <div style={{ background: '#f9f8f5', border: '0.5px solid #e0ddd5', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
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
                <label style={labelStyle}>Cycle number</label>
                <input name="cycle_number" type="number" value={form.cycle_number} onChange={handleChange} required placeholder="e.g. 1" style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Assessment date</label>
                <input name="assessment_date" type="date" value={form.assessment_date} onChange={handleChange} required style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>AFP amount (£)</label>
                <input name="afp_amount" type="number" value={form.afp_amount} onChange={handleChange} placeholder="0.00" style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Notes</label>
                <input name="notes" value={form.notes} onChange={handleChange} placeholder="Optional notes..." style={inputStyle} />
              </div>
            </div>

            {deadlines.final_payment_date && (
              <div style={{ background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#5f5e5a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Auto-calculated deadlines</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'Certificate due', date: deadlines.certificate_date, clause: 'cl. 51.1' },
                    { label: 'Payment notice', date: deadlines.payment_notice_date, clause: 'cl. 51.2' },
                    { label: 'Pay less notice', date: deadlines.pay_less_notice_date, clause: 'Construction Act' },
                    { label: 'Final payment', date: deadlines.final_payment_date, clause: 'cl. 51.2' },
                  ].map(d => (
                    <div key={d.label}>
                      <div style={{ fontSize: '11px', color: '#888780', marginBottom: '4px' }}>{d.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{new Date(d.date).toLocaleDateString('en-GB')}</div>
                      <div style={{ fontSize: '11px', color: '#888780', marginTop: '2px' }}>{d.clause}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 20px', fontSize: '13px', border: '0.5px solid #b4b2a9', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#5f5e5a' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, background: '#2c2c2a', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save cycle'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 100px 110px 110px 110px 110px 130px 120px 60px', padding: '8px 20px', borderBottom: '0.5px solid #e0ddd5', background: '#f9f8f5' }}>
          {['Cycle', 'Subcontract', 'Assessment', 'AFP (£)', 'Certified (£)', 'Pay less (£)', 'Final payment', 'Status', ''].map(h => (
            <span key={h} style={{ fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888780', fontSize: '14px' }}>Loading...</div>
        ) : cycles.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888780', fontSize: '14px' }}>No payment cycles yet. Click + New cycle to add one.</div>
        ) : (
          cycles.map(cycle => {
            const days = daysRemaining(cycle.final_payment_date)
            const sc = statusColors[cycle.status] || statusColors.pending
            return (
              <div key={cycle.id} style={{ display: 'grid', gridTemplateColumns: '60px 100px 110px 110px 110px 110px 130px 120px 60px', padding: '12px 20px', borderBottom: '0.5px solid #f1efe8', alignItems: 'center' }}>
                <span style={{ fontWeight: 500, fontSize: '13px' }}>#{cycle.cycle_number}</span>
                <span style={{ fontSize: '13px', color: '#888780' }}>{cycle.subcontracts?.reference}</span>
                <span style={{ fontSize: '13px' }}>{new Date(cycle.assessment_date).toLocaleDateString('en-GB')}</span>
                <span style={{ fontSize: '13px' }}>{cycle.afp_amount ? `£${Number(cycle.afp_amount).toLocaleString('en-GB')}` : '—'}</span>
                <span style={{ fontSize: '13px' }}>{cycle.certified_amount ? `£${Number(cycle.certified_amount).toLocaleString('en-GB')}` : '—'}</span>
                <span style={{ fontSize: '13px' }}>{cycle.pay_less_notice_amount ? `£${Number(cycle.pay_less_notice_amount).toLocaleString('en-GB')}` : '—'}</span>
                <span style={{ fontSize: '13px' }}>
                  <div>{new Date(cycle.final_payment_date).toLocaleDateString('en-GB')}</div>
                  <div style={{ marginTop: '2px' }}>{daysLabel(days)}</div>
                </span>
                <span>
                  <select value={cycle.status} onChange={e => updateStatus(cycle.id, e.target.value)} style={{ ...sc, fontSize: '11px', fontWeight: 500, padding: '3px 6px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
                    <option value="pending">Pending</option>
                    <option value="afp_submitted">AFP submitted</option>
                    <option value="certified">Certified</option>
                    <option value="payment_notice_issued">Payment notice issued</option>
                    <option value="pay_less_notice_issued">Pay less notice issued</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </span>
                <span>
                  <button
                    onClick={() => setSelectedPaymentDocs(cycle.id)}
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer', color: '#5f5e5a' }}
                  >
                    Docs
                  </button>
                </span>
              </div>
            )
          })
        )}
      </div>

      {selectedPaymentDocs && (
        <Documents
          paymentId={selectedPaymentDocs}
          onClose={() => setSelectedPaymentDocs(null)}
        />
      )}
    </>
  )

  if (inline) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button onClick={() => setShowForm(!showForm)} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer' }}>
            {showForm ? 'Cancel' : '+ New cycle'}
          </button>
        </div>
        {content}
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #e0ddd5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 500, fontSize: '16px' }}>Payment cycles</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => setShowForm(!showForm)} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer' }}>
              {showForm ? 'Cancel' : '+ New cycle'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780' }}>×</button>
          </div>
        </div>
        <div style={{ padding: '24px 28px' }}>{content}</div>
      </div>
    </div>
  )
}

export default PaymentCycles