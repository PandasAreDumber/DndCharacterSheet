import { useState, type ReactNode } from 'react'
import { ActionTabs } from './components/ActionTabs'
import { CharacterList } from './components/CharacterList'
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
import { useAccountStore } from './store/cloudSync'
import { useCharacterStore } from './store/characterStore'

type Page = 'characters' | 'tracker' | 'settings' | 'create' | 'edit'

function App() {
  const uid = useAccountStore((s) => s.uid)
  // An account change must also discard drafts, open dialogs, and the previous selection's page.
  return <AccountApp key={uid ?? 'guest'} />
}

function AccountApp() {
  const character = useCharacter()
  const accountReady = useAccountStore((s) => s.ready)
  const activeId = useCharacterStore((s) => s.activeId)
  const [page, setPage] = useState<Page>('characters')
  const [settingsBack, setSettingsBack] = useState<Page>('characters')
  const openCharacter = (id: string) => {
    if (useCharacterStore.getState().selectCharacter(id)) setPage('tracker')
  }
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
      character={accountReady && page !== 'characters' && page !== 'create' ? character : null}
      onHome={() => setPage(character && page !== 'characters' && page !== 'create' ? 'tracker' : 'characters')}
      onCharacters={() => setPage('characters')}
      onSettings={() => { setSettingsBack(page === 'tracker' ? 'tracker' : 'characters'); setPage('settings') }}
      onSettingsPage={page === 'settings'}
    />
  )

  if (!accountReady) {
    return shell(<main className="p-8 text-center text-sm opacity-70">Loading your characters…</main>)
  }

  if (page === 'settings') {
    return shell(<SettingsPage onBack={() => setPage(settingsBack)} />)
  }

  if (page === 'create' || (page === 'edit' && character)) {
    return shell(<SetupForm
      key={page === 'create' ? 'new' : activeId}
      initial={page === 'edit' ? character!.build : null}
      onSave={(build) => {
        const store = useCharacterStore.getState()
        if (page === 'create') store.createCharacter(build)
        else store.saveBuild(build)
      }}
      onDone={() => setPage(useCharacterStore.getState().activeId ? 'tracker' : 'characters')}
      onCancel={() => setPage(page === 'edit' ? 'tracker' : 'characters')}
    />)
  }

  if (page === 'characters' || !character) {
    return shell(<CharacterList onSelect={openCharacter} onCreate={() => setPage('create')} />)
  }

  return shell(
    <main key={activeId} className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-24">
      <div className="flex items-center justify-between pt-4">
        <div>
          <p className="text-sm opacity-70">{character.title}</p>
          {character.speciesLine && <p className="text-xs opacity-50">{character.speciesLine}</p>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setPage('edit')}>
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
