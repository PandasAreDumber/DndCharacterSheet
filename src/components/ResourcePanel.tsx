import type { CharacterView, ResourceView } from '../store/selectors'

const MAX_PIPS = 8

function Pips({ r }: { r: ResourceView }) {
  // Created slots (Font of Magic) can push current above max.
  const total = Math.max(r.max, r.current)
  return (
    <div className="flex gap-1" aria-label={`${r.current} of ${r.max}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-4 w-4 rounded-full border-2 ${
            i < r.current ? (i >= r.max ? 'border-accent bg-accent' : 'border-primary bg-primary') : 'border-base-content/30'
          }`}
        />
      ))}
    </div>
  )
}

export function ResourcePanel({ character }: { character: CharacterView }) {
  return (
    <section className="card bg-base-200">
      <div className="card-body gap-3 p-4">
        <h2 className="card-title">Resources</h2>
        <ul className="flex flex-col gap-3">
          {character.resources.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3">
              <span className="text-sm">{r.name}</span>
              {r.max <= MAX_PIPS ? (
                <Pips r={r} />
              ) : (
                <span className="tabular-nums">
                  <span className="text-lg font-bold">{r.current}</span>
                  <span className="opacity-60"> / {r.max}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
