import { useState } from 'react'
import { supabase } from './supabaseClient'

function NewSubcontractForm({ onClose, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    reference: '',
    subcontractor_name: '',
    nec_option: 'A',
    commencement_date: '',
    completion_date: '',
    quotation_period_weeks: 3,
    pm_reply_period_weeks: 2,
  })

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data: projectData } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
      .single()

    const { error } = await supabase.from('subcontracts').insert({
      ...form,
      project_id: projectData.id,
      quotation_period_weeks: parseInt(form.quotation_period_weeks),
      pm_reply_period_weeks: parseInt(form.pm_reply_period_weeks),
    })

    if (error) {
      setMessage('Error saving subcontract: ' + error.message)
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
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>New subcontract</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Subcontract reference</label>
              <input name="reference" value={form.reference} onChange={handleChange} required placeholder="e.g. SC-005" style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>NEC4 option</label>
              <select name="nec_option" value={form.nec_option} onChange={handleChange} style={inputStyle}>
                <option value="A">Option A — Priced with activity schedule</option>
                <option value="B">Option B — Priced with bill of quantities</option>
                <option value="C">Option C — Target with activity schedule</option>
                <option value="D">Option D — Target with bill of quantities</option>
                <option value="E">Option E — Cost reimbursable</option>
                <option value="F">Option F — Management contract</option>
              </select>
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Subcontractor name</label>
            <input name="subcontractor_name" value={form.subcontractor_name} onChange={handleChange} required placeholder="e.g. Acme Civil Engineering Ltd" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Commencement date</label>
              <input name="commencement_date" type="date" value={form.commencement_date} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Completion date</label>
              <input name="completion_date" type="date" value={form.completion_date} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          {/* Contract Data Part 1 periods */}
          <div style={{ background: '#f9f8f5', border: '0.5px solid #e0ddd5', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#5f5e5a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Contract data part 1 — agreed periods
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Quotation period (weeks)</label>
                <input
                  name="quotation_period_weeks"
                  type="number"
                  min="1"
                  max="12"
                  value={form.quotation_period_weeks}
                  onChange={handleChange}
                  style={inputStyle}
                />
                <div style={{ fontSize: '11px', color: '#888780', marginTop: '4px' }}>NEC4 default: 3 weeks</div>
              </div>
              <div>
                <label style={labelStyle}>PM reply period (weeks)</label>
                <input
                  name="pm_reply_period_weeks"
                  type="number"
                  min="1"
                  max="12"
                  value={form.pm_reply_period_weeks}
                  onChange={handleChange}
                  style={inputStyle}
                />
                <div style={{ fontSize: '11px', color: '#888780', marginTop: '4px' }}>NEC4 default: 2 weeks</div>
              </div>
            </div>
          </div>

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
              {loading ? 'Saving...' : 'Save subcontract'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default NewSubcontractForm