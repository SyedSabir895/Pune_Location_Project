// Single stroke icon set (24px grid, 1.8 stroke) so every glyph shares one visual language.
const paths = {
  spark: <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.8a3.3 3.3 0 0 1 0 6.4M18 14.8c1.9.7 3.1 2.4 3.5 5.2" /></>,
  store: <><path d="M4 9.5V20h16V9.5" /><path d="M3 9.5 5 4h14l2 5.5c0 1.4-1.2 2.5-2.6 2.5s-2.5-1.1-2.5-2.5c0 1.4-1.1 2.5-2.5 2.5h-.8c-1.4 0-2.5-1.1-2.5-2.5 0 1.4-1.1 2.5-2.5 2.5S3 10.9 3 9.5Z" /><path d="M10 20v-5h4v5" /></>,
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  userPlus: <><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c.6-3.6 3.2-5.5 6.5-5.5 1.6 0 3 .4 4.1 1.2M19 14v6M16 17h6" /></>,
  storePlus: <><path d="M4 9.5V20h9M20 9.5V13" /><path d="M3 9.5 5 4h14l2 5.5" /><path d="M19 16v6M16 19h6" /></>,
  arrow: <path d="M7 17 17 7M8 7h9v9" />,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16l4-4-4-4M14 12H4" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l2.5 2.5M14.5 8.5 17 11" /></>,
  shield: <><path d="M12 3 5 6v5.5c0 4.3 3 8 7 9.5 4-1.5 7-5.2 7-9.5V6Z" /><path d="m9 12 2 2 4-4" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" /><path d="M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M20 20v-4h-4" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5.5M12 16.5v.01" /></>,
  eye: <><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.7" /></>,
  eyeOff: <><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.7" /><path d="m4 4 16 16" /></>,
  sortAsc: <path d="m7 14 5-5 5 5" />,
  sortDesc: <path d="m7 10 5 5 5-5" />,
  sortNone: <path d="m8 9.5 4-4 4 4M8 14.5l4 4 4-4" />,
  pin:<><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
}

export default function Icon({ name, size = 18, className = '', label }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}
