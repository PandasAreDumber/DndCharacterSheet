import { useCharacterStore } from '../store/characterStore'
import type { CharacterView } from '../store/selectors'
import { ActionRow } from './ActionRow'

/** Shows up right after an action that unlocks a follow up (Divine Smite → Inspiring Smite). */
export function FollowUpPrompt({ character }: { character: CharacterView }) {
  const dismiss = useCharacterStore((s) => s.dismissFollowUps)
  if (character.followUps.length === 0) return null

  return (
    <div className="mt-2 rounded-box border border-accent bg-base-100 p-2" role="status">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-accent">Follow up available</span>
        <button className="btn btn-ghost btn-xs" onClick={dismiss}>
          Skip
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {character.followUps.map((a) => (
          <ActionRow key={a.id} character={character} action={a} />
        ))}
      </ul>
    </div>
  )
}
