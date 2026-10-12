import { useState } from 'react'
import type { CastingTime, Spell } from '../rules/types'

const CASTING_TIMES: { id: CastingTime; label: string }[] = [
  { id: 'action', label: 'Action' },
  { id: 'bonus', label: 'Bonus' },
  { id: 'reaction', label: 'Reaction' },
  { id: 'other', label: 'Other' },
]

// Quick picks for the range and duration boxes. Anything else (90 ft, Sight, 8 hours) can be typed in.
const RANGES = ['Self', 'Touch', '30 ft', '60 ft', '120 ft']
const DURATIONS = ['Instantaneous', '1 round', '1 minute', '10 minutes', '1 hour']

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
    const range = spell.range?.trim()
    const duration = spell.duration?.trim()
    const { note: _note, range: _range, duration: _duration, ...rest } = spell
    onAdd({
      ...rest,
      name: spell.name.trim(),
      ...(range ? { range } : {}),
      ...(duration ? { duration } : {}),
      ...(note ? { note } : {}),
    })
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

      <QuickPick
        label="Range"
        options={RANGES}
        value={spell.range ?? ''}
        onChange={(range) => set({ range })}
        onEnter={add}
      />
      <QuickPick
        label="Duration"
        options={DURATIONS}
        value={spell.duration ?? ''}
        onChange={(duration) => set({ duration })}
        onEnter={add}
      />

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

/** A row of quick-pick buttons plus a box for typing anything else. Tapping the picked button again clears it. */
function QuickPick({
  label,
  options,
  value,
  onChange,
  onEnter,
}: {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
  onEnter: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={label}>
      <span className="w-16 text-sm opacity-70">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          className={`btn btn-xs ${value === o ? 'btn-neutral' : 'btn-ghost border-base-content/20'}`}
          onClick={() => onChange(value === o ? '' : o)}
        >
          {o}
        </button>
      ))}
      <input
        className="input input-xs w-24"
        placeholder="Other"
        aria-label={`Spell ${label.toLowerCase()}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter()}
      />
    </div>
  )
}
