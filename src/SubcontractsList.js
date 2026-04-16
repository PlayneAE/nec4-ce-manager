import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function SubcontractsList({ onSelectSubcontract, onClose }) {
  const [subcontracts, setSubcontracts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubcontracts()
  }, [])

  async function fetchSubcontracts() {
    const { data } = await supabase
      .from('subcontracts')
      .select(`
        *,
        projects (name, number)
      `)
      .order('created_at', { ascending: false })
    setSubcontracts(data || [])
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #e0ddd5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 500, fontSize: '16px' }}>Subcontracts</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888780' }}>×</button>
        </div>

        <div style={{ padding: '16px 28px' }}>
          {loading ? (
            <div style={{ fontSize: '13px', color: '#888780', padding: '24px 0' }}>Loading...</div>
          ) : subcontracts.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#888780', textAlign: 'center', padding: '24px 0' }}>
              No subcontracts yet.
            </div>
          ) : (
            subcontracts.map(sub => (
              <div key={sub.id}
                style={{ border: '0.5px solid #e0ddd5', borderRadius: '8px', padding: '16px', marginBottom: '12px', cursor: 'pointer', background: '#fff' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9f8f5'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                onClick={() => onSelectSubcontract(sub)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 500, fontSize: '14px' }}>{sub.reference}</span>
                    <span style={{ fontSize: '11px', background: '#f1efe8', padding: '2px 8px', borderRadius: '4px', color: '#5f5e5a' }}>Option {sub.nec_option}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#888780' }}>{sub.projects?.name}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#3d3d3a', marginBottom: '8px' }}>{sub.subcontractor_name}</div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#888780' }}>
                    Quotation period: <span style={{ color: '#2c2c2a', fontWeight: 500 }}>{sub.quotation_period_weeks} weeks</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888780' }}>
                    PM reply period: <span style={{ color: '#2c2c2a', fontWeight: 500 }}>{sub.pm_reply_period_weeks} weeks</span>
                  </div>
                  {sub.commencement_date && (
                    <div style={{ fontSize: '12px', color: '#888780' }}>
                      Start: <span style={{ color: '#2c2c2a', fontWeight: 500 }}>{new Date(sub.commencement_date).toLocaleDateString('en-GB')}</span>
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

export default SubcontractsList