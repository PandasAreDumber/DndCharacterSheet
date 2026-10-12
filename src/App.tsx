import { useState } from 'react'
import { ActionTabs } from './components/ActionTabs'
import { AfterCastPrompt } from './components/AfterCastPrompt'
import { EffectsPanel } from './components/EffectsPanel'
import { HpPanel } from './components/HpPanel'
import { MessageToast } from './components/MessageToast'
import { ModifierHelp } from './components/ModifierHelp'
import { Passives } from './components/Passives'
import { ResourcePanel } from './components/ResourcePanel'
import { RestButtons } from './components/RestButtons'
import { SetupForm } from './components/SetupForm'
import { TurnTracker } from './components/TurnTracker'
import { useCharacter } from './store/useCharacter'

function App() {
  const character = useCharacter()
  const [editing, setEditing] = useState(false)

  if (!character || editing) {
    return <SetupForm initial={character?.build ?? null} onDone={() => setEditing(false)} />
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-24">
      <header className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-xl font-bold">{character.build.name}</h1>
          <p className="text-sm opacity-70">{character.title}</p>
          {character.speciesLine && <p className="text-xs opacity-50">{character.speciesLine}</p>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
          Edit
        </button>
      </header>
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
    </main>
  )
}

export default App
