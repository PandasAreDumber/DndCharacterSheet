import { useState } from 'react'
import type { CastingTime, Economy, Spell } from '../rules/types'
import { useCharacterStore } from '../store/characterStore'
import type { CharacterView } from '../store/selectors'
import { ActionRow } from './ActionRow'
import { SpellForm } from './SpellForm'

const TABS: { id: Economy; label: string }[] = [
  { id: 'action', label: 'Action' },
  { id: 'bonus', label: 'Bonus' },
  { id: 'reaction', label: 'Reaction' },
  { id: 'free', label: 'Free' },
]

// Which tab a new spell shows up in, and the reverse for the quick add default.
const TAB_FOR: Record<CastingTime, Economy> = { action: 'action', bonus: 'bonus', reaction: 'reaction', other: 'free' }
const CASTING_TIME_FOR: Record<Economy, CastingTime> = { action: 'action', bonus: 'bonus', reaction: 'reaction', free: 'other' }

export function ActionTabs({ character }: { character: CharacterView }) {
  const addSpell = useCharacterStore((s) => s.addSpell)
  const [tab, setTab] = useState<Economy>('action')
  const [adding, setAdding] = useState(false)
  const actions = character.actionsByEconomy[tab]

  const onAdd = (spell: Spell) => {
    if (addSpell(spell)) {
      setTab(TAB_FOR[spell.castingTime])
      setAdding(false)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div role="tablist" className="tabs tabs-box">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab flex-1 ${tab === t.id ? 'tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {actions.length === 0 ? (
        <p className="text-center text-sm opacity-60">Nothing here yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {actions.map((a) => (
            <ActionRow key={a.id} character={character} action={a} />
          ))}
        </ul>
      )}
      {adding ? (
        <div className="flex flex-col gap-1">
          {/* key resets the form's default casting time when the tab changes */}
          <SpellForm key={tab} onAdd={onAdd} defaultCastingTime={CASTING_TIME_FOR[tab]} autoFocus />
          <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button className="btn btn-outline btn-sm" onClick={() => setAdding(true)}>
          + Add spell
        </button>
      )}
    </section>
  )
}
