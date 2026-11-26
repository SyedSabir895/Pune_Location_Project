import { useCallback, useEffect, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { FormError, Modal, PageTitle, PasswordField, SortHeader } from '../../components/ui.jsx'
import { PASSWORD_RULE_TEXT } from '../../lib/validation.js'
import { useClientSort } from '../../lib/useClientSort.js'
import { api, formatRating, roleLabel, toQuery } from '../../lib/api.js'

const emptyPerson = { name: '', email: '', address: '', password: '', role: 'USER' }
const emptyStore = { name: '', email: '', address: '', ownerId: '' }

function Stat({ label, value, icon, loading }) {
  return (
    <article className="stat-card">
      <div>{label}<span><Icon name={icon} size={17} /></span></div>
      {loading ? <span className="skeleton line stat-skeleton" aria-hidden="true" /> : <strong>{value ?? '—'}</strong>}
      <small>Across the Kindred community</small>
    </article>
  )
}

function UsersTable({ users, onDetails, caption, sort, onSort }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <SortHeader label="Name" field="name" sort={sort} onSort={onSort} />
            <SortHeader label="Email" field="email" sort={sort} onSort={onSort} />
            <SortHeader label="Address" field="address" sort={sort} onSort={onSort} />
            <SortHeader label="Role" field="role" sort={sort} onSort={onSort} />
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td><strong>{u.name}</strong></td>
              <td>{u.email}</td>
              <td>{u.address}</td>
              <td><span className={`role-chip role-${u.role.toLowerCase()}`}>{roleLabel(u.role)}</span></td>
              <td><button className="link-button" onClick={() => onDetails(u.id)} aria-label={`View details for ${u.name}`}>Details <Icon name="arrow" size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!users.length && <p className="table-empty">No people found.</p>}
    </div>
  )
}

function StoresTable({ stores, onOwnerDetails, caption, sort, onSort }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <SortHeader label="Store" field="name" sort={sort} onSort={onSort} />
            <SortHeader label="Email" field="email" sort={sort} onSort={onSort} />
            <SortHeader label="Address" field="address" sort={sort} onSort={onSort} />
            <th scope="col">Owner</th>
            <SortHeader label="Rating" field="rating" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {stores.map((s) => (
            <tr key={s.id}>
              <td><strong>{s.name}</strong></td>
              <td>{s.email}</td>
              <td>{s.address}</td>
              <td>
                {s.owner_id == null ? <span className="muted">Unassigned</span> : (
                  <button className="link-button" onClick={() => onOwnerDetails(s.owner_id)} aria-label={`View owner of ${s.name}`}>Owner #{s.owner_id}</button>
                )}
              </td>
              <td className="num"><span className="score-pill"><Icon name="star" size={13} /> {formatRating(s.average_rating, 2)}</span> <small>({s.rating_count})</small></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!stores.length && <p className="table-empty">No stores found.</p>}
    </div>
  )
}

function Field({ label, value, onChange, required, help, ...props }) {
  const Input = props.type === 'password' ? PasswordField : 'input'
  return (
    <label>
      <span>{label}{required && <em aria-hidden="true"> *</em>}</span>
      <Input {...props} required={required} value={value} onChange={(e) => onChange(e.target.value)} />
      {help && <small>{help}</small>}
    </label>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </label>
  )
}

const navItems = [
  ['overview', 'Overview', 'grid'],
  ['users', 'People', 'users'],
  ['stores', 'Stores', 'store'],
  ['add-user', 'Add user', 'userPlus'],
  ['add-store', 'Add store', 'storePlus'],
]
const sectionTitle = { overview: 'Community overview', users: 'People', stores: 'Stores', 'add-user': 'Add a user', 'add-store': 'Add a store' }
const orderOptions = [['ASC', 'Ascending'], ['DESC', 'Descending']]

export default function AdminView({ token, notify }) {
  const [counts, setCounts] = useState(null)
  const [users, setUsers] = useState([])
  const [stores, setStores] = useState([])
  const [tab, setTab] = useState('overview')
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [uf, setUf] = useState({ name: '', email: '', address: '', role: '', sortBy: 'name', sortOrder: 'ASC' })
  const [sf, setSf] = useState({ name: '', email: '', address: '', sortBy: 'name', sortOrder: 'ASC' })
  const [person, setPerson] = useState(emptyPerson)
  const [store, setStore] = useState(emptyStore)
  const [owners, setOwners] = useState(null) // null = not loaded yet

  async function loadOwners() {
    try {
      setOwners((await api('/admin/store-owners', { token })).owners || [])
    } catch (err) {
      setOwners([])
      setError(err.message)
    }
  }

  const overview = useCallback(async () => {
    setLoading(true)
    try {
      const [d, u, s] = await Promise.all([
        api('/admin/dashboard', { token }),
        api('/admin/users?limit=8&sortBy=created_at&sortOrder=DESC', { token }),
        api('/admin/stores?limit=8&sortBy=created_at&sortOrder=DESC', { token }),
      ])
      setCounts(d)
      setUsers(u.users || [])
      setStores(s.stores || [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const id = setTimeout(overview, 0)
    return () => clearTimeout(id)
  }, [overview])

  async function loadList(kind, filters) {
    setBusy(true)
    try {
      const r = await api(`/admin/${kind}?${toQuery(filters || {})}`, { token })
      if (kind === 'users') setUsers(r.users || [])
      else setStores(r.stores || [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function navigate(key) {
    setTab(key)
    if (key === 'users') loadList('users', uf)
    if (key === 'add-store') loadOwners()
    if (key === 'stores') loadList('stores', sf)
  }

  function refresh() {
    if (tab === 'users') loadList('users', uf)
    else if (tab === 'stores') loadList('stores', sf)
    else overview()
  }

  function resetFilters(kind) {
    const blank = kind === 'users'
      ? { name: '', email: '', address: '', role: '', sortBy: 'name', sortOrder: 'ASC' }
      : { name: '', email: '', address: '', sortBy: 'name', sortOrder: 'ASC' }
    if (kind === 'users') setUf(blank)
    else setSf(blank)
    loadList(kind, blank)
  }

  async function create(path, body, reset, label) {
    setBusy(true)
    try {
      await api(path, { method: 'POST', token, body })
      reset()
      notify({ type: 'success', text: `${label} created successfully.` })
      await overview()
      if (path === '/admin/stores') loadOwners() // refresh store counts in the owner picker
    } catch (err) {
      notify({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  async function details(id) {
    try {
      setDetail((await api(`/admin/users/${id}`, { token })).user)
    } catch (err) {
      notify({ type: 'error', text: err.message })
    }
  }

  // Overview previews are small, fully loaded slices, so they sort in the browser.
  const [recentUsers, recentUserSort, sortRecentUsers] = useClientSort(users.slice(0, 5), { sortBy: null, sortOrder: 'ASC' })
  const [recentStores, recentStoreSort, sortRecentStores] = useClientSort(stores.slice(0, 5), { sortBy: null, sortOrder: 'ASC' }, {
    rating: (s) => (s.average_rating == null ? null : Number(s.average_rating)),
  })

  // Full lists sort on the server so ordering covers every row, not just the loaded page.
  function serverSort(kind, sortBy, sortOrder) {
    const next = { ...(kind === 'users' ? uf : sf), sortBy, sortOrder }
    if (kind === 'users') setUf(next)
    else setSf(next)
    loadList(kind, next)
  }

  const set = (setter, key) => (value) => setter((current) => ({ ...current, [key]: value }))

  return (
    <div className="admin-layout">
      <nav className="admin-sidebar" aria-label="Admin sections">
        <div className="sidebar-label">Workspace</div>
        <div className="sidebar-links">
          {navItems.map(([key, label, icon]) => (
            <button key={key} className={`sidebar-link ${tab === key ? 'sidebar-link-active' : ''}`} aria-current={tab === key ? 'page' : undefined} onClick={() => navigate(key)}>
              <Icon name={icon} size={18} className="sidebar-icon" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <span className="admin-status-dot" aria-hidden="true" />
          <div><strong>Admin access</strong><small>System management</small></div>
        </div>
      </nav>

      <div className="admin-main">
        <PageTitle
          kicker="Control room"
          title={sectionTitle[tab]}
          subtitle={tab === 'overview' ? 'See how your local community is growing.' : 'Manage accounts, stores, and community activity.'}
          action={(tab === 'overview' || tab === 'users' || tab === 'stores') && (
            <button className="button secondary" onClick={refresh} disabled={loading || busy}>
              <Icon name="refresh" size={16} className={loading || busy ? 'spin' : ''} /> Refresh
            </button>
          )}
        />
        <FormError>{error}</FormError>

        {tab === 'overview' && (
          <>
            <section className="stats-grid" aria-label="Totals">
              <Stat label="Registered users" value={counts?.totalUsers} icon="users" loading={loading && !counts} />
              <Stat label="Stores on Kindred" value={counts?.totalStores} icon="store" loading={loading && !counts} />
              <Stat label="Ratings shared" value={counts?.totalRatings} icon="star" loading={loading && !counts} />
            </section>
            <div className="two-panels">
              <section className="panel">
                <div className="panel-title">
                  <div><span className="kicker">Latest people</span><h2>Recently added</h2></div>
                  <button className="link-button" onClick={() => navigate('users')}>View all <Icon name="arrow" size={14} /></button>
                </div>
                <UsersTable users={recentUsers} onDetails={details} caption="Recently added people" sort={recentUserSort} onSort={sortRecentUsers} />
              </section>
              <section className="panel">
                <div className="panel-title">
                  <div><span className="kicker">Directory</span><h2>Recent stores</h2></div>
                  <button className="link-button" onClick={() => navigate('stores')}>View all <Icon name="arrow" size={14} /></button>
                </div>
                <StoresTable stores={recentStores} onOwnerDetails={details} caption="Recently added stores" sort={recentStoreSort} onSort={sortRecentStores} />
              </section>
            </div>
          </>
        )}

        {tab === 'users' && (
          <section className="panel">
            <form className="filters" onSubmit={(e) => { e.preventDefault(); loadList('users', uf) }} aria-label="Filter people">
              <Field label="Name" value={uf.name} onChange={set(setUf, 'name')} placeholder="Any name" />
              <Field label="Email" value={uf.email} onChange={set(setUf, 'email')} placeholder="Any email" />
              <Field label="Address" value={uf.address} onChange={set(setUf, 'address')} placeholder="Any address" />
              <Select label="Role" value={uf.role} onChange={set(setUf, 'role')} options={[['', 'All roles'], ['USER', 'Normal user'], ['ADMIN', 'Admin']]} />
              <Select label="Sort by" value={uf.sortBy} onChange={set(setUf, 'sortBy')} options={[['name', 'Name'], ['email', 'Email'], ['address', 'Address'], ['role', 'Role']]} />
              <Select label="Order" value={uf.sortOrder} onChange={set(setUf, 'sortOrder')} options={orderOptions} />
              <div className="filter-actions">
                <button type="button" className="button ghost" onClick={() => resetFilters('users')} disabled={busy}>Reset</button>
                <button className="button primary" disabled={busy}>{busy ? 'Applying…' : 'Apply filters'}</button>
              </div>
            </form>
            <UsersTable users={users} onDetails={details} caption="People" sort={uf} onSort={(field, order) => serverSort('users', field, order)} />
          </section>
        )}

        {tab === 'stores' && (
          <section className="panel">
            <form className="filters" onSubmit={(e) => { e.preventDefault(); loadList('stores', sf) }} aria-label="Filter stores">
              <Field label="Name" value={sf.name} onChange={set(setSf, 'name')} placeholder="Any name" />
              <Field label="Email" value={sf.email} onChange={set(setSf, 'email')} placeholder="Any email" />
              <Field label="Address" value={sf.address} onChange={set(setSf, 'address')} placeholder="Any address" />
              <Select label="Sort by" value={sf.sortBy} onChange={set(setSf, 'sortBy')} options={[['name', 'Name'], ['email', 'Email'], ['address', 'Address'], ['rating', 'Rating']]} />
              <Select label="Order" value={sf.sortOrder} onChange={set(setSf, 'sortOrder')} options={orderOptions} />
              <div className="filter-actions">
                <button type="button" className="button ghost" onClick={() => resetFilters('stores')} disabled={busy}>Reset</button>
                <button className="button primary" disabled={busy}>{busy ? 'Applying…' : 'Apply filters'}</button>
              </div>
            </form>
            <StoresTable stores={stores} onOwnerDetails={details} caption="Stores" sort={sf} onSort={(field, order) => serverSort('stores', field, order)} />
          </section>
        )}

        {tab === 'add-user' && (
          <section className="panel form-panel">
            <span className="kicker">Grow the community</span>
            <h2>Create an account</h2>
            <p>Add a normal user, admin, or store owner. Fields marked * are required.</p>
            <form className="create-grid" onSubmit={(e) => { e.preventDefault(); create('/admin/users', person, () => setPerson(emptyPerson), 'Account') }}>
              <Field label="Full name" value={person.name} onChange={set(setPerson, 'name')} minLength={20} maxLength={60} required autoComplete="off" help="20–60 characters." />
              <Field label="Email" value={person.email} onChange={set(setPerson, 'email')} type="email" required autoComplete="off" />
              <Field label="Address" value={person.address} onChange={set(setPerson, 'address')} maxLength={400} required autoComplete="off" />
              <Field label="Temporary password" value={person.password} onChange={set(setPerson, 'password')} type="password" minLength={8} maxLength={16} required enforceRules autoComplete="new-password" help={PASSWORD_RULE_TEXT} />
              <Select label="Role" value={person.role} onChange={set(setPerson, 'role')} options={[['USER', 'Normal user'], ['STORE_OWNER', 'Store owner'], ['ADMIN', 'Admin']]} />
              <div className="form-action">
                <button className="button primary" disabled={busy}><Icon name="plus" size={16} /> {busy ? 'Creating…' : 'Create account'}</button>
              </div>
            </form>
          </section>
        )}

        {tab === 'add-store' && (
          <section className="panel form-panel">
            <span className="kicker">Local directory</span>
            <h2>Add a store</h2>
            <p>Link the listing to an existing store owner account. Fields marked * are required.</p>
            <form className="create-grid" onSubmit={(e) => { e.preventDefault(); create('/admin/stores', { ...store, ownerId: Number(store.ownerId) }, () => setStore(emptyStore), 'Store') }}>
              <Field label="Store name" value={store.name} onChange={set(setStore, 'name')} required autoComplete="off" />
              <Field label="Store email" value={store.email} onChange={set(setStore, 'email')} type="email" required autoComplete="off" />
              <Field label="Address" value={store.address} onChange={set(setStore, 'address')} maxLength={400} required autoComplete="off" />
              <label>
                <span>Store owner<em aria-hidden="true"> *</em></span>
                <select value={store.ownerId} onChange={(e) => setStore((current) => ({ ...current, ownerId: e.target.value }))} required disabled={owners === null || !owners.length}>
                  <option value="">{owners === null ? 'Loading owners…' : owners.length ? 'Select a store owner' : 'No store owners yet'}</option>
                  {owners?.map((o) => (
                    // Each owner can have only one store (stores.owner_id is UNIQUE), so owners with a store can't be picked.
                    <option key={o.id} value={o.id} disabled={o.store_count > 0}>
                      {o.name} ({o.email}){o.store_count ? ' — already has a store' : ''}
                    </option>
                  ))}
                </select>
                {owners && !owners.length
                  ? <small>No Store owner accounts exist. <button type="button" className="link-button inline" onClick={() => navigate('add-user')}>Create one in Add user</button> first.</small>
                  : <small>Each store owner can have one store. Owners who already have one are greyed out.</small>}
              </label>
              <div className="form-action">
                <button className="button primary" disabled={busy}><Icon name="plus" size={16} /> {busy ? 'Adding…' : 'Add store'}</button>
              </div>
            </form>
          </section>
        )}
      </div>

      {detail && (
        <Modal kicker="Account details" title={detail.name} onClose={() => setDetail(null)}>
          <dl>
            <dt>Email</dt><dd>{detail.email}</dd>
            <dt>Address</dt><dd>{detail.address}</dd>
            <dt>Role</dt><dd><span className={`role-chip role-${detail.role.toLowerCase()}`}>{roleLabel(detail.role)}</span></dd>
            {detail.role === 'STORE_OWNER' && (
              <><dt>Store rating</dt><dd>{detail.store_average_rating == null ? 'No ratings yet' : `${formatRating(detail.store_average_rating, 2)} / 5`}</dd></>
            )}
          </dl>
        </Modal>
      )}
    </div>
  )
}
