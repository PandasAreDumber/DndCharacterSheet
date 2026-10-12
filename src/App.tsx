import { useState, type ReactNode } from 'react'
import { ActionTabs } from './components/ActionTabs'
import { AfterCastPrompt } from './components/AfterCastPrompt'
import { EffectsPanel } from './components/EffectsPanel'
import { HpPanel } from './components/HpPanel'
import { MessageToast } from './components/MessageToast'
import { ModifierHelp } from './components/ModifierHelp'
import { Passives } from './components/Passives'
import { ResourcePanel } from './components/ResourcePanel'
import { RestButtons } from './components/RestButtons'
import { SettingsPage } from './components/SettingsPage'
import { SetupForm } from './components/SetupForm'
import { SiteHeader } from './components/SiteHeader'
import { TurnTracker } from './components/TurnTracker'
import { useCharacter } from './store/useCharacter'

type Page = 'tracker' | 'settings'

function App() {
  const character = useCharacter()
  const [editing, setEditing] = useState(false)
  const [page, setPage] = useState<Page>('tracker')
  // Full-width header on top. Below it, the middle column gets its own background;
  // the page edges keep the theme's base color.
  const shell = (content: ReactNode) => (
    <div className="flex min-h-screen flex-col">
      {header}
      <div className="mx-auto w-full max-w-xl flex-1 bg-base-300 shadow-sm">{content}</div>
    </div>
  )

  const header = (
    <SiteHeader
      character={character}
      onHome={() => setPage('tracker')}
      onSettings={() => setPage('settings')}
      onSettingsPage={page === 'settings'}
    />
  )

  if (page === 'settings') {
    return shell(<SettingsPage onBack={() => setPage('tracker')} />)
  }

  if (!character || editing) {
    return shell(<SetupForm initial={character?.build ?? null} onDone={() => setEditing(false)} />)
  }

  return shell(
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-24">
      <div className="flex items-center justify-between pt-4">
        <div>
          <p className="text-sm opacity-70">{character.title}</p>
          {character.speciesLine && <p className="text-xs opacity-50">{character.speciesLine}</p>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>
      <TurnTracker character={character} />
      <HpPanel character={character} />
      <EffectsPanel character={character} />
      <ActionTabs character={character} />
      <ResourcePanel character={character} />
      <Passives character={character} />
      <ModifierHelp character={character} />
      <RestButtons character={character} />
      <AfterCastPrompt character={character} />
      <MessageToast />
    </main>,
  )
}

export default App
