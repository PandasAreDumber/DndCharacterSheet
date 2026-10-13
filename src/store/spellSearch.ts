// Search over the bundled SRD 5.2 spell list. The list is loaded only when it's first needed,
// so it doesn't slow down opening the app.

import type { Spell, SrdSpell } from '../rules/types'

let loading: Promise<SrdSpell[]> | null = null

export function loadSrdSpells(): Promise<SrdSpell[]> {
  loading ??= import('../data/srdSpells').then((m) => m.SRD_SPELLS)
  return loading
}

/**
 * Spells whose name contains the query, names that start with it first. Any class: the class list
 * only helps the player find things. `level` limits it to one level (a feat's "one level 1 spell").
 */
export function searchSpells(spells: SrdSpell[], query: string, opts: { level?: number; limit?: number } = {}): SrdSpell[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const matches = spells.filter(
    (s) => (opts.level === undefined || s.level === opts.level) && s.name.toLowerCase().includes(q),
  )
  const starts = (s: SrdSpell) => (s.name.toLowerCase().startsWith(q) ? 0 : 1)
  return matches
    .sort((a, b) => starts(a) - starts(b) || a.name.localeCompare(b.name))
    .slice(0, opts.limit ?? 8)
}

/** What gets saved on the character: the spell itself, without the search-only extras. */
export function toSpell(srd: SrdSpell): Spell {
  const { classes: _classes, school: _school, ...spell } = srd
  return spell
}
