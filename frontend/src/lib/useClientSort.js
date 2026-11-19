import { useState } from 'react'

/** Client-side sort for small, fully loaded tables. `getters` maps field -> value accessor. */
export function useClientSort(rows, initial, getters = {}) {
  const [sort, setSort] = useState(initial)
  const get = getters[sort.sortBy] || ((row) => row[sort.sortBy])
  // sortBy null keeps the order the server returned (e.g. newest first).
  const sorted = !sort.sortBy ? rows : [...rows].sort((a, b) => {
    const [x, y] = [get(a), get(b)]
    if (x == null && y == null) return 0
    if (x == null) return 1
    if (y == null) return -1
    const result = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { sensitivity: 'base', numeric: true })
    return sort.sortOrder === 'ASC' ? result : -result
  })
  return [sorted, sort, (sortBy, sortOrder) => setSort({ sortBy, sortOrder })]
}
