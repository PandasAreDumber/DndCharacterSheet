import { useState } from 'react'
import type { FeatPick, FeatSpellChoice, Spell } from '../rules/types'
import { featGroups } from '../store/selectors'
import { SpellForm } from './SpellForm'

/**
 * Pick any number of feats, sorted into their three lists. Nothing is locked by level or
 * prerequisite: those just show as labels. Feats that give a choice of spells ask for them here.
 */
export function FeatPicker({
  value,
  onChange,
  fromBackground,
}: {
  value: FeatPick[]
  onChange: (feats: FeatPick[]) => void
  /** The feat the background gives. It's ticked and locked; change the background to change it. */
  fromBackground?: { featId: string; name: string; featNote: string | null } | undefined
}) {
  const picked = (id: string) => value.find((p) => p.id === id)
  // When editing a character, start with the lists you picked from open. Only decided once,
  // so unticking the last feat in a list doesn't snap it shut.
  const [openAtStart] = useState(() =>
    featGroups.filter((g) => g.feats.some((f) => picked(f.id))).map((g) => g.id),
  )
  const toggle = (id: string) =>
    onChange(picked(id) ? value.filter((p) => p.id !== id) : [...value, { id }])
  const setSpells = (id: string, spells: Spell[]) =>
    onChange(value.map((p) => (p.id === id ? { ...p, spells } : p)))

  return (
    <fieldset className="fieldset rounded-box border border-info/50 bg-info/5 p-3">
      <legend className="fieldset-legend px-1 text-info">
        Feats
        {value.length > 0 && <span className="badge badge-info badge-sm">{value.length}</span>}
      </legend>
      <p className="text-xs opacity-60">Pick as many as you have. Prerequisites are shown but not enforced.</p>

      {featGroups.map((group) => {
        const count = group.feats.filter((f) => picked(f.id)).length
        return (
          <details
            key={group.id}
            className="collapse collapse-arrow rounded-box border border-base-content/10 bg-base-100"
            open={openAtStart.includes(group.id) || undefined}
          >
            <summary className="collapse-title min-h-0 py-3 font-semibold">
              {group.name}
              {count > 0 && <span className="badge badge-info badge-sm ml-2">{count}</span>}
              <span className="block text-xs font-normal opacity-60">{group.hint}</span>
            </summary>
            <ul className="collapse-content flex flex-col gap-2">
              {group.feats.map((f) => {
                const pick = picked(f.id)
                const locked = fromBackground?.featId === f.id
                return (
                  <li key={f.id} className={`rounded-box p-2 ${pick ? 'bg-info/10' : ''}`}>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-info checkbox-sm mt-0.5"
                        checked={!!pick}
                        disabled={locked}
                        onChange={() => toggle(f.id)}
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-1 text-sm font-semibold">
                          {f.name}
                          {locked ? (
                            <span className="badge badge-info badge-xs">From {fromBackground.name} background</span>
                          ) : (
                            f.prerequisite && <span className="badge badge-ghost badge-xs">{f.prerequisite}</span>
                          )}
                        </span>
                        <span className="text-xs opacity-70">{f.summary}</span>
                      </span>
                    </label>
                    {pick &&
                      f.spellChoices.map((choice) => (
                        <ChosenSpells
                          key={choice.level}
                          // Magic Initiate from a background says which list: "Cleric spells".
                          choice={
                            locked && fromBackground.featNote
                              ? { ...choice, hint: `${choice.hint}. ${fromBackground.name}: ${fromBackground.featNote}` }
                              : choice
                          }
                          spells={pick.spells ?? []}
                          onChange={(spells) => setSpells(f.id, spells)}
                        />
                      ))}
                  </li>
                )
              })}
            </ul>
          </details>
        )
      })}
    </fieldset>
  )
}

/** The spells chosen for one of a feat's spell choices, with a form while there's room for more. */
function ChosenSpells({
  choice,
  spells,
  onChange,
}: {
  choice: FeatSpellChoice
  spells: Spell[] // every spell chosen for this feat; this only shows the ones at choice.level
  onChange: (spells: Spell[]) => void
}) {
  const mine = spells.filter((s) => s.level === choice.level)
  const add = (spell: Spell) => {
    const lower = spell.name.toLowerCase()
    onChange([...spells.filter((s) => s.name.toLowerCase() !== lower), spell])
  }

  return (
    <div className="mt-2 ml-7 flex flex-col gap-1">
      <p className="text-xs font-semibold">
        {choice.hint} ({mine.length}/{choice.count})
        {choice.freeUse && <span className="font-normal opacity-70"> · free once per long rest</span>}
      </p>
      {mine.map((s) => (
        <div key={s.name} className="flex items-center justify-between rounded-box bg-base-100 px-3 py-1 text-sm">
          {s.name}
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => onChange(spells.filter((x) => x !== s))}
            aria-label={`Remove ${s.name}`}
          >
            ✕
          </button>
        </div>
      ))}
      {mine.length < choice.count && <SpellForm onAdd={add} fixedLevel={choice.level} />}
    </div>
  )
}
