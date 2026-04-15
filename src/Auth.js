import { useState } from 'react'
import { supabase } from './supabaseClient'

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      })

      if (error) {
        setMessage(error.message)
      } else {
        await supabase.from('users').insert({
          id: data.user.id,
          full_name: fullName,
          email: email,
          role: 'pm'
        })
        setMessage('Account created! You can now sign in.')
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    }

    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9f8f5', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', border: '0.5px solid #e0ddd5', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '400px' }}>

        <h1 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px', marginTop: 0 }}>NEC4 CE Manager</h1>
        <p style={{ fontSize: '13px', color: '#888780', marginBottom: '28px', marginTop: 0 }}>
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </p>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#5f5e5a', display: 'block', marginBottom: '6px' }}>Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '0.5px solid #b4b2a9', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#5f5e5a', display: 'block', marginBottom: '6px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '0.5px solid #b4b2a9', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', color: '#5f5e5a', display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '0.5px solid #b4b2a9', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>

          {message && (
            <div style={{ fontSize: '13px', padding: '10px 12px', borderRadius: '6px', marginBottom: '16px', background: message.includes('created') ? '#e1f5ee' : '#fcebeb', color: message.includes('created') ? '#0f6e56' : '#a32d2d' }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '10px', fontSize: '14px', fontWeight: 500, background: '#2c2c2a', color: '#fff', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p style={{ fontSize: '13px', color: '#888780', textAlign: 'center', marginBottom: 0, marginTop: '20px' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span
            onClick={() => { setIsSignUp(!isSignUp); setMessage('') }}
            style={{ color: '#2c2c2a', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </span>
        </p>

      </div>
    </div>
  )
}

export default Auth