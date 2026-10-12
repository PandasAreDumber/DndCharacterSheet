import { useSettingsStore } from '../store/settingsStore'

export function SettingsPage({ onBack }: { onBack: () => void }) {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

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
    </main>
  )
}
