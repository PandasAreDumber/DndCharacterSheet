import { useCharacterStore } from '../store/characterStore'
import type { CharacterView } from '../store/selectors'
import { Modal } from './Modal'

/** Pops up right after casting a spell if a modifier can still be used on it (Seeking Spell after a miss). */
export function AfterCastPrompt({ character }: { character: CharacterView }) {
  const apply = useCharacterStore((s) => s.applyAfterCast)
  const skip = useCharacterStore((s) => s.skipAfterCast)
  const afterCast = character.afterCast
  if (!afterCast) return null

  return (
    <Modal title={`Did ${afterCast.spellName} miss?`} onClose={skip}>
      {afterCast.modifiers.map((m) => (
        <div key={m.id} className="py-2">
          <p className="text-sm opacity-80">{m.description}</p>
          <button className="btn btn-secondary mt-2 w-full" onClick={() => apply(m.id)}>
            Use {m.name} ({m.cost} SP)
          </button>
        </div>
      ))}
      <div className="modal-action">
        <button className="btn btn-ghost w-full" onClick={skip}>
          No, don't use it
        </button>
      </div>
    </Modal>
  )
}
