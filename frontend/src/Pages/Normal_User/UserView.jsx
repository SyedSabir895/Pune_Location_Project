import { useCallback, useEffect, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { EmptyState, PageTitle, SkeletonCards, StarPicker, Stars } from '../../components/ui.jsx'
import { api, formatRating } from '../../lib/api.js'

function StoreCard({ store, index, draft, setDraft, onRate, saving }) {
  const value = draft ?? ''
  const unchanged = store.user_rating != null && Number(value) === Number(store.user_rating)
  return (
    <article className="store-card">
      <div className={`store-art art-${index % 4}`} aria-hidden="true">
        <Icon name="store" size={34} />
        <small>Local pick</small>
      </div>
      <div className="store-info">
        <div className="store-title">
          <h2>{store.name}</h2>
          <strong aria-label={store.average_rating == null ? 'Not rated yet' : `Average ${formatRating(store.average_rating)} out of 5`}>
            {formatRating(store.average_rating)} <Icon name="star" size={15} className="gold-text" />
          </strong>
        </div>
        <p className="store-address"><Icon name="pin" size={14} /> {store.address}</p>
        <div className="rating-line">
          <Stars value={store.average_rating} />
          <small>{store.rating_count} {Number(store.rating_count) === 1 ? 'rating' : 'ratings'}</small>
        </div>
        <hr />
        <div className="rate-control">
          <StarPicker name={`rate-${store.id}`} value={value} onChange={(n) => setDraft(store.id, n)} label={store.user_rating == null ? 'Your rating' : 'Your rating (saved)'} />
          <button className="button primary" disabled={!value || unchanged || saving} aria-busy={saving} onClick={() => onRate(store)}>
            {saving ? 'Saving…' : store.user_rating == null ? 'Submit' : 'Update'}
          </button>
        </div>
        {store.user_rating != null && <small className="your-rating"><Icon name="check" size={14} /> You rated this {store.user_rating} out of 5</small>}
      </div>
    </article>
  )
}

export default function UserView({ token, notify }) {
  const [query, setQuery] = useState('')
  const [stores, setStores] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async (search = '') => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      const result = await api(`/stores?${params}`, { token })
      const list = result.stores || []
      setStores(list)
      setDrafts(Object.fromEntries(list.map((s) => [s.id, s.user_rating ?? ''])))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const id = setTimeout(() => load(query), 250)
    return () => clearTimeout(id)
  }, [query, load])

  async function rate(store) {
    const score = Number(drafts[store.id])
    if (!Number.isInteger(score) || score < 1 || score > 5) return notify({ type: 'error', text: 'Choose a rating from 1 to 5.' })
    setSavingId(store.id)
    try {
      await api(`/stores/${store.id}/ratings`, { method: store.user_rating == null ? 'POST' : 'PUT', token, body: { score } })
      notify({ type: 'success', text: `Your rating for ${store.name} has been saved.` })
      await load(query)
    } catch (err) {
      notify({ type: 'error', text: err.message })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      <PageTitle kicker="Your neighborhood guide" title="Find your next favorite" subtitle="Thoughtful ratings make great local stores easier to find." />
      <div className="search-row">
        <div className="search-field">
          <Icon name="search" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by store name or address" aria-label="Search stores by name or address" />
          {query && (
            <button type="button" className="icon-button" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={16} /></button>
          )}
        </div>
        <span className="muted" role="status" aria-live="polite">
          {loading ? 'Searching…' : `${stores.length} ${stores.length === 1 ? 'store' : 'stores'} found`}
        </span>
      </div>

      {error && (
        <EmptyState icon="alert" title="Couldn't load stores" action={<button className="button secondary" onClick={() => load(query)}><Icon name="refresh" size={16} /> Try again</button>}>
          {error}
        </EmptyState>
      )}
      {loading && !stores.length && !error && <SkeletonCards />}
      {!loading && !error && !stores.length && (
        <EmptyState title="No stores found" action={query && <button className="button secondary" onClick={() => setQuery('')}>Clear search</button>}>
          {query ? `Nothing matches “${query}”. Try a different name or address.` : 'No stores have been listed yet.'}
        </EmptyState>
      )}
      {!!stores.length && !error && (
        <section className={`store-grid ${loading ? 'is-refreshing' : ''}`} aria-label="Stores">
          {stores.map((store, i) => (
            <StoreCard
              key={store.id}
              store={store}
              index={i}
              draft={drafts[store.id]}
              setDraft={(id, n) => setDrafts((current) => ({ ...current, [id]: n }))}
              onRate={rate}
              saving={savingId === store.id}
            />
          ))}
        </section>
      )}
    </>
  )
}
