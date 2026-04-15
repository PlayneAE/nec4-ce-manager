import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function NewCEForm({ onClose, onSaved }) {
  const [subcontracts, setSubcontracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    subcontract_id: '',
    reference: '',
    description: '',
    notified_by: 'contractor',
    nec4_clause: '61.3',
    notified_value: '',
    notification_date: '',
  })

  const [deadlines, setDeadlines] = useState({
    quotation_due_date: '',
    pm_reply_due_date: '',
  })

  useEffect(() => {
    fetchSubcontracts()
  }, [])

  async function fetchSubcontracts() {
    const { data } = await supabase
      .from('subcontracts')
      .select('id, reference, subcontractor_name, quotation_period_weeks, pm_reply_period_weeks')
    setSubcontracts(data || [])
  }

  function addWeeks(dateString, weeks) {
    if (!dateString) return ''
    const date = new Date(dateString)
    date.setDate(date.getDate() + weeks * 7)
    return date.toISOString().split('T')[0]
  }

  function handleChange(e) {
    const updated = { ...form, [e.target.name]: e.target.value }
    setForm(updated)

    if (updated.notification_date && updated.subcontract_id) {
      const sub = subcontracts.find(s => s.id === updated.subcontract_id)
      if (sub) {
        const quotationDue = addWeeks(updated.notification_date, sub.quotation_period_weeks)
        const pmReplyDue = addWeeks(quotationDue, sub.pm_reply_period_weeks)
        setDeadlines({
          quotation_due_date: quotationDue,
          pm_reply_due_date: pmReplyDue,
        })
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('compensation_events').insert({
      ...form,
      ...deadlines,
      notified_value: form.notified_value ? parseFloat(form.notified_value) : null,
      status: 'notified',
      created_by: user.id,
    })

    if (error) {
      setMessage('Error saving CE: ' + error.message)
    } else {
      onSaved()
      onClose()
    }

    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '0.5px solid #b4b2a9',
    borderRadius: '6px',
    boxSizing: 'border-box',
    background: '#fff',
  }

  const labelStyle = {
    fontSize: '12px',
    color: '#5f5e5a',
    display: 'block',
    marginBottom: '6px',
  }

  const fieldStyle = { marginBottom: '16px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>New compensation event</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>

          <div style={fieldStyle}>
            <label style={labelStyle}>Subcontract</label>
            <select name="subcontract_id" value={form.subcontract_id} onChange={handleChange} required style={inputStyle}>
              <option value="">Select subcontract...</option>
              {subcontracts.map(s => (
                <option key={s.id} value={s.id}>{s.reference} — {s.subcontractor_name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>CE reference</label>
              <input name="reference" value={form.reference} onChange={handleChange} required placeholder="e.g. CE-023" style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>NEC4 clause</label>
              <select name="nec4_clause" value={form.nec4_clause} onChange={handleChange} style={inputStyle}>
                <option value="61.1">61.1 — PM instructs</option>
                <option value="61.3">61.3 — Contractor notifies</option>
                <option value="61.4">61.4 — PM decides</option>
              </select>
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} required rows={3}
              placeholder="Describe the compensation event..."
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Notified by</label>
              <select name="notified_by" value={form.notified_by} onChange={handleChange} style={inputStyle}>
                <option value="contractor">Contractor</option>
                <option value="pm">Project manager</option>
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Notified value (£)</label>
              <input name="notified_value" type="number" value={form.notified_value} onChange={handleChange}
                placeholder="0.00" style={inputStyle} />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Notification date</label>
            <input name="notification_date" type="date" value={form.notification_date} onChange={handleChange} required style={inputStyle} />
          </div>

          {deadlines.quotation_due_date && (
            <div style={{ background: '#f9f8f5', border: '0.5px solid #e0ddd5', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#5f5e5a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Auto-calculated NEC4 deadlines</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#888780', marginBottom: '4px' }}>Quotation due (cl. 62.3)</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#2c2c2a' }}>
                    {new Date(deadlines.quotation_due_date).toLocaleDateString('en-GB')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#888780', marginBottom: '4px' }}>PM reply due (cl. 62.3)</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#2c2c2a' }}>
                    {new Date(deadlines.pm_reply_due_date).toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div style={{ fontSize: '13px', padding: '10px 12px', borderRadius: '6px', marginBottom: '16px', background: '#fcebeb', color: '#a32d2d' }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 20px', fontSize: '13px', border: '0.5px solid #b4b2a9', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#5f5e5a' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, background: '#2c2c2a', color: '#fff', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Saving...' : 'Save CE'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default NewCEForm