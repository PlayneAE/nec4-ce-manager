import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function Documents({ ceId, ewId, paymentId, subcontractId, onClose }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    document_type: 'ce_notice',
    notes: '',
  })
  const [file, setFile] = useState(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    let query = supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (ceId) query = query.eq('ce_id', ceId)
    else if (ewId) query = query.eq('ew_id', ewId)
    else if (paymentId) query = query.eq('payment_id', paymentId)
    else if (subcontractId) query = query.eq('subcontract_id', subcontractId)

    const { data } = await query
    setDocuments(data || [])
    setLoading(false)
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleFileChange(e) {
    setFile(e.target.files[0])
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      setUploading(false)
      return
    }

    const { error: dbError } = await supabase.from('documents').insert({
      title: form.title,
      url: filePath,
      document_type: form.document_type,
      notes: form.notes,
      ce_id: ceId || null,
      ew_id: ewId || null,
      payment_id: paymentId || null,
      subcontract_id: subcontractId || null,
      created_by: user.id,
    })

    if (!dbError) {
      setForm({ title: '', document_type: 'ce_notice', notes: '' })
      setFile(null)
      fetchDocuments()
    }

    setUploading(false)
  }

  async function handleDownload(doc) {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.url, 60)

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  async function handleDelete(doc) {
    await supabase.storage.from('documents').remove([doc.url])
    await supabase.from('documents').delete().eq('id', doc.id)
    fetchDocuments()
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #e0ddd5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 500, fontSize: '16px' }}>Documents</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780' }}>×</button>
        </div>

        {/* Upload form */}
        <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #e0ddd5', background: '#f9f8f5' }}>
          <form onSubmit={handleUpload}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Document title</label>
                <input name="title" value={form.title} onChange={handleChange} required placeholder="e.g. CE-019 Notification" style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Document type</label>
                <select name="document_type" value={form.document_type} onChange={handleChange} style={inputStyle}>
                  <option value="ce_notice">CE notice</option>
                  <option value="early_warning">Early warning</option>
                  <option value="payment">Payment document</option>
                  <option value="programme">Programme</option>
                  <option value="contract">Contract document</option>
                  <option value="correspondence">Correspondence</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>File</label>
              <input
                type="file"
                onChange={handleFileChange}
                required
                accept=".pdf,.doc,.docx,.xls,.xlsx,.msg,.eml,.jpg,.png"
                style={{ ...inputStyle, padding: '6px 12px' }}
              />
              <div style={{ fontSize: '11px', color: '#888780', marginTop: '4px' }}>
                Accepted: PDF, Word, Excel, Outlook, images
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Notes (optional)</label>
              <input name="notes" value={form.notes} onChange={handleChange} placeholder="Brief description..." style={inputStyle} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={uploading}
                style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, background: '#2c2c2a', color: '#fff', border: 'none', borderRadius: '6px', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                {uploading ? 'Uploading...' : 'Upload document'}
              </button>
            </div>

          </form>
        </div>

        {/* Documents list */}
        <div style={{ padding: '16px 28px' }}>
          {loading ? (
            <div style={{ fontSize: '13px', color: '#888780', padding: '16px 0' }}>Loading...</div>
          ) : documents.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#888780', textAlign: 'center', padding: '24px 0' }}>
              No documents uploaded yet.
            </div>
          ) : (
            documents.map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid #f1efe8' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#2c2c2a', marginBottom: '3px' }}>{doc.title}</div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ fontSize: '11px', background: '#f1efe8', padding: '2px 8px', borderRadius: '4px', color: '#5f5e5a' }}>
                      {documentTypeLabels[doc.document_type]}
                    </span>
                    <span style={{ fontSize: '11px', color: '#888780' }}>
                      {new Date(doc.created_at).toLocaleDateString('en-GB')}
                    </span>
                    {doc.notes && (
                      <span style={{ fontSize: '11px', color: '#888780' }}>{doc.notes}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleDownload(doc)}
                    style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer', color: '#2c2c2a' }}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', border: '0.5px solid #fcebeb', background: '#fcebeb', cursor: 'pointer', color: '#a32d2d' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Documents