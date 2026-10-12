import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { THEME_NAMES, useSettingsStore, type Theme } from './store/settingsStore'

// daisyUI picks its theme from data-theme on <html>. Set it before the first render so there's no flash,
// then keep it in sync when the player changes it in Settings.
const applyTheme = (theme: Theme) => document.documentElement.setAttribute('data-theme', THEME_NAMES[theme])
applyTheme(useSettingsStore.getState().theme)
useSettingsStore.subscribe((s) => applyTheme(s.theme))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
