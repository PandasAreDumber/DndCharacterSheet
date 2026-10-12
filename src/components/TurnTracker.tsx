import { useCharacterStore } from '../store/characterStore'
import type { CharacterView } from '../store/selectors'
import { FollowUpPrompt } from './FollowUpPrompt'

const ECONOMIES = [
  { id: 'action', label: 'Action', color: 'btn-success' },
  { id: 'bonus', label: 'Bonus', color: 'btn-info' },
  { id: 'reaction', label: 'Reaction', color: 'btn-warning' },
] as const

/** Sticky bar at the top: what's left this turn, New Turn and Undo. */
export function TurnTracker({ character }: { character: CharacterView }) {
  const markUsed = useCharacterStore((s) => s.markUsed)
  const newTurn = useCharacterStore((s) => s.newTurn)
  const undo = useCharacterStore((s) => s.undo)
  const { turn } = character.state

  return (
    <section className="sticky top-0 z-10 -mx-4 border-b border-base-300 bg-base-100/95 px-4 py-3 backdrop-blur">
      <div className="grid grid-cols-3 gap-2">
        {ECONOMIES.map((e) => {
          const used = turn[e.id]
          return (
            <button
              key={e.id}
              className={`btn h-14 flex-col gap-0 ${used ? 'btn-disabled line-through' : e.color}`}
              disabled={used}
              onClick={() => markUsed(e.id)}
              title={used ? 'Used' : `Mark ${e.label} as used (e.g. an attack)`}
            >
              <span className="text-base">{e.label}</span>
              <span className="text-[10px] font-normal opacity-80">{used ? 'used' : 'tap to use'}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button className="btn btn-primary flex-1" onClick={newTurn}>
          New Turn
        </button>
        <button className="btn btn-outline" onClick={undo} disabled={!character.canUndo}>
          ↶ Undo
        </button>
      </div>
      {(turn.slotSpellCast || character.concentration) && (
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
          {turn.slotSpellCast && <span className="badge badge-warning badge-sm">Spell slot used this turn</span>}
          {character.concentration && (
            <span className="badge badge-secondary badge-sm">Concentrating: {character.concentration}</span>
          )}
        </div>
      )}
      <FollowUpPrompt character={character} />
    </section>
  )
}
