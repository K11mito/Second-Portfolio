// What the library needs to know about the projects, kept apart from the
// three.js scene so the page can use it without loading three.

const TIBETAN_DIGITS = '༠༡༢༣༤༥༦༧༨༩'
/** A number in Tibetan numerals: 17 → ༡༧ */
export const tib = (n) => String(n).replace(/\d/g, (d) => TIBETAN_DIGITS[d])

/** "Website · 2026" */
export const metaOf = (it) => [it.kind, it.year].filter(Boolean).join(' · ')

/** The projects, numbered newest first, and the blank text kept for the next one. */
export function shelfItems(projects) {
  const items = projects.map((p, i) => ({ ...p, n: i + 1, year: (p.when || '').slice(0, 4) }))
  items.push({
    next: true,
    n: items.length + 1,
    title: 'Still being written',
    short: 'Next',
    kind: 'The next project',
    year: '',
    description:
      'This end of the shelf is kept free. The next project gets wrapped and shelved here, at the top of the pile, as soon as it’s done.',
    tags: [],
    links: [],
  })
  return items
}

// The bookcase is 7 units wide. Each row lists its pigeonholes as [width in
// units, what it holds]: 'one' is a single text, 'side' two side by side,
// 'stack' two thinner ones stacked, 'next' the open end of the shelf, 'boards'
// a few old bare boards. Full rows alternate between these two, 7 texts each.
export const UNITS = 7
const ROW_A = [[2, 'side'], [1, 'one'], [1, 'one'], [1, 'one'], [1, 'one'], [1, 'one']]
const ROW_B = [[1, 'one'], [1, 'one'], [1, 'stack'], [1, 'one'], [2, 'one'], [1, 'one']]

/** The rows for `count` projects: full rows, then a last row that ends with the
    open end of the shelf and old boards. Adding a project re-lays the shelf. */
export function shelfLayout(count) {
  const rows = []
  let left = count
  while (left >= 7) {
    rows.push(rows.length % 2 ? ROW_B : ROW_A)
    left -= 7
  }
  const last = []
  let used = 0
  while (left > 0) {
    const pair = left >= 2
    last.push(pair ? [2, 'side'] : [1, 'one'])
    left -= pair ? 2 : 1
    used += pair ? 2 : 1
  }
  last.push([1, 'next'])
  let free = UNITS - used - 1
  if (free % 2) {
    last.push([1, 'boards'])
    free -= 1
  }
  for (; free >= 2; free -= 2) last.push([2, 'boards'])
  rows.push(last)
  return rows
}
