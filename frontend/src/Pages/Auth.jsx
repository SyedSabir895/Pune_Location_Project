import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Brand, FormError, PasswordField } from '../components/ui.jsx'
import { PASSWORD_RULE_TEXT } from '../lib/validation.js'
import { api } from '../lib/api.js'

export default function Auth({ onLogin, setNotice }) {
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const isLogin = mode === 'login'

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      if (!isLogin) {
        await api('/auth/register', { method: 'POST', body: values })
        setEmail(values.email)
        setMode('login')
        setNotice({ type: 'success', text: 'Account created. Sign in to continue.' })
      } else {
        onLogin(await api('/auth/login', { method: 'POST', body: values }))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function switchMode() {
    setError('')
    setMode(isLogin ? 'register' : 'login')
  }

  return (
    <main className="auth-layout" id="main">
      <section className="auth-brand-panel">
        <Brand />
        <div className="auth-message">
          <span className="kicker">A little more trust in every choice</span>
          <h1>Good places deserve good <i>feedback.</i></h1>
          <p>Discover local stores, share a thoughtful rating, and help your community shop with confidence.</p>
        </div>
        <div className="auth-bottom">
          <span className="auth-stars" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" size={14} />)}</span>
          Real experiences. Better neighborhoods.
        </div>
        <div className="decor-circle" aria-hidden="true" />
      </section>

      <section className="auth-form-panel">
        <div className="form-top">
          <span>Welcome to Kindred</span>
          <span className="secure"><Icon name="shield" size={15} /> Secure sign in</span>
        </div>
        <div className="auth-card">
          <span className="kicker">{isLogin ? 'Your community, in one place' : 'Join the community'}</span>
          <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>
          <p>{isLogin ? 'Sign in to discover and rate local stores.' : 'Share ratings with your community.'}</p>
          <FormError>{error}</FormError>
          <form onSubmit={submit} className="stack-form" key={mode}>
            {!isLogin && (
              <>
                <label>
                  <span>Full name <em aria-hidden="true">*</em></span>
                  <input name="name" minLength="20" maxLength="60" required autoComplete="name" aria-describedby="name-help" />
                  <small id="name-help">20–60 characters.</small>
                </label>
                <label>
                  <span>Address <em aria-hidden="true">*</em></span>
                  <textarea name="address" maxLength="400" rows="2" required autoComplete="street-address" />
                </label>
              </>
            )}
            <label>
              <span>Email address <em aria-hidden="true">*</em></span>
              <input name="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </label>
            <label>
              <span>Password <em aria-hidden="true">*</em></span>
              <PasswordField
                name="password"
                minLength={isLogin ? undefined : 8}
                maxLength={isLogin ? undefined : 16}
                required
                enforceRules={!isLogin}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                aria-describedby={isLogin ? undefined : 'password-help'}
              />
              {!isLogin && <small id="password-help">{PASSWORD_RULE_TEXT}</small>}
            </label>
            <button className="button primary full" disabled={busy} aria-busy={busy}>
              {busy ? <span className="spinner" aria-hidden="true" /> : null}
              {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
              {!busy && <Icon name="arrow" size={16} />}
            </button>
          </form>
          <div className="switch-auth">
            {isLogin ? 'New to Kindred?' : 'Already have an account?'}
            <button type="button" onClick={switchMode}>{isLogin ? 'Create account' : 'Sign in'}</button>
          </div>
        </div>
        <div className="auth-legal">
          <span>© 2026 Kindred Rating</span>
          <span>Made for better local shopping</span>
        </div>
      </section>
    </main>
  )
}
