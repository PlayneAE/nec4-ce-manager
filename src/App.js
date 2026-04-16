import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import './App.css'
import NewCEForm from './NewCEForm'
import NewSubcontractForm from './NewSubcontractForm'
import CEDetail from './CEDetail'
import ContractAmendments from './ContractAmendments'
import SubcontractsList from './SubcontractsList'

function App() {
  const [session, setSession] = useState(null)
  const [ces, setCes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewCE, setShowNewCE] = useState(false)
  const [showNewSubcontract, setShowNewSubcontract] = useState(false)
  const [selectedCE, setSelectedCE] = useState(null)
  const [selectedSubcontract, setSelectedSubcontract] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [showSubcontractsList, setShowSubcontractsList] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchUserRole(session.user.id)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchUserRole(session.user.id)
    })
  }, [])

  useEffect(() => {
    if (session) fetchCEs()
  }, [session])

  async function fetchUserRole(userId) {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    if (data) setUserRole(data.role)
  }

  async function fetchCEs() {
    const { data, error } = await supabase
      .from('compensation_events')
      .select(`
        *,
        subcontracts (
          reference,
          subcontractor_name,
          quotation_period_weeks,
          pm_reply_period_weeks
        )
      `)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error fetching CEs:', error)
    } else {
      setCes(data)
    }
    setLoading(false)
  }

  function daysRemaining(dateString) {
    if (!dateString) return null
    const today = new Date()
    const due = new Date(dateString)
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  }

  function statusBadge(status) {
    const styles = {
      draft:             { background: '#f1efe8', color: '#5f5e5a' },
      notified:          { background: '#e6f1fb', color: '#185fa5' },
      quotation_due:     { background: '#faeeda', color: '#854f0b' },
      quoted:            { background: '#eaf3de', color: '#3b6d11' },
      pm_reply_due:      { background: '#fcebeb', color: '#a32d2d' },
      deemed_acceptance: { background: '#faeeda', color: '#854f0b' },
      implemented:       { background: '#e1f5ee', color: '#0f6e56' },
      disputed:          { background: '#fbeaf0', color: '#993556' },
    }
    const s = styles[status] || styles.draft
    return (
      <span style={{
        ...s,
        fontSize: '11px',
        fontWeight: 500,
        padding: '3px 8px',
        borderRadius: '4px',
        whiteSpace: 'nowrap'
      }}>
        {status.replace(/_/g, ' ')}
      </span>
    )
  }

  function daysLabel(days) {
    if (days === null) return '—'
    if (days < 0) return <span style={{ color: '#a32d2d', fontWeight: 500 }}>{days} days</span>
    if (days <= 3) return <span style={{ color: '#a32d2d', fontWeight: 500 }}>{days} days</span>
    if (days <= 7) return <span style={{ color: '#854f0b', fontWeight: 500 }}>{days} days</span>
    return <span style={{ color: '#5f5e5a' }}>{days} days</span>
  }

  const overdue = ces.filter(ce => {
    const days = daysRemaining(ce.quotation_due_date || ce.pm_reply_due_date)
    return days !== null && days < 0
  }).length

  const urgent = ces.filter(ce => {
    const days = daysRemaining(ce.quotation_due_date || ce.pm_reply_due_date)
    return days !== null && days >= 0 && days <= 7
  }).length

  const implemented = ces.filter(ce => ce.status === 'implemented').length

  if (!session) return <Auth />

  return (
    <div style={{ minHeight: '100vh', background: '#f9f8f5', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e0ddd5', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 500, fontSize: '15px' }}>NEC4 CE Manager</span>
          {overdue > 0 && (
            <span style={{ background: '#fcebeb', color: '#a32d2d', fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '4px' }}>
              {overdue} overdue
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {(userRole === 'pm' || userRole === 'admin') && (
            <button
              onClick={() => setShowNewSubcontract(true)}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer', color: '#5f5e5a' }}
            >
              + New subcontract
            </button>
          )}
          {(userRole === 'pm' || userRole === 'admin') && (
  <button
    onClick={() => setShowSubcontractsList(true)}
    style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer', color: '#5f5e5a' }}
  >
    Subcontracts
  </button>
)}
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer', color: '#5f5e5a' }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 32px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total CEs', value: ces.length, color: null },
            { label: 'Overdue', value: overdue, color: '#a32d2d' },
            { label: 'Due this week', value: urgent, color: '#854f0b' },
            { label: 'Implemented', value: implemented, color: '#0f6e56' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', color: '#888780', marginBottom: '6px' }}>{stat.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 500, color: stat.color || '#2c2c2a' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* CE Table */}
        <div style={{ background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: '12px', overflow: 'hidden' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid #e0ddd5' }}>
            <span style={{ fontWeight: 500, fontSize: '14px' }}>Compensation event register</span>
            {(userRole === 'pm' || userRole === 'admin') && (
              <button
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '0.5px solid #b4b2a9', background: '#fff', cursor: 'pointer' }}
                onClick={() => setShowNewCE(true)}
              >
                + New CE
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 1fr 140px 120px 100px', padding: '8px 20px', borderBottom: '0.5px solid #e0ddd5', background: '#f9f8f5' }}>
            {['Ref', 'Subcontract', 'Description', 'Status', 'Due date', 'Days left'].map(h => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888780', fontSize: '14px' }}>Loading...</div>
          ) : ces.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888780', fontSize: '14px' }}>
              No compensation events yet. Click + New CE to add one.
            </div>
          ) : (
            ces.map(ce => {
              const dueDate = ce.quotation_due_date || ce.pm_reply_due_date
              const days = daysRemaining(dueDate)
              return (
                <div key={ce.id}
                  style={{ display: 'grid', gridTemplateColumns: '80px 100px 1fr 140px 120px 100px', padding: '12px 20px', borderBottom: '0.5px solid #f1efe8', alignItems: 'center', cursor: 'pointer', background: '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9f8f5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  onClick={() => setSelectedCE(ce)}
                >
                  <span style={{ fontWeight: 500, fontSize: '13px' }}>{ce.reference}</span>
                  <span style={{ fontSize: '13px', color: '#888780' }}>{ce.subcontracts?.reference || '—'}</span>
                  <span style={{ fontSize: '13px', color: '#3d3d3a', paddingRight: '16px' }}>{ce.description}</span>
                  <span>{statusBadge(ce.status)}</span>
                  <span style={{ fontSize: '13px', color: '#888780' }}>{dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : '—'}</span>
                  <span style={{ fontSize: '13px' }}>{daysLabel(days)}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {showNewCE && (
        <NewCEForm
          onClose={() => setShowNewCE(false)}
          onSaved={() => fetchCEs()}
        />
      )}
      {showNewSubcontract && (
        <NewSubcontractForm
          onClose={() => setShowNewSubcontract(false)}
          onSaved={() => {}}
        />
      )}
      {selectedCE && (
        <CEDetail
          ce={selectedCE}
          onClose={() => setSelectedCE(null)}
          onUpdated={() => { fetchCEs(); setSelectedCE(null) }}
        />
      )}
      {selectedSubcontract && (
        <ContractAmendments
          subcontract={selectedSubcontract}
          onClose={() => setSelectedSubcontract(null)}
        />
      )}
      {showSubcontractsList && (
  <SubcontractsList
    onClose={() => setShowSubcontractsList(false)}
    onSelectSubcontract={(sub) => {
      setSelectedSubcontract(sub)
      setShowSubcontractsList(false)
    }}
  />
)}
    </div>
  )
}

export default App