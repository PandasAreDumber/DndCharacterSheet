import { useSettingsStore } from '../store/settingsStore'
import { firebaseConfigured, retryCloudSync, useAccountStore } from '../store/cloudSync'

export function SettingsPage({ onBack }: { onBack: () => void }) {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const uid = useAccountStore((s) => s.uid)
  const email = useAccountStore((s) => s.email)
  const syncStatus = useAccountStore((s) => s.syncStatus)
  const error = useAccountStore((s) => s.error)
  const signIn = useAccountStore((s) => s.signIn)
  const signOut = useAccountStore((s) => s.signOut)

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          ← Back
        </button>
      </div>

      <label className="flex cursor-pointer items-center justify-between rounded-box bg-base-100 p-4 shadow-sm">
        <span>
          <span className="block font-semibold">Dark mode</span>
          <span className="text-sm opacity-60">Switch between dark and light mode.</span>
        </span>
        <input
          type="checkbox"
          className="toggle toggle-primary"
          checked={theme === 'dark'}
          onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
        />
      </label>
      <section className="rounded-box bg-base-100 p-4 shadow-sm">
        <h2 className="font-semibold">Account and cloud save</h2>
        <p className="mt-1 text-sm opacity-70">
          {!firebaseConfigured
            ? 'Firebase is not configured. Your characters are saved in this browser.'
            : uid
              ? `${email ?? 'Signed in'} · ${syncStatus === 'saved' ? 'Saved to cloud' : syncStatus === 'saving' ? 'Saving…' : syncStatus === 'loading' ? 'Loading…' : syncStatus === 'error' ? 'Cloud sync needs attention' : 'Saved locally'}`
              : 'Playing as a guest. Your characters are saved in this browser.'}
        </p>
        {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
        {firebaseConfigured && (
          <div className="mt-3 flex gap-2">
            <button className="btn btn-outline btn-sm" onClick={() => void (uid ? signOut() : signIn())}>
              {uid ? 'Log out' : 'Log in with Google'}
            </button>
            {uid && syncStatus === 'error' && (
              <button className="btn btn-primary btn-sm" onClick={retryCloudSync}>Retry sync</button>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
