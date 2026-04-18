import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function InviteSubcontractor({ onClose }) {
  const [subcontracts, setSubcontracts] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    subcontract_id: '',
  })

  useEffect(() => {
    fetchSubcontracts()
  }, [])

  async function fetchSubcontracts() {
    const { data } = await supabase
      .from('subcontracts')
      .select('id, reference, subcontractor_name')
    setSubcontracts(data || [])
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(form.email, {
      data: {
        full_name: form.full_name,
        role: 'subcontractor',
        subcontract_id: form.subcontract_id,
      }
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage(`Invitation sent to ${form.email}`)
      setForm({ full_name: '', email: '', subcontract_id: '' })
    }

    setSaving(false)
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
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '32px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>Invite subcontractor</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Full name</label>
            <input name="full_name" value={form.full_name} onChange={handleChange} required placeholder="e.g. John Smith" style={inputStyle} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Email address</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="e.g. john@buildco.co.uk" style={inputStyle} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Link to subcontract</label>
            <select name="subcontract_id" value={form.subcontract_id} onChange={handleChange} required style={inputStyle}>
              <option value="">Select subcontract...</option>
              {subcontracts.map(s => (
                <option key={s.id} value={s.id}>{s.reference} — {s.subcontractor_name}</option>
              ))}
            </select>
          </div>

          {message && (
            <div style={{
              fontSize: '13px',
              padding: '10px 12px',
              borderRadius: '6px',
              marginBottom: '16px',
              background: message.includes('Error') ? '#fcebeb' : '#e1f5ee',
              color: message.includes('Error') ? '#a32d2d' : '#0f6e56'
            }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 20px', fontSize: '13px', border: '0.5px solid #b4b2a9', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#5f5e5a' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, background: '#2c2c2a', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Sending...' : 'Send invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InviteSubcontractor