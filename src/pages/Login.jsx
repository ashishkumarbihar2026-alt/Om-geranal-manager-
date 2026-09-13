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
      setError('Incorrect setup code')
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
        <p>Your complete shop accounting, in one place</p>
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
            New Account
          </button>
        </div>

        {mode === 'signup' && (
          <>
            <label>
              Your Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Shop Name
              <input value={shopName} onChange={(e) => setShopName(e.target.value)} required />
            </label>
            <label>
              Setup Code
              <input
                type="password"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)}
                placeholder="Only you know this code"
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
          {busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}

function friendlyError(code) {
  const map = {
    'auth/invalid-email': 'Email is not in a valid format',
    'auth/user-not-found': 'This email is not registered',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Incorrect email or password',
    'auth/email-already-in-use': 'This email is already registered',
    'auth/weak-password': 'Password must be at least 6 characters',
  }
  return map[code] || 'Something went wrong, please try again'
                }
