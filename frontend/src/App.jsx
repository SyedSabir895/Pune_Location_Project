import { useEffect, useState } from 'react'
import './App.css'
import Icon from './components/Icon.jsx'
import { Brand, Modal, Notice, PasswordField } from './components/ui.jsx'
import { PASSWORD_RULE_TEXT } from './lib/validation.js'
import { api, roleLabel, savedUser } from './lib/api.js'
import Auth from './Pages/Auth.jsx'
import UserView from './Pages/Normal_User/UserView.jsx'
import OwnerView from './Pages/Store_Owner/OwnerView.jsx'
import AdminView from './Pages/System_Admin/AdminView.jsx'

function Header({ user, onLogout, onPassword }) {
  return (
    <header className="header">
      <Brand />
      <div className="header-right">
        <span className="user-avatar" aria-hidden="true">{user.name?.[0]?.toUpperCase()}</span>
        <div className="user-ident">
          <strong title={user.name}>{user.name}</strong>
          <small>{roleLabel(user.role)}</small>
        </div>
        <button className="quiet-button" onClick={onPassword} aria-label="Change password" title="Change password">
          <Icon name="key" size={16} /><span className="hide-sm" aria-hidden="true">Change password</span>
        </button>
        <button className="quiet-button logout" onClick={onLogout}>
          <Icon name="logout" size={16} /><span>Sign out</span>
        </button>
      </div>
    </header>
  )
}

function PasswordModal({ token, close, notify }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const body = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      await api('/auth/password', { method: 'PUT', token, body })
      notify({ type: 'success', text: 'Password updated.' })
      close()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal kicker="Account security" title="Change password" onClose={close}>
      {error && <div className="form-error" role="alert"><Icon name="alert" size={16} /><span>{error}</span></div>}
      <form onSubmit={submit} className="stack-form">
        <label><span>Current password</span><PasswordField name="currentPassword" required autoComplete="current-password" /></label>
        <label>
          <span>New password</span>
          <PasswordField name="newPassword" minLength="8" maxLength="16" required enforceRules autoComplete="new-password" aria-describedby="new-password-help" />
          <small id="new-password-help">{PASSWORD_RULE_TEXT}</small>
        </label>
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={close}>Cancel</button>
          <button className="button primary" disabled={busy} aria-busy={busy}>{busy ? 'Updating…' : 'Update password'}</button>
        </div>
      </form>
    </Modal>
  )
}

function App() {
  const [user, setUser] = useState(savedUser)
  const [token, setToken] = useState(() => sessionStorage.getItem('kindred-token'))
  const [notice, setNotice] = useState(null)
  const [passwordOpen, setPasswordOpen] = useState(false)

  useEffect(() => {
    if (!notice) return undefined
    const id = setTimeout(() => setNotice(null), notice.type === 'error' ? 7000 : 4500)
    return () => clearTimeout(id)
  }, [notice])

  function login(result) {
    sessionStorage.setItem('kindred-token', result.token)
    sessionStorage.setItem('kindred-user', JSON.stringify(result.user))
    setToken(result.token)
    setUser(result.user)
    setNotice({ type: 'success', text: `Welcome, ${result.user.name.split(' ')[0]}.` })
  }

  function logout() {
    sessionStorage.removeItem('kindred-token')
    sessionStorage.removeItem('kindred-user')
    setToken(null)
    setUser(null)
    setNotice(null)
  }

  if (!user || !token) {
    return (
      <>
        <Auth onLogin={login} setNotice={setNotice} />
        <Notice notice={notice} close={() => setNotice(null)} />
      </>
    )
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to main content</a>
      <Header user={user} onLogout={logout} onPassword={() => setPasswordOpen(true)} />
      <main className="content" id="main" tabIndex={-1}>
        {user.role === 'ADMIN' ? <AdminView token={token} notify={setNotice} />
          : user.role === 'STORE_OWNER' ? <OwnerView token={token} />
            : <UserView token={token} notify={setNotice} />}
      </main>
      <footer className="footer">
        <Brand />
        <span>Building trust, one local rating at a time.</span>
      </footer>
      <Notice notice={notice} close={() => setNotice(null)} />
      {passwordOpen && <PasswordModal token={token} close={() => setPasswordOpen(false)} notify={setNotice} />}
    </div>
  )
}

export default App
