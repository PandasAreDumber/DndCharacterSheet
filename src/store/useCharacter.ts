import { useMemo } from 'react'
import type { ActionDef } from '../rules/types'
import { useCharacterStore } from './characterStore'
import { describeAction, viewCharacter, type ActionView, type CharacterView } from './selectors'

/** The current character, ready to render. Null if no character is set up yet. */
export function useCharacter(): CharacterView | null {
  const build = useCharacterStore((s) => s.build)
  const tracker = useCharacterStore((s) => s.tracker)
  return useMemo(() => (build && tracker ? viewCharacter(build, tracker) : null), [build, tracker])
}

/** One action row, given the metamagic / amount the player picked in that row. */
export function useActionView(
  character: CharacterView,
  action: ActionDef,
  spellModifiers: string[],
  amount: number | undefined,
): ActionView {
  return useMemo(
    () => describeAction(character.build, character.state, action, { spellModifiers, amount }),
    [character.build, character.state, action, spellModifiers, amount],
  )
}
