import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import SubcontractDashboard from './SubcontractDashboard'

function HomePage({ onNavigate, userRole }) {
  const [project, setProject] = useState(null)
  const [subcontracts, setSubcontracts] = useState([])
  const [stats, setStats] = useState({
    totalCEs: 0,
    overdueCEs: 0,
    openEWNs: 0,
    totalAfp: 0,
    totalCertified: 0,
    pendingActions: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedDashboard, setSelectedDashboard] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    fetchData()
    fetchCurrentUser()
  }, [])

  async function fetchCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('full_name, role')
        .eq('id', user.id)
        .single()
      setCurrentUser(data)
    }
  }

  async function fetchData() {
    const [projectRes, subsRes, cesRes, ewnsRes, paymentsRes] = await Promise.all([
      supabase.from('projects').select('*').limit(1).single(),
      supabase.from('subcontracts').select('*').order('created_at', { ascending: true }),
      supabase.from('compensation_events').select('*'),
      supabase.from('early_warnings').select('*'),
      supabase.from('payment_cycles').select('*'),
    ])

    setProject(projectRes.data)
    setSubcontracts(subsRes.data || [])

    const ces = cesRes.data || []
    const ewns = ewnsRes.data || []
    const payments = paymentsRes.data || []

    const today = new Date()
    const overdueCEs = ces.filter(ce => {
      const dueDate = ce.quotation_due_date || ce.pm_reply_due_date
      if (!dueDate || ce.status === 'implemented') return false
      return new Date(dueDate) < today
    }).length

    const totalAfp = payments.reduce((sum, p) => sum + (parseFloat(p.afp_amount) || 0), 0)
    const totalCertified = payments.reduce((sum, p) => sum + (parseFloat(p.certified_amount) || 0), 0)

    setStats({
      totalCEs: ces.length,
      overdueCEs,
      openEWNs: ewns.filter(ew => ew.status !== 'closed').length,
      totalAfp,
      totalCertified,
      pendingActions: ces.filter(ce => ['quoted', 'pm_reply_due', 'deemed_acceptance'].includes(ce.status)).length,
    })

    setLoading(false)
  }

  function getSubcontractHealth(subId) {
    return 'green'
  }

  const healthColor = {
    green: '#0f6e56',
    amber: '#854f0b',
    red: '#a32d2d',
  }

  const healthBg = {
    green: '#e1f5ee',
    amber: '#faeeda',
    red: '#fcebeb',
  }

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#888780', fontSize: '14px' }}>Loading...</div>
  )

  return (
    <div>
      {/* Project header */}
      <div style={{ background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Project</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: '#2c2c2a', marginBottom: '4px' }}>{project?.name || 'Meridian Energy Centre'}</div>
            <div style={{ fontSize: '13px', color: '#888780' }}>{project?.number || 'PRJ-2024-047'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>QS responsible</div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#2c2c2a' }}>{currentUser?.full_name || '—'}</div>
            <div style={{ fontSize: '12px', color: '#888780', textTransform: 'capitalize' }}>{currentUser?.role || '—'}</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total CEs', value: stats.totalCEs, color: null },
          { label: 'Overdue CEs', value: stats.overdueCEs, color: stats.overdueCEs > 0 ? '#a32d2d' : '#0f6e56' },
          { label: 'Open EWNs', value: stats.openEWNs, color: stats.openEWNs > 0 ? '#854f0b' : '#0f6e56' },
          { label: 'Pending PM actions', value: stats.pendingActions, color: stats.pendingActions > 0 ? '#854f0b' : '#0f6e56' },
          { label: 'Total AFPs', value: `£${stats.totalAfp.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`, color: null },
          { label: 'Total certified', value: `£${stats.totalCertified.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`, color: '#0f6e56' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: '8px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#888780', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ fontSize: '18px', fontWeight: 500, color: stat.color || '#2c2c2a' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Subcontract cards */}
      <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 500, color: '#5f5e5a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Subcontracts
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '16px' }}>
        {subcontracts.map(sub => {
          const health = getSubcontractHealth(sub.id)
          return (
            <div
              key={sub.id}
              style={{ background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: '12px', padding: '20px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#b4b2a9'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#e0ddd5'}
              onClick={() => setSelectedDashboard(sub)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 500, fontSize: '14px' }}>{sub.reference}</span>
                <span style={{ fontSize: '11px', background: healthBg[health], color: healthColor[health], padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                  Active
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#3d3d3a', marginBottom: '12px' }}>{sub.subcontractor_name}</div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '11px', color: '#888780' }}>
                  Option <span style={{ color: '#2c2c2a', fontWeight: 500 }}>{sub.nec_option}</span>
                </div>
                {sub.completion_date && (
                  <div style={{ fontSize: '11px', color: '#888780' }}>
                    Completion <span style={{ color: '#2c2c2a', fontWeight: 500 }}>{new Date(sub.completion_date).toLocaleDateString('en-GB')}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedDashboard && (
        <SubcontractDashboard
          subcontract={selectedDashboard}
          onClose={() => setSelectedDashboard(null)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  )
}

export default HomePage