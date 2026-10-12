// App settings (not character data). Saved to localStorage separately from the character.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'

/** The daisyUI theme used for each mode. Must also be listed in index.css. */
export const THEME_NAMES: Record<Theme, string> = { dark: 'abyss', light: 'fantasy' }

type SettingsStore = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'dnd-combat-tracker-settings', version: 1 },
  ),
)
