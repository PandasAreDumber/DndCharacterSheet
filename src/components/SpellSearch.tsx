import { useEffect, useState } from 'react'
import type { Spell, SrdSpell } from '../rules/types'
import { loadSrdSpells, searchSpells, toSpell } from '../store/spellSearch'

const TIME_LABEL: Record<Spell['castingTime'], string> = { action: 'Action', bonus: 'Bonus', reaction: 'Reaction', other: 'Longer' }

/**
 * Search the SRD spell list and tap a result to add it with every field filled in.
 * Any class, as many as you like. `level` limits results to one level (a feat's chosen spell).
 */
export function SpellSearch({
  onAdd,
  level,
  autoFocus = false,
}: {
  onAdd: (spell: Spell) => void
  level?: number
  autoFocus?: boolean
}) {
  const [query, setQuery] = useState('')
  const [spells, setSpells] = useState<SrdSpell[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [added, setAdded] = useState<string | null>(null)

  // Start loading the list as soon as the search box is on screen.
  useEffect(() => {
    let live = true
    loadSrdSpells().then(
      (s) => live && setSpells(s),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [])

  const results = spells ? searchSpells(spells, query, level === undefined ? {} : { level }) : []

  const pick = (s: SrdSpell) => {
    onAdd(toSpell(s))
    setAdded(s.name)
    setQuery('')
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        type="search"
        className="input w-full"
        placeholder={level === 0 ? 'Search cantrips' : level ? `Search level ${level} spells` : 'Search spells (Fireball, Shield…)'}
        aria-label="Search spells"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value)
          setAdded(null)
        }}
        // Enter adds the top result.
        onKeyDown={(e) => e.key === 'Enter' && results[0] && pick(results[0])}
      />
      {added && <p className="text-xs text-success">Added {added}.</p>}
      {failed && <p className="text-xs text-error">Couldn't load the spell list. You can still add spells by hand below.</p>}
      {query.trim() && spells && results.length === 0 && (
        <p className="text-xs opacity-60">No match in the SRD list. Add it by hand below.</p>
      )}
      {results.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="Spell search results">
          {results.map((s) => (
            <li key={s.srdId}>
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0.5 rounded-box border border-base-content/10 bg-base-200/50 px-3 py-2 text-left hover:bg-base-200"
                onClick={() => pick(s)}
              >
                <span className="flex flex-wrap items-center gap-1 text-sm font-semibold">
                  {s.name}
                  <span className="badge badge-soft badge-primary badge-xs">{s.level === 0 ? 'Cantrip' : `Level ${s.level}`}</span>
                  <span className="badge badge-ghost badge-xs">{TIME_LABEL[s.castingTime]}</span>
                  {s.concentration && <span className="badge badge-accent badge-outline badge-xs">Conc.</span>}
                  {s.ritual && <span className="badge badge-ghost badge-xs">Ritual</span>}
                </span>
                <span className="text-xs opacity-60">{s.classes.join(', ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[0.65rem] opacity-50">
        Spells from the{' '}
        <a className="link" href="https://www.dndbeyond.com/srd" target="_blank" rel="noreferrer">
          SRD 5.2
        </a>{' '}
        by Wizards of the Coast,{' '}
        <a className="link" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        . Cantrips to level 3.
      </p>
    </div>
  )
}
