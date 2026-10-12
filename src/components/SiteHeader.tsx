import { useEffect, useRef } from 'react'
import type { CharacterView } from '../store/selectors'
import { firebaseConfigured, useAccountStore } from '../store/cloudSync'

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
    </svg>
  )
}

/** Top of every page: character name, HP and AC on the left, account menu (settings, log in / out) on the right. */
export function SiteHeader({
  character,
  onHome,
  onSettings,
  onSettingsPage,
}: {
  character: CharacterView | null
  onHome: () => void
  onSettings: () => void
  onSettingsPage: boolean
}) {
  const hp = character?.state.hp
  const uid = useAccountStore((s) => s.uid)
  const email = useAccountStore((s) => s.email)
  const signIn = useAccountStore((s) => s.signIn)
  const signOut = useAccountStore((s) => s.signOut)
  const menu = useRef<HTMLDetailsElement>(null)

  // <details> dropdowns stay open on their own; close the menu when tapping anywhere else.
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (menu.current?.open && !menu.current.contains(e.target as Node)) menu.current.open = false
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  return (
    <header className="relative z-20 bg-neutral text-neutral-content shadow-md">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-2">
        <button
          className="group -mx-2 min-w-0 cursor-pointer rounded-box px-2 py-1 text-left transition-colors hover:bg-neutral-content/10"
          onClick={onHome}
          title={character ? 'Back to your character' : 'Create your character'}
        >
          <div className="truncate font-bold group-hover:underline">{character?.build.name ?? 'Create your character'}</div>
          {character && hp && (
            <div className="flex items-center gap-2 text-sm tabular-nums">
              <span>
                <span className="opacity-60">HP</span> <span className="font-semibold">{hp.current}</span>
                <span className="opacity-60">/{character.build.maxHp}</span>
                {hp.temp > 0 && <span className="text-info"> +{hp.temp}</span>}
              </span>
              <span className="opacity-30">|</span>
              <span>
                <span className="opacity-60">AC</span> <span className="font-semibold">{character.build.ac}</span>
              </span>
            </div>
          )}
        </button>

        <details ref={menu} className="dropdown dropdown-end">
          <summary className="btn btn-circle btn-ghost text-neutral-content hover:bg-neutral-content/10" aria-label="Account">
            <UserIcon />
          </summary>
          <ul className="menu dropdown-content z-30 mt-2 w-52 rounded-box bg-base-100 p-2 text-base-content shadow-lg">
            {uid ? (
              <>
                <li className="menu-disabled"><span className="truncate text-xs">{email ?? 'Signed in'}</span></li>
                <li><button onClick={() => { if (menu.current) menu.current.open = false; void signOut() }}>Log out</button></li>
              </>
            ) : (
              <li>
                <button disabled={!firebaseConfigured} onClick={() => { if (menu.current) menu.current.open = false; void signIn() }}>
                  Log in with Google
                </button>
              </li>
            )}
            <li className={onSettingsPage ? 'menu-disabled' : ''}>
              <button
                disabled={onSettingsPage}
                onClick={() => {
                  if (menu.current) menu.current.open = false
                  onSettings()
                }}
              >
                Settings
              </button>
            </li>
          </ul>
        </details>
      </div>
    </header>
  )
}
