import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { SETUP_CODE } from '../setupCode'

export default function Login() {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [name, setName] = useState('')
  const [shopName, setShopName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [setupCode, setSetupCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (mode === 'signup' && setupCode !== SETUP_CODE) {
      setError('Setup code galat hai')
      return
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await signup(name, shopName, email, password)
      }
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-mark">
        <span className="bars" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i>
        </span>
        <h1>Dukan Scan</h1>
        <p>Apni dukan ka pura hisaab, ek jagah</p>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => setMode('signup')}
          >
            Naya Account
          </button>
        </div>

        {mode === 'signup' && (
          <>
            <label>
              Aapka naam
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Dukan ka naam
              <input value={shopName} onChange={(e) => setShopName(e.target.value)} required />
            </label>
            <label>
              Setup Code
              <input
                type="password"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)}
                placeholder="Sirf tumhe pata code"
                required
              />
            </label>
          </>
        )}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Ruko…' : mode === 'login' ? 'Login Karo' : 'Account Banao'}
        </button>
      </form>
    </div>
  )
}

function friendlyError(code) {
  const map = {
    'auth/invalid-email': 'Email sahi format mein nahi hai',
    'auth/user-not-found': 'Ye email register nahi hai',
    'auth/wrong-password': 'Password galat hai',
    'auth/invalid-credential': 'Email ya password galat hai',
    'auth/email-already-in-use': 'Ye email pehle se registered hai',
    'auth/weak-password': 'Password kam se kam 6 characters ka rakho',
  }
  return map[code] || 'Kuch galat ho gaya, dobara try karo'
}
