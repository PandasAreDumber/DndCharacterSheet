import type { ActionDef } from '../rules/types'
import { useCharacterStore } from '../store/characterStore'
import { actionNote, type CharacterView } from '../store/selectors'
import { useActionView } from '../store/useCharacter'

const NO_MODS: string[] = []

function BasicActionButton({ character, action }: { character: CharacterView; action: ActionDef }) {
  const perform = useCharacterStore((s) => s.perform)
  const view = useActionView(character, action, NO_MODS, undefined)
  const payment = view.payments[0]

  return (
    <button
      className="btn btn-sm h-auto min-h-9 py-1 leading-tight"
      disabled={!payment?.ok}
      title={payment?.reason ?? view.note}
      onClick={() => payment && perform(action.id, payment.id)}
    >
      {view.name}
    </button>
  )
}

/** Basic actions everyone has, as one-tap buttons, with a collapsible cheat sheet underneath. */
export function BasicActionGrid({ character, actions }: { character: CharacterView; actions: ActionDef[] }) {
  if (actions.length === 0) return null
  return (
    <div className="flex flex-col gap-1">
      <div className={`grid gap-2 ${actions.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {actions.map((a) => (
          <BasicActionButton key={a.id} character={character} action={a} />
        ))}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-xs opacity-60">What do these do?</summary>
        <dl className="mt-2 flex flex-col gap-2">
          {actions.map((a) => (
            <div key={a.id}>
              <dt className="inline font-semibold">{a.name}. </dt>
              <dd className="inline opacity-80">{actionNote(character.build, a)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  )
}
