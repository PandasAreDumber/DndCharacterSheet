import type { CharacterView } from '../store/selectors'

export function Passives({ character }: { character: CharacterView }) {
  if (character.passives.length === 0) return null
  return (
    <details className="collapse collapse-arrow bg-base-200">
      <summary className="collapse-title font-semibold">Passive features</summary>
      <div className="collapse-content">
        <ul className="flex flex-col gap-2 text-sm">
          {character.passives.map((p) => (
            <li key={p.id}>
              <span className="font-semibold">{p.name}.</span> {p.text}
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
