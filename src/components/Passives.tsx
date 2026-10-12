import type { CharacterView } from '../store/selectors'
import { SourceTag } from './SourceTag'

export function Passives({ character }: { character: CharacterView }) {
  if (character.passives.length === 0) return null
  return (
    <details className="collapse collapse-arrow bg-base-100 shadow-sm">
      <summary className="collapse-title font-semibold">Passive features</summary>
      <div className="collapse-content">
        <ul className="flex flex-col gap-2 text-sm">
          {character.passives.map((p) => (
            <li key={p.id}>
              <span className="font-semibold">{p.name}.</span> {p.text}{' '}
              {p.source && <SourceTag source={p.source} />}
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
