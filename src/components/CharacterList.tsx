import { useCharacterStore } from '../store/characterStore'
import { firebaseConfigured, retryCloudSync, useAccountStore } from '../store/cloudSync'
import { viewCharacter } from '../store/selectors'

export function CharacterList({ onSelect, onCreate }: { onSelect: (id: string) => void; onCreate: () => void }) {
  const characters = useCharacterStore((s) => s.characters)
  const uid = useAccountStore((s) => s.uid)
  const status = useAccountStore((s) => s.syncStatus)
  const error = useAccountStore((s) => s.error)
  const entries = Object.entries(characters).filter(([, saved]) => saved.data.build && saved.data.tracker)

  return (
    <main className="flex flex-col gap-4 p-4 pb-16">
      <div>
        <h1 className="text-2xl font-bold">Your characters</h1>
        <p className="mt-1 text-sm opacity-70">Choose an adventurer or create someone new.</p>
      </div>
      <p className="text-xs opacity-70" role="status">
        {uid
          ? status === 'error' ? 'Cloud sync needs attention. Changes are kept in this browser.'
            : status === 'saving' ? 'Saving characters to cloud…' : 'Characters saved to your account.'
          : `Characters are saved in this browser.${firebaseConfigured ? ' Log in to save to your account.' : ''}`}
      </p>
      {error && (
        <div role="alert" className="rounded-box border border-error/40 p-3 text-sm">
          <p>{error}</p>
          {uid && <button className="btn btn-sm btn-outline mt-2" onClick={retryCloudSync}>Retry sync</button>}
        </div>
      )}
      <button className="btn btn-primary" onClick={onCreate}>Create character</button>
      {entries.length ? (
        <ul className="flex flex-col gap-3">
          {entries.map(([id, { data }]) => {
            const character = viewCharacter(data.build!, data.tracker!)
            return (
              <li key={id}>
                <button
                  className="w-full rounded-box border border-base-content/10 bg-base-100 p-4 text-left shadow-sm transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                  onClick={() => onSelect(id)}
                  aria-label={`Open ${character.build.name}`}
                >
                  <span className="block break-words text-lg font-bold">{character.build.name}</span>
                  <span className="mt-1 block text-sm opacity-70">{character.title}</span>
                  <span className="mt-3 flex items-center justify-between gap-2 text-sm">
                    <span>HP {character.state.hp.current}/{character.build.maxHp} · AC {character.build.ac}</span>
                    <span className="font-semibold text-primary">Open character →</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="rounded-box bg-base-100 p-8 text-center">
          <h2 className="font-semibold">Your adventure starts here</h2>
          <p className="mt-2 text-sm opacity-70">Create your first character to start tracking combat, spells, and resources.</p>
        </div>
      )}
    </main>
  )
}
