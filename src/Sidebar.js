import { useState } from 'react'

function Sidebar({ activeSection, onNavigate, userRole, onSignOut }) {
  const [collapsed, setCollapsed] = useState(false)

  const navItems = [
    { id: 'dashboard', label: 'CE Register', icon: '▦' },
    { id: 'early-warnings', label: 'Early Warnings', icon: '⚠' },
    { id: 'payments', label: 'Payments', icon: '£' },
    { id: 'subcontracts', label: 'Subcontracts', icon: '📋' },
  ]

  const adminItems = [
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ]

  return (
    <div style={{
      width: collapsed ? '56px' : '220px',
      minHeight: '100vh',
      background: '#2c2c2a',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      flexShrink: 0,
      position: 'relative',
    }}>

      {/* Logo and toggle */}
      <div style={{ padding: collapsed ? '16px 0' : '16px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.1)', height: '56px', boxSizing: 'border-box' }}>
        {!collapsed && (
          <span style={{ color: '#fff', fontWeight: 500, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
  NEC4 Manager
</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '16px', padding: '4px', flexShrink: 0 }}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: '8px 0' }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: collapsed ? '10px 0' : '10px 16px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: activeSection === item.id ? 'rgba(255,255,255,0.1)' : 'none',
              border: 'none',
              color: activeSection === item.id ? '#fff' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeSection === item.id ? 500 : 400,
              borderLeft: activeSection === item.id ? '2px solid #fff' : '2px solid transparent',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            title={collapsed ? item.label : ''}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
            {!collapsed && item.label}
          </button>
        ))}

        {(userRole === 'pm' || userRole === 'admin') && (
          <>
            <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.1)', margin: '8px 16px' }} />
            {adminItems.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: collapsed ? '10px 0' : '10px 16px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: activeSection === item.id ? 'rgba(255,255,255,0.1)' : 'none',
                  border: 'none',
                  color: activeSection === item.id ? '#fff' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: activeSection === item.id ? 500 : 400,
                  borderLeft: activeSection === item.id ? '2px solid #fff' : '2px solid transparent',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
                title={collapsed ? item.label : ''}
              >
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && item.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Sign out */}
      <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.1)', padding: '8px 0' }}>
        <button
          onClick={onSignOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: collapsed ? '10px 0' : '10px 16px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontSize: '13px',
            whiteSpace: 'nowrap',
          }}
          title={collapsed ? 'Sign out' : ''}
        >
          <span style={{ fontSize: '16px', flexShrink: 0 }}>↩</span>
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </div>
  )
}

export default Sidebar