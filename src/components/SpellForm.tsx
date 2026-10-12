import { useState } from 'react'
import type { CastingTime, Spell } from '../rules/types'

const CASTING_TIMES: { id: CastingTime; label: string }[] = [
  { id: 'action', label: 'Action' },
  { id: 'bonus', label: 'Bonus' },
  { id: 'reaction', label: 'Reaction' },
  { id: 'other', label: 'Other' },
]

const emptySpell = (castingTime: CastingTime): Spell => ({
  name: '',
  level: 1,
  castingTime,
  concentration: false,
  ritual: false,
  upcast: false,
})

/**
 * Quick spell entry. Only name and level are really needed; everything else has a default.
 * Enter in the name box adds the spell.
 */
export function SpellForm({
  onAdd,
  defaultCastingTime = 'action',
  autoFocus = false,
}: {
  onAdd: (spell: Spell) => void
  defaultCastingTime?: CastingTime
  autoFocus?: boolean
}) {
  const [spell, setSpell] = useState<Spell>(() => emptySpell(defaultCastingTime))
  const set = (patch: Partial<Spell>) => setSpell((s) => ({ ...s, ...patch }))
  const canAdd = spell.name.trim().length > 0

  const add = () => {
    if (!canAdd) return
    const note = spell.note?.trim()
    const { note: _drop, ...rest } = spell
    onAdd({ ...rest, name: spell.name.trim(), ...(note ? { note } : {}) })
    setSpell(emptySpell(spell.castingTime)) // keep the casting time for adding several in a row
  }

  return (
    <div className="flex flex-col gap-2 rounded-box border border-base-content/10 bg-base-100 p-3">
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Spell name"
          aria-label="Spell name"
          value={spell.name}
          autoFocus={autoFocus}
          onChange={(e) => set({ name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <select
          className="select w-28"
          value={spell.level}
          onChange={(e) => set({ level: Number.parseInt(e.target.value, 10) })}
          aria-label="Spell level"
        >
          {Array.from({ length: 10 }, (_, l) => (
            <option key={l} value={l}>
              {l === 0 ? 'Cantrip' : `Level ${l}`}
            </option>
          ))}
        </select>
      </div>

      <div className="join w-full" role="radiogroup" aria-label="Casting time">
        {CASTING_TIMES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={spell.castingTime === c.id}
            className={`btn btn-sm join-item flex-1 ${spell.castingTime === c.id ? 'btn-active btn-neutral' : ''}`}
            onClick={() => set({ castingTime: c.id })}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {(['concentration', 'ritual', 'upcast'] as const).map((flag) => (
          <label key={flag} className="flex cursor-pointer items-center gap-2 capitalize">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={spell[flag]}
              onChange={(e) => set({ [flag]: e.target.checked })}
            />
            {flag}
          </label>
        ))}
      </div>

      <input
        className="input input-sm w-full"
        placeholder="Note (optional), e.g. 8d6 fire, DEX save"
        aria-label="Spell note"
        value={spell.note ?? ''}
        onChange={(e) => set({ note: e.target.value })}
        onKeyDown={(e) => e.key === 'Enter' && add()}
      />

      <button type="button" className="btn btn-sm btn-secondary" onClick={add} disabled={!canAdd}>
        Add spell
      </button>
    </div>
  )
}
