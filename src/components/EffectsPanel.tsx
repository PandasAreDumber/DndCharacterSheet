import { useCharacterStore } from '../store/characterStore'
import type { CharacterView } from '../store/selectors'

/** Things currently running: Innate Sorcery, Peerless Athlete, concentration spells... */
export function EffectsPanel({ character }: { character: CharacterView }) {
  const endEffect = useCharacterStore((s) => s.endEffect)
  const { effects } = character.state
  if (effects.length === 0) return null

  return (
    <section className="card bg-base-200">
      <div className="card-body gap-2 p-4">
        <h2 className="card-title">Active effects</h2>
        <ul className="flex flex-col gap-2">
          {effects.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{e.name}</span>
                {e.concentration ? (
                  <span className="badge badge-secondary badge-sm">Concentration</span>
                ) : (
                  <span className="badge badge-ghost badge-sm">{e.duration}</span>
                )}
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => endEffect(e.id)}>
                End
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
