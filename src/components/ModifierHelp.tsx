import type { CharacterView, ModifierView } from '../store/selectors'

const SECTION_ID = 'spell-modifier-help'
const entryId = (id: string) => `${SECTION_ID}-${id}`

/** Opens the help section at the bottom of the page and scrolls to one option. */
function showHelp(id: string) {
  const section = document.getElementById(SECTION_ID)
  if (section instanceof HTMLDetailsElement) section.open = true
  const entry = document.getElementById(entryId(id)) ?? section
  // Wait a moment so the dropdown has opened before scrolling to the entry.
  window.setTimeout(() => entry?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  // Flash the entry so it's easy to spot after the scroll.
  entry?.classList.add('bg-secondary/20')
  window.setTimeout(() => entry?.classList.remove('bg-secondary/20'), 1500)
}

/** Small "i" button next to a Metamagic option. Jumps to its description at the bottom of the page. */
export function ModifierHelpLink({ modifier }: { modifier: ModifierView }) {
  if (!modifier.description) return null
  return (
    <button
      type="button"
      className="btn btn-circle btn-ghost btn-xs h-5 min-h-5 w-5 text-[10px] font-bold opacity-70"
      aria-label={`What does ${modifier.name} do?`}
      onClick={() => showHelp(modifier.id)}
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
    <details id={SECTION_ID} className="collapse collapse-arrow bg-base-200">
      <summary className="collapse-title font-semibold">{character.spellModifierName}</summary>
      <div className="collapse-content">
        <ul className="flex flex-col gap-2 text-sm">
          {mods.map((m) => (
            <li key={m.id} id={entryId(m.id)} className="rounded-box p-1 transition-colors">
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
