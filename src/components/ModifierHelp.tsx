import type { CharacterView } from '../store/selectors'

const SECTION_ID = 'spell-modifier-help'

/** Opens the help section at the bottom of the page and scrolls to it. */
function showHelp() {
  const section = document.getElementById(SECTION_ID)
  if (section instanceof HTMLDetailsElement) section.open = true
  // Wait a moment so the dropdown has opened before scrolling to it.
  window.setTimeout(() => section?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
}

/** Small "i" button for the Metamagic options. Jumps to their descriptions at the bottom of the page. */
export function ModifierHelpLink({ name }: { name: string }) {
  return (
    <button
      type="button"
      className="btn btn-circle btn-ghost btn-xs h-5 min-h-5 w-5 shrink-0 text-[10px] font-bold opacity-70"
      aria-label={`What do the ${name} options do?`}
      title={`What do the ${name} options do?`}
      onClick={showHelp}
    >
      i
    </button>
  )
}

/** Dropdown at the bottom of the page with what each picked option (e.g. Metamagic) does. */
export function ModifierHelp({ character }: { character: CharacterView }) {
  const mods = character.spellModifiers.filter((m) => m.description)
  if (mods.length === 0) return null
  return (
    <details id={SECTION_ID} className="collapse collapse-arrow border-l-4 border-secondary bg-base-100 shadow-sm">
      <summary className="collapse-title font-semibold text-secondary">{character.spellModifierName}</summary>
      <div className="collapse-content">
        <ul className="flex flex-col gap-2 text-sm">
          {mods.map((m) => (
            <li key={m.id}>
              <span className="font-semibold">
                {m.name} ({m.cost} SP).
              </span>{' '}
              {m.description}
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
