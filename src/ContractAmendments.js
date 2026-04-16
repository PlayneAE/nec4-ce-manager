import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function ContractAmendments({ subcontract, onClose }) {
  const [amendments, setAmendments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    reference: '',
    clause_amended: '',
    amendment_title: '',
    amendment_detail: '',
    amended_value: '',
    effective_date: '',
  })

  useEffect(() => {
    fetchAmendments()
  }, [subcontract.id])

  async function fetchAmendments() {
    const { data } = await supabase
      .from('contract_amendments')
      .select('*')
      .eq('subcontract_id', subcontract.id)
      .order('reference', { ascending: true })
    setAmendments(data || [])
    setLoading(false)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('contract_amendments').insert({
      ...form,
      subcontract_id: subcontract.id,
      created_by: user.id,
    })

    if (!error) {
      setForm({
        reference: '',
        clause_amended: '',
        amendment_title: '',
        amendment_detail: '',
        amended_value: '',
        effective_date: '',
      })
      setShowForm(false)
      fetchAmendments()
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

  const nec4Clauses = [
    '15.1 — Early warning period',
    '62.3 — Quotation period',
    '62.3 — PM reply period',
    '63.5 — Acceleration quotation period',
    '65.1 — Implementation period',
    '50.1 — Assessment interval',
    '51.1 — Payment certificate period',
    '51.2 — Payment period',
    '31.2 — Programme submission period',
    'Other',
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #e0ddd5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: '16px', marginBottom: '4px' }}>Contract amendments</div>
            <div style={{ fontSize: '13px', color: '#888780' }}>{subcontract.reference} — {subcontract.subcontractor_name}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer' }}
            >
              {showForm ? 'Cancel' : '+ Add amendment'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780' }}>×</button>
          </div>
        </div>

        {/* Add amendment form */}
        {showForm && (
          <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #e0ddd5', background: '#f9f8f5' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Z-clause reference</label>
                  <input name="reference" value={form.reference} onChange={handleChange} required placeholder="e.g. Z1" style={inputStyle} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Clause amended</label>
                  <select name="clause_amended" value={form.clause_amended} onChange={handleChange} required style={inputStyle}>
                    <option value="">Select clause...</option>
                    {nec4Clauses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Amendment title</label>
                <input name="amendment_title" value={form.amendment_title} onChange={handleChange} required placeholder="e.g. Extended quotation period" style={inputStyle} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Amendment detail</label>
                <textarea name="amendment_detail" value={form.amendment_detail} onChange={handleChange} required rows={3}
                  placeholder="Full wording of the amendment..."
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Amended value</label>
                  <input name="amended_value" value={form.amended_value} onChange={handleChange} placeholder="e.g. 4 weeks" style={inputStyle} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Effective date</label>
                  <input name="effective_date" type="date" value={form.effective_date} onChange={handleChange} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ padding: '8px 20px', fontSize: '13px', border: '0.5px solid #b4b2a9', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#5f5e5a' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, background: '#2c2c2a', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save amendment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Amendments list */}
        <div style={{ padding: '24px 28px' }}>
          {loading ? (
            <div style={{ fontSize: '13px', color: '#888780' }}>Loading...</div>
          ) : amendments.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#888780', textAlign: 'center', padding: '24px 0' }}>
              No amendments recorded. Click + Add amendment to record a Z-clause.
            </div>
          ) : (
            amendments.map(amendment => (
              <div key={amendment.id} style={{ border: '0.5px solid #e0ddd5', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 500, fontSize: '13px', background: '#f1efe8', padding: '2px 8px', borderRadius: '4px' }}>{amendment.reference}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#2c2c2a' }}>{amendment.amendment_title}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#888780', marginBottom: '6px' }}>{amendment.clause_amended}</div>
                <div style={{ fontSize: '13px', color: '#5f5e5a', marginBottom: '8px' }}>{amendment.amendment_detail}</div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {amendment.amended_value && (
                    <div style={{ fontSize: '12px', color: '#888780' }}>
                      New value: <span style={{ color: '#2c2c2a', fontWeight: 500 }}>{amendment.amended_value}</span>
                    </div>
                  )}
                  {amendment.effective_date && (
                    <div style={{ fontSize: '12px', color: '#888780' }}>
                      Effective: <span style={{ color: '#2c2c2a', fontWeight: 500 }}>{new Date(amendment.effective_date).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}

export default ContractAmendments