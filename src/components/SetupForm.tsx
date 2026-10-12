import { useState } from 'react'
import type { AbilityName, CharacterBuild, Spell } from '../rules/types'
import { useCharacterStore } from '../store/characterStore'
import { classOptions, speciesOptions, spellModifierOptions, subclassLevel, subclassOptions } from '../store/selectors'
import { SpellForm } from './SpellForm'

const ABILITIES: { id: AbilityName; label: string }[] = [
  { id: 'str', label: 'STR' },
  { id: 'dex', label: 'DEX' },
  { id: 'con', label: 'CON' },
  { id: 'int', label: 'INT' },
  { id: 'wis', label: 'WIS' },
  { id: 'cha', label: 'CHA' },
]

// Number fields are kept as text while typing so the box can be empty.
type Draft = {
  name: string
  classId: string
  subclassId: string
  speciesId: string
  lineageId: string
  level: string
  maxHp: string
  ac: string
  abilities: Record<AbilityName, string>
  spells: Spell[]
  spellModifiers: string[]
}

const firstClass = classOptions[0]?.id ?? ''

function toDraft(b: CharacterBuild | null): Draft {
  if (!b) {
    return {
      name: '',
      classId: firstClass,
      subclassId: '',
      speciesId: '',
      lineageId: '',
      level: '1',
      maxHp: '',
      ac: '10',
      abilities: { str: '10', dex: '10', con: '10', int: '10', wis: '10', cha: '10' },
      spells: [],
      spellModifiers: [],
    }
  }
  return {
    name: b.name,
    classId: b.classId,
    subclassId: b.subclassId ?? '',
    speciesId: b.speciesId ?? '',
    lineageId: b.lineageId ?? '',
    level: String(b.level),
    maxHp: String(b.maxHp),
    ac: String(b.ac),
    abilities: Object.fromEntries(ABILITIES.map((a) => [a.id, String(b.abilities[a.id])])) as Record<AbilityName, string>,
    spells: b.spells,
    spellModifiers: b.spellModifiers,
  }
}

const toInt = (s: string) => Number.parseInt(s, 10)
const inRange = (n: number, lo: number, hi: number) => Number.isInteger(n) && n >= lo && n <= hi

export function SetupForm({ initial, onDone }: { initial: CharacterBuild | null; onDone: () => void }) {
  const saveBuild = useCharacterStore((s) => s.saveBuild)
  const deleteCharacter = useCharacterStore((s) => s.deleteCharacter)
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial))

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const subclasses = subclassOptions(draft.classId)
  const modifiers = spellModifierOptions(draft.classId)
  const species = speciesOptions.find((s) => s.id === draft.speciesId)
  const hasLineage = !!species && species.lineages.length > 0
  const pickSubclassAt = subclassLevel(draft.classId)
  const level = toInt(draft.level)
  const subclassUnlocked = Number.isInteger(level) && level >= pickSubclassAt

  const errors: string[] = []
  if (!draft.speciesId) errors.push('Pick a species.')
  if (!inRange(toInt(draft.level), 1, 10)) errors.push('Level must be 1 to 10.')
  if (!inRange(toInt(draft.maxHp), 1, 999)) errors.push('Max HP must be at least 1.')
  if (!inRange(toInt(draft.ac), 1, 40)) errors.push('Armor Class must be 1 to 40.')
  if (ABILITIES.some((a) => !inRange(toInt(draft.abilities[a.id]), 1, 30))) errors.push('Ability scores must be 1 to 30.')

  const save = () => {
    if (errors.length) return
    saveBuild({
      name: draft.name.trim() || 'Adventurer',
      classId: draft.classId,
      subclassId: draft.subclassId || null,
      speciesId: draft.speciesId || null,
      lineageId: draft.lineageId || null,
      level: toInt(draft.level),
      maxHp: toInt(draft.maxHp),
      ac: toInt(draft.ac),
      abilities: Object.fromEntries(ABILITIES.map((a) => [a.id, toInt(draft.abilities[a.id])])) as Record<
        AbilityName,
        number
      >,
      spells: draft.spells,
      spellModifiers: draft.spellModifiers,
    })
    onDone()
  }

  const addSpell = (spell: Spell) => {
    const lower = spell.name.toLowerCase()
    update({ spells: [...draft.spells.filter((s) => s.name.toLowerCase() !== lower), spell] })
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4 pb-16">
      <h1 className="text-2xl font-bold">{initial ? 'Edit character' : 'New character'}</h1>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Name</legend>
        <input className="input w-full" value={draft.name} onChange={(e) => update({ name: e.target.value })} />
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Class</legend>
          <select
            className="select w-full"
            value={draft.classId}
            onChange={(e) =>
              update({
                classId: e.target.value,
                // Changing class clears the subclass; pick again once it unlocks.
                subclassId: '',
                spellModifiers: [],
              })
            }
          >
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Subclass</legend>
          <select
            className="select w-full"
            value={draft.subclassId}
            onChange={(e) => update({ subclassId: e.target.value })}
          >
            <option value="">{subclassUnlocked ? 'None' : 'Not yet'}</option>
            {subclasses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {!subclassUnlocked ? (
            <p className="label text-xs">Optional until level {pickSubclassAt}</p>
          ) : (
            !draft.subclassId && <p className="label text-xs text-warning">Pick your subclass</p>
          )}
        </fieldset>
        <fieldset className={`fieldset ${hasLineage ? '' : 'col-span-2'}`}>
          <legend className="fieldset-legend">Species</legend>
          <select
            className="select w-full"
            value={draft.speciesId}
            onChange={(e) =>
              update({
                speciesId: e.target.value,
                lineageId: speciesOptions.find((s) => s.id === e.target.value)?.lineages[0]?.id ?? '',
              })
            }
          >
            <option value="" disabled>
              Pick a species
            </option>
            {speciesOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </fieldset>
        {species && hasLineage && (
          <fieldset className="fieldset">
            <legend className="fieldset-legend">{species.lineageLabel}</legend>
            <select
              className="select w-full"
              value={draft.lineageId}
              onChange={(e) => update({ lineageId: e.target.value })}
            >
              {species.lineages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </fieldset>
        )}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Level</legend>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            className="input w-full"
            value={draft.level}
            onChange={(e) => update({ level: e.target.value })}
          />
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Max HP</legend>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            className="input w-full"
            value={draft.maxHp}
            onChange={(e) => update({ maxHp: e.target.value })}
          />
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Armor Class</legend>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={40}
            className="input w-full"
            value={draft.ac}
            onChange={(e) => update({ ac: e.target.value })}
          />
        </fieldset>
      </div>

      <fieldset className="fieldset rounded-box border border-primary/40 bg-primary/5 p-3">
        <legend className="fieldset-legend px-1 text-primary">Ability scores</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ABILITIES.map((a) => (
            <label key={a.id} className="flex flex-col items-center gap-1 text-xs font-semibold">
              {a.label}
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                className="input w-full text-center"
                value={draft.abilities[a.id]}
                onChange={(e) => update({ abilities: { ...draft.abilities, [a.id]: e.target.value } })}
              />
            </label>
          ))}
        </div>
      </fieldset>

      {modifiers.options.length > 0 && (
        <fieldset className="fieldset rounded-box border border-secondary/50 bg-secondary/10 p-3">
          <legend className="fieldset-legend px-1 text-secondary">{modifiers.name}</legend>
          {modifiers.unlockLevel > level && (
            <p className="label text-xs">You can use these from level {modifiers.unlockLevel}</p>
          )}
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {modifiers.options.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="checkbox checkbox-secondary checkbox-sm"
                  checked={draft.spellModifiers.includes(m.id)}
                  onChange={() =>
                    update({
                      spellModifiers: draft.spellModifiers.includes(m.id)
                        ? draft.spellModifiers.filter((x) => x !== m.id)
                        : [...draft.spellModifiers, m.id],
                    })
                  }
                />
                {m.name} ({m.cost})
              </label>
            ))}
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-secondary">What do these do?</summary>
            <dl className="mt-2 flex flex-col gap-2">
              {modifiers.options.map((m) => (
                <div key={m.id}>
                  <dt className="inline font-semibold">{m.name}. </dt>
                  <dd className="inline opacity-80">{m.description}</dd>
                </div>
              ))}
            </dl>
          </details>
        </fieldset>
      )}

      <fieldset className="fieldset rounded-box border border-accent/50 bg-accent/5 p-3">
        <legend className="fieldset-legend px-1 text-accent">Your spells</legend>
        <p className="text-xs opacity-60">Spells your class or subclass always has are added for you.</p>
        {draft.spells.length > 0 && (
          <ul className="flex flex-col gap-1">
            {draft.spells.map((s) => (
              <li key={s.name} className="flex items-center justify-between rounded-box bg-base-100 px-3 py-1 text-sm">
                <span>
                  {s.name}{' '}
                  <span className="opacity-60">
                    ({s.level === 0 ? 'cantrip' : `L${s.level}`}, {s.castingTime}
                    {s.range ? `, ${s.range}` : ''}
                    {s.duration ? `, ${s.duration}` : ''}
                    {s.concentration ? ', conc.' : ''})
                  </span>
                </span>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => update({ spells: draft.spells.filter((x) => x !== s) })}
                  aria-label={`Remove ${s.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2">
          <SpellForm onAdd={addSpell} />
        </div>
      </fieldset>

      {errors.length > 0 && (
        <ul className="text-sm text-error">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        {initial && (
          <button className="btn btn-ghost" onClick={onDone}>
            Cancel
          </button>
        )}
        <button className="btn btn-primary flex-1" onClick={save} disabled={errors.length > 0}>
          {initial ? 'Save' : 'Create character'}
        </button>
      </div>

      {initial && (
        <button
          className="btn btn-error btn-outline btn-sm mt-6"
          onClick={() => {
            if (window.confirm(`Delete ${initial.name}? This can't be undone.`)) {
              deleteCharacter()
              onDone()
            }
          }}
        >
          Delete character
        </button>
      )}
    </main>
  )
}
