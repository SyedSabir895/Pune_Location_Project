import { useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { passwordProblem } from '../lib/validation.js'

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><Icon name="spark" size={15} /></span>
      <span>kindred<span className="brand-light"> rating</span></span>
    </div>
  )
}

export function Notice({ notice, close }) {
  if (!notice) return null
  const isError = notice.type === 'error'
  return (
    <div className={`notice ${notice.type}`} role={isError ? 'alert' : 'status'} aria-live={isError ? 'assertive' : 'polite'}>
      <Icon name={isError ? 'alert' : 'check'} />
      <span>{notice.text}</span>
      <button type="button" className="icon-button" onClick={close} aria-label="Dismiss notification">
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}

export function FormError({ children }) {
  if (!children) return null
  return (
    <div className="form-error" role="alert">
      <Icon name="alert" size={16} />
      <span>{children}</span>
    </div>
  )
}

/**
 * Password input with show/hide toggle.
 * `enforceRules` adds the challenge password rule as native constraint validation,
 * so the browser blocks submit and shows the specific reason on the field.
 */
export function PasswordField({ enforceRules = false, onChange, onInvalid, ...props }) {
  const [visible, setVisible] = useState(false)
  const text = visible ? 'Hide password' : 'Show password'
  function check(input) {
    if (enforceRules) input.setCustomValidity(passwordProblem(input.value))
  }
  return (
    <span className="password-field">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        onChange={(event) => { check(event.target); onChange?.(event) }}
        onInvalid={(event) => { check(event.target); onInvalid?.(event) }}
      />
      <button type="button" className="password-toggle" onClick={() => setVisible((current) => !current)} aria-label={text} aria-pressed={visible} title={text}>
        <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </span>
  )
}

export function PageTitle({ kicker, title, subtitle, action }) {
  return (
    <div className="page-title">
      <div>
        <span className="kicker">{kicker}</span>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/** Read-only star meter: fills stars proportionally to the real average. */
export function Stars({ value, size = 15 }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, (Number(value) / 5) * 100))
  return (
    <span className="stars" style={{ '--pct': `${pct}%`, '--star': `${size}px` }} aria-hidden="true">
      <span className="stars-base">{[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" size={size} />)}</span>
      <span className="stars-fill">{[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" size={size} />)}</span>
    </span>
  )
}

const ratingWords = ['', 'Poor', 'Fair', 'Good', 'Great', 'Loved it']

/** Accessible 1–5 star picker built on a native radio group (arrow keys work out of the box). */
export function StarPicker({ value, onChange, name, label = 'Your rating' }) {
  const [hover, setHover] = useState(0)
  const shown = hover || Number(value) || 0
  return (
    <fieldset className="star-picker" onMouseLeave={() => setHover(0)}>
      <legend>{label}</legend>
      <div className="star-picker-row">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= shown ? 'on' : ''} onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} checked={Number(value) === n} onChange={() => onChange(n)} />
            <Icon name="star" size={22} />
            <span className="sr-only">{n} star{n > 1 ? 's' : ''} — {ratingWords[n]}</span>
          </label>
        ))}
        <span className="star-picker-word" aria-hidden="true">{shown ? ratingWords[shown] : 'Tap to rate'}</span>
      </div>
    </fieldset>
  )
}

/** Dialog with Escape-to-close, focus trap, focus restore and labelled title. */
export function Modal({ kicker, title, onClose, children }) {
  const ref = useRef(null)
  const titleId = useId()
  // Keep latest onClose in a ref so inline handlers from parents don't re-run the focus effect.
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    const previous = document.activeElement
    const node = ref.current
    const focusables = () => node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const first = [...focusables()].find((el) => el.tagName === 'INPUT') || focusables()[0]
    first?.focus()
    function onKey(event) {
      if (event.key === 'Escape') closeRef.current()
      if (event.key !== 'Tab') return
      const items = [...focusables()]
      if (!items.length) return
      const [start, end] = [items[0], items[items.length - 1]]
      if (event.shiftKey && document.activeElement === start) { event.preventDefault(); end.focus() }
      else if (!event.shiftKey && document.activeElement === end) { event.preventDefault(); start.focus() }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [])
  return (
    <div className="modal-cover" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <button type="button" className="icon-button modal-x" onClick={onClose} aria-label="Close dialog">
          <Icon name="close" />
        </button>
        <span className="kicker">{kicker}</span>
        <h2 id={titleId}>{title}</h2>
        {children}
      </section>
    </div>
  )
}

/** Column header button that toggles ASC/DESC and exposes aria-sort. */
export function SortHeader({ label, field, sort, onSort, className }) {
  const active = sort.sortBy === field
  const dir = active ? sort.sortOrder : null
  return (
    <th scope="col" className={className} aria-sort={active ? (dir === 'ASC' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={`sort-button ${active ? 'is-active' : ''}`} onClick={() => onSort(field, active && dir === 'ASC' ? 'DESC' : 'ASC')}>
        {label}
        <Icon name={active ? (dir === 'ASC' ? 'sortAsc' : 'sortDesc') : 'sortNone'} size={14} className="sort-arrow" />
      </button>
    </th>
  )
}

export function SkeletonCards({ count = 6 }) {
  return (
    <div className="store-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="store-card skeleton-card" key={i}>
          <div className="skeleton" style={{ height: 112 }} />
          <div className="store-info">
            <div className="skeleton line" style={{ width: '70%' }} />
            <div className="skeleton line" style={{ width: '90%' }} />
            <div className="skeleton line" style={{ width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon = 'search', title, children, action }) {
  return (
    <div className="empty-box">
      <span className="empty-icon"><Icon name={icon} size={22} /></span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}
