import type { FeatureSource } from '../rules/types'

const KIND_LABEL: Record<FeatureSource['kind'], string> = { class: 'Class', subclass: 'Subclass', species: 'Species' }

function SourceIcon({ kind }: { kind: FeatureSource['kind'] }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-3 w-3 shrink-0',
    'aria-hidden': true,
  }
  if (kind === 'class') {
    // Shield
    return (
      <svg {...common}>
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      </svg>
    )
  }
  if (kind === 'subclass') {
    // Star
    return (
      <svg {...common}>
        <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
      </svg>
    )
  }
  // Person
  return (
    <svg {...common}>
      <circle cx="12" cy="7" r="3.5" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </svg>
  )
}

/** Small tag showing where a feature comes from: class, subclass or species. */
export function SourceTag({ source }: { source: FeatureSource }) {
  const label = `${KIND_LABEL[source.kind]}: ${source.name}`
  return (
    <span className="badge badge-ghost badge-sm gap-1 opacity-80" title={label} aria-label={label}>
      <SourceIcon kind={source.kind} />
      {source.name}
    </span>
  )
}
