import { useState } from 'react'
import type { Economy } from '../rules/types'
import type { CharacterView } from '../store/selectors'
import { ActionRow } from './ActionRow'

const TABS: { id: Economy; label: string }[] = [
  { id: 'action', label: 'Action' },
  { id: 'bonus', label: 'Bonus' },
  { id: 'reaction', label: 'Reaction' },
  { id: 'free', label: 'Free' },
]

export function ActionTabs({ character }: { character: CharacterView }) {
  const [tab, setTab] = useState<Economy>('action')
  const actions = character.actionsByEconomy[tab]
  const followUps = character.state.turn.followUps.length

  return (
    <section className="flex flex-col gap-3">
      <div role="tablist" className="tabs tabs-box">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            className={`tab flex-1 ${tab === t.id ? 'tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'free' && followUps > 0 && <span className="badge badge-accent badge-xs ml-1">{followUps}</span>}
          </button>
        ))}
      </div>
      {actions.length === 0 ? (
        <p className="text-center text-sm opacity-60">Nothing here. Add spells in the character setup.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {actions.map((a) => (
            <ActionRow key={a.id} character={character} action={a} />
          ))}
        </ul>
      )}
    </section>
  )
}
