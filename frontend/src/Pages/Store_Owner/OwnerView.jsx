import { useCallback, useEffect, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { EmptyState, FormError, PageTitle, SortHeader, Stars } from '../../components/ui.jsx'
import { useClientSort } from '../../lib/useClientSort.js'
import { api, formatRating } from '../../lib/api.js'

const ratingGetters = { updated_at: (r) => new Date(r.updated_at).getTime(), score: (r) => Number(r.score) }

function RatingsTable({ ratings }) {
  const [rows, sort, onSort] = useClientSort(ratings, { sortBy: 'updated_at', sortOrder: 'DESC' }, ratingGetters)
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">Customers who rated your store</caption>
        <thead>
          <tr>
            <SortHeader label="Customer" field="name" sort={sort} onSort={onSort} />
            <SortHeader label="Email" field="email" sort={sort} onSort={onSort} />
            <SortHeader label="Rating" field="score" sort={sort} onSort={onSort} />
            <SortHeader label="Updated" field="updated_at" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id}>
              <td><strong>{r.name}</strong></td>
              <td>{r.email}</td>
              <td><span className="score-pill"><Icon name="star" size={13} /> {r.score} / 5</span></td>
              <td className="num">{new Date(r.updated_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="table-empty">No ratings submitted yet.</p>}
    </div>
  )
}

export default function OwnerView({ token }) {
  const [stores, setStores] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api('/owner/dashboard', { token })
      setStores(result.stores || [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const id = setTimeout(load, 0)
    return () => clearTimeout(id)
  }, [load])

  return (
    <>
      <PageTitle
        kicker="Your business, at a glance"
        title="Store owner dashboard"
        subtitle="See how customers experience your store."
        action={<button className="button secondary" onClick={load} disabled={loading}><Icon name="refresh" size={16} className={loading ? 'spin' : ''} /> Refresh</button>}
      />
      <FormError>{error}</FormError>
      {loading && !stores.length && <div className="panel skeleton" style={{ height: 260 }} aria-hidden="true" />}
      {!loading && !error && !stores.length && (
        <EmptyState icon="store" title="No store linked yet">An admin needs to add a store to your account before ratings appear here.</EmptyState>
      )}
      {stores.map((store) => (
        <section className="panel owner-panel" key={store.id} aria-labelledby={`store-${store.id}`}>
          <div className="owner-banner">
            <div>
              <span className="kicker">Your store</span>
              <h2 id={`store-${store.id}`}>{store.name}</h2>
              <p><Icon name="pin" size={14} /> {store.address}</p>
            </div>
            <div className="owner-score">
              <small>Overall rating</small>
              <strong>{formatRating(store.average_rating, 2)}<small> / 5</small></strong>
              <Stars value={store.average_rating} size={16} />
              <span>{store.rating_count} customer {Number(store.rating_count) === 1 ? 'rating' : 'ratings'}</span>
            </div>
          </div>
          <div className="panel-title">
            <div>
              <span className="kicker">Customer feedback</span>
              <h2>People who rated your store</h2>
            </div>
          </div>
          <RatingsTable ratings={store.ratings} />
        </section>
      ))}
    </>
  )
}
