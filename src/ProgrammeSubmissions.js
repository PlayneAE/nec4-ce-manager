import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Documents from './Documents'

function ProgrammeSubmissions({ userRole, inline, onClose }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subcontracts, setSubcontracts] = useState([])
  const [selectedDocs, setSelectedDocs] = useState(null)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({
    subcontract_id: '',
    reference: '',
    revision_number: 1,
    submission_date: '',
    previous_planned_completion: '',
    planned_completion: '',
    reason_for_change: '',
    key_date_changes: '',
    main_progress: '',
    four_week_lookahead: '',
    critical_path_summary: '',
    programme_changes: '',
    ce_changes: '',
  })

  useEffect(() => {
    fetchSubmissions()
    fetchSubcontracts()
  }, [])

  async function fetchSubmissions() {
    const { data } = await supabase
      .from('programme_submissions')
      .select(`*, subcontracts (reference, subcontractor_name)`)
      .order('submission_date', { ascending: false })
    setSubmissions(data || [])
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

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    // Calculate PM response due date (2 weeks from submission)
    const pmDue = new Date(form.submission_date)
    pmDue.setDate(pmDue.getDate() + 14)

    const { data: progData, error } = await supabase
      .from('programme_submissions')
      .insert({
        ...form,
        revision_number: parseInt(form.revision_number),
        previous_planned_completion: form.previous_planned_completion || null,
        pm_response: 'pending',
        pm_response_due_date: pmDue.toISOString().split('T')[0],
        submitted_by: user.id,
      })
      .select()
      .single()

    if (!error && progData && file) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (!uploadError) {
        await supabase.from('documents').insert({
          title: `${form.reference} — Programme submission`,
          url: filePath,
          document_type: 'programme',
          subcontract_id: form.subcontract_id,
          created_by: user.id,
        })
      }
    }

    if (!error) {
      setForm({
        subcontract_id: '', reference: '', revision_number: 1,
        submission_date: '', previous_planned_completion: '',
        planned_completion: '', reason_for_change: '',
        key_date_changes: '', main_progress: '',
        four_week_lookahead: '', critical_path_summary: '',
        programme_changes: '', ce_changes: '',
      })
      setFile(null)
      setShowForm(false)
      fetchSubmissions()
    }
    setSaving(false)
  }

  async function updateResponse(id, response, reasons) {
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .from('programme_submissions')
      .update({
        pm_response: response,
        pm_response_date: today,
        pm_response_reasons: reasons || null,
        is_current: response === 'accepted',
      })
      .eq('id', id)

    if (response === 'accepted') {
      await supabase
        .from('programme_submissions')
        .update({ is_current: false })
        .neq('id', id)
    }
    fetchSubmissions()
  }

  function daysRemaining(dateString) {
    if (!dateString) return null
    const today = new Date()
    const due = new Date(dateString)
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  }

  const statusColors = {
    pending:      { background: '#faeeda', color: '#854f0b' },
    accepted:     { background: '#e1f5ee', color: '#0f6e56' },
    not_accepted: { background: '#fcebeb', color: '#a32d2d' },
  }

  const inputStyle = { width: '100%', padding: '8px 12px', fontSize: '14px', border: '0.5px solid #b4b2a9', borderRadius: '6px', boxSizing: 'border-box', background: '#fff' }
  const labelStyle = { fontSize: '12px', color: '#5f5e5a', display: 'block', marginBottom: '6px' }
  const fieldStyle = { marginBottom: '16px' }
  const textareaStyle = { ...inputStyle, resize: 'vertical', fontFamily: 'system-ui, sans-serif' }
  const sectionStyle = { borderTop: '0.5px solid #e0ddd5', paddingTop: '16px', marginTop: '8px' }

  const content = (
    <>
      {showForm && (
        <div style={{ background: '#f9f8f5', border: '0.5px solid #e0ddd5', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <form onSubmit={handleSubmit}>

            {/* Header fields */}
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
                <label style={labelStyle}>Programme reference</label>
                <input name="reference" value={form.reference} onChange={handleChange} required placeholder="e.g. CP-00015" style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Revision number</label>
                <input name="revision_number" type="number" value={form.revision_number} onChange={handleChange} required min="1" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Submission date</label>
                <input name="submission_date" type="date" value={form.submission_date} onChange={handleChange} required style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Previous planned completion</label>
                <input name="previous_planned_completion" type="date" value={form.previous_planned_completion} onChange={handleChange} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Planned completion this period</label>
                <input name="planned_completion" type="date" value={form.planned_completion} onChange={handleChange} required style={inputStyle} />
              </div>
            </div>

            {/* Movement indicator */}
            {form.previous_planned_completion && form.planned_completion && (
              <div style={{ background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#5f5e5a' }}>Planned completion movement:</span>
                {(() => {
                  const prev = new Date(form.previous_planned_completion)
                  const curr = new Date(form.planned_completion)
                  const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24))
                  return (
                    <span style={{ fontSize: '14px', fontWeight: 500, color: diff > 0 ? '#a32d2d' : diff < 0 ? '#0f6e56' : '#2c2c2a' }}>
                      {diff > 0 ? `+${diff} days (delay)` : diff < 0 ? `${diff} days (recovery)` : 'No change'}
                    </span>
                  )
                })()}
              </div>
            )}

            {/* Narrative sections */}
            <div style={sectionStyle}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#5f5e5a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Programme narrative — clause 31.2
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Reason for any change to planned completion</label>
                <textarea name="reason_for_change" value={form.reason_for_change} onChange={handleChange} rows={3} placeholder="Describe reasons for any movement in planned completion..." style={textareaStyle} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Change in any Key Date, Sectional Completion or other important milestone and reasons</label>
                <textarea name="key_date_changes" value={form.key_date_changes} onChange={handleChange} rows={3} placeholder="Detail any changes to key dates or sectional completion dates..." style={textareaStyle} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Main progress achieved in period</label>
                <textarea name="main_progress" value={form.main_progress} onChange={handleChange} rows={4} placeholder="List main activities completed in this period..." style={textareaStyle} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Key activities forecast in next four weeks</label>
                <textarea name="four_week_lookahead" value={form.four_week_lookahead} onChange={handleChange} rows={4} placeholder="List key activities planned for the next four weeks..." style={textareaStyle} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Summary of critical path</label>
                <textarea name="critical_path_summary" value={form.critical_path_summary} onChange={handleChange} rows={3} placeholder="Describe the current critical path and any changes..." style={textareaStyle} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Main changes made to programme in period</label>
                <textarea name="programme_changes" value={form.programme_changes} onChange={handleChange} rows={3} placeholder="Detail any logic changes, new activities or deleted activities..." style={textareaStyle} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Compensation events added to programme this period</label>
                <textarea name="ce_changes" value={form.ce_changes} onChange={handleChange} rows={2} placeholder="List any CEs incorporated into this programme revision..." style={textareaStyle} />
              </div>
            </div>

            {/* File attachment */}
            <div style={sectionStyle}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#5f5e5a', marginBottom: '12px' }}>Attach programme file</div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Programme file (PDF, XER, ZIP, MPP)</label>
                <input type="file" onChange={e => setFile(e.target.files[0])} accept=".pdf,.xer,.zip,.mpp,.xlsx,.xls" style={{ ...inputStyle, padding: '6px 12px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 20px', fontSize: '13px', border: '0.5px solid #b4b2a9', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#5f5e5a' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, background: '#2c2c2a', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Submitting...' : 'Submit programme'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Register */}
      <div style={{ background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 100px 1fr 120px 120px 110px 120px 80px', padding: '8px 20px', borderBottom: '0.5px solid #e0ddd5', background: '#f9f8f5' }}>
          {['Ref', 'Subcontract', 'Programme ref', 'Submitted', 'Planned completion', 'Movement', 'PM response', ''].map(h => (
            <span key={h} style={{ fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888780', fontSize: '14px' }}>Loading...</div>
        ) : submissions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888780', fontSize: '14px' }}>No programme submissions yet. Click + New submission to add one.</div>
        ) : (
          submissions.map(sub => {
            const sc = statusColors[sub.pm_response] || statusColors.pending
            const days = daysRemaining(sub.pm_response_due_date)
            const movement = sub.completion_movement_days
            return (
              <div key={sub.id} style={{ display: 'grid', gridTemplateColumns: '100px 100px 1fr 120px 120px 110px 120px 80px', padding: '12px 20px', borderBottom: '0.5px solid #f1efe8', alignItems: 'center' }}>
                <span
                  style={{ fontWeight: 500, fontSize: '13px', cursor: 'pointer', color: '#185fa5', textDecoration: 'underline' }}
                  onClick={() => setSelectedSubmission(sub)}
                >
                  {sub.reference}
                </span>
                <span style={{ fontSize: '13px', color: '#888780' }}>{sub.subcontracts?.reference}</span>
                <span style={{ fontSize: '13px', color: '#3d3d3a' }}>
                  {sub.reference} Rev {sub.revision_number}
                  {sub.is_current && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#e1f5ee', color: '#0f6e56', padding: '1px 6px', borderRadius: '3px', fontWeight: 500 }}>CURRENT</span>}
                </span>
                <span style={{ fontSize: '13px', color: '#888780' }}>{new Date(sub.submission_date).toLocaleDateString('en-GB')}</span>
                <span style={{ fontSize: '13px', color: '#2c2c2a' }}>{new Date(sub.planned_completion).toLocaleDateString('en-GB')}</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: movement > 0 ? '#a32d2d' : movement < 0 ? '#0f6e56' : '#888780' }}>
                  {movement > 0 ? `+${movement}d` : movement < 0 ? `${movement}d` : '—'}
                </span>
                <span>
                  <span style={{ ...sc, fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '4px' }}>
                    {sub.pm_response.replace(/_/g, ' ')}
                    {sub.pm_response === 'pending' && days !== null && (
                      <span style={{ marginLeft: '4px', color: days < 0 ? '#a32d2d' : '#854f0b' }}>
                        {days < 0 ? `${days}d` : `${days}d`}
                      </span>
                    )}
                  </span>
                </span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  {sub.pm_response === 'pending' && (
                    <>
                      <button
                        onClick={() => updateResponse(sub.id, 'accepted', null)}
                        style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '0.5px solid #0f6e56', background: '#e1f5ee', cursor: 'pointer', color: '#0f6e56' }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => {
                          const reasons = prompt('Reasons for non-acceptance:')
                          if (reasons) updateResponse(sub.id, 'not_accepted', reasons)
                        }}
                        style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '0.5px solid #a32d2d', background: '#fcebeb', cursor: 'pointer', color: '#a32d2d' }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </span>
              </div>
            )
          })
        )}
      </div>

      {selectedDocs && (
        <Documents
          subcontractId={selectedDocs}
          onClose={() => setSelectedDocs(null)}
        />
      )}

      {selectedSubmission && (
        <ProgrammeDetail
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </>
  )

  if (inline) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button onClick={() => setShowForm(!showForm)} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer' }}>
            {showForm ? 'Cancel' : '+ New submission'}
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
          <div style={{ fontWeight: 500, fontSize: '16px' }}>Programme submissions</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => setShowForm(!showForm)} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer' }}>
              {showForm ? 'Cancel' : '+ New submission'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780' }}>×</button>
          </div>
        </div>
        <div style={{ padding: '24px 28px' }}>{content}</div>
      </div>
    </div>
  )
}

function ProgrammeDetail({ submission, onClose }) {
  const riskTypeLabels = {
    pending: { background: '#faeeda', color: '#854f0b' },
    accepted: { background: '#e1f5ee', color: '#0f6e56' },
    not_accepted: { background: '#fcebeb', color: '#a32d2d' },
  }

  const sc = riskTypeLabels[submission.pm_response] || riskTypeLabels.pending
  const movement = submission.completion_movement_days

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #e0ddd5', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontWeight: 500, fontSize: '16px' }}>{submission.reference} Rev {submission.revision_number}</span>
              <span style={{ ...sc, fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '4px' }}>
                {submission.pm_response.replace(/_/g, ' ')}
              </span>
              {submission.is_current && (
                <span style={{ fontSize: '11px', background: '#e1f5ee', color: '#0f6e56', padding: '3px 8px', borderRadius: '4px', fontWeight: 500 }}>Current programme</span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#888780' }}>
              {submission.subcontracts?.reference} — Submitted {new Date(submission.submission_date).toLocaleDateString('en-GB')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780' }}>×</button>
        </div>

        <div style={{ padding: '24px 28px' }}>

          {/* Completion dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#f9f8f5', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', color: '#888780', marginBottom: '4px' }}>Previous planned completion</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>
                {submission.previous_planned_completion ? new Date(submission.previous_planned_completion).toLocaleDateString('en-GB') : '—'}
              </div>
            </div>
            <div style={{ background: '#f9f8f5', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', color: '#888780', marginBottom: '4px' }}>Planned completion this period</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{new Date(submission.planned_completion).toLocaleDateString('en-GB')}</div>
            </div>
            <div style={{ background: movement > 0 ? '#fcebeb' : movement < 0 ? '#e1f5ee' : '#f9f8f5', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', color: '#888780', marginBottom: '4px' }}>Movement</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: movement > 0 ? '#a32d2d' : movement < 0 ? '#0f6e56' : '#2c2c2a' }}>
                {movement > 0 ? `+${movement} days (delay)` : movement < 0 ? `${movement} days (recovery)` : 'No change'}
              </div>
            </div>
          </div>

          {/* Narrative sections */}
          {[
            { label: 'Reason for change to planned completion', value: submission.reason_for_change },
            { label: 'Key date and milestone changes', value: submission.key_date_changes },
            { label: 'Main progress achieved in period', value: submission.main_progress },
            { label: 'Key activities — next four weeks', value: submission.four_week_lookahead },
            { label: 'Summary of critical path', value: submission.critical_path_summary },
            { label: 'Main programme changes', value: submission.programme_changes },
            { label: 'Compensation events added to programme', value: submission.ce_changes },
          ].filter(s => s.value).map(section => (
            <div key={section.label} style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#5f5e5a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>{section.label}</div>
              <div style={{ fontSize: '13px', color: '#3d3d3a', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{section.value}</div>
            </div>
          ))}

          {/* PM response */}
          {submission.pm_response !== 'pending' && (
            <div style={{ borderTop: '0.5px solid #e0ddd5', paddingTop: '20px', marginTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#5f5e5a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>PM response</div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                <span style={{ ...sc, fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '4px' }}>
                  {submission.pm_response.replace(/_/g, ' ')}
                </span>
                {submission.pm_response_date && (
                  <span style={{ fontSize: '13px', color: '#888780' }}>{new Date(submission.pm_response_date).toLocaleDateString('en-GB')}</span>
                )}
              </div>
              {submission.pm_response_reasons && (
                <div style={{ fontSize: '13px', color: '#3d3d3a', lineHeight: 1.6 }}>{submission.pm_response_reasons}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProgrammeSubmissions