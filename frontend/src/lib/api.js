export async function api(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed. Please try again.')
  return data
}

export function savedUser() {
  try {
    return JSON.parse(sessionStorage.getItem('kindred-user') || 'null')
  } catch {
    return null
  }
}

export function formatRating(value, digits = 1) {
  return value == null ? '—' : Number(value).toFixed(digits)
}

export function roleLabel(role = '') {
  return { ADMIN: 'Admin', USER: 'Normal user', STORE_OWNER: 'Store owner' }[role] || role.replace('_', ' ').toLowerCase()
}

export function toQuery(values) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => value && params.set(key, value))
  return params.toString()
}
