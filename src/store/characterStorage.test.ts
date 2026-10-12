import { beforeEach, describe, expect, it, vi } from 'vitest'
import { newTracker } from '../rules/engine'
import type { CharacterBuild } from '../rules/types'
import {
  GUEST_KEY,
  activateCharacterStorage,
  markCharacterSynced,
  readLocalCharacter,
  useCharacterStore,
  userKey,
  writeLocalCharacter,
} from './characterStore'

const build: CharacterBuild = {
  name: 'Aster',
  classId: 'sorcerer',
  subclassId: null,
  speciesId: 'human',
  lineageId: null,
  level: 1,
  abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 16 },
  maxHp: 8,
  ac: 12,
  spells: [],
  spellModifiers: [],
}

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  activateCharacterStorage(GUEST_KEY)
})

describe('character saves', () => {
  it('reads and migrates an existing Zustand guest save', () => {
    localStorage.setItem(GUEST_KEY, JSON.stringify({
      version: 1,
      state: { build: { ...build, ac: undefined, speciesId: undefined, lineageId: undefined }, tracker: newTracker(build) },
    }))

    const saved = readLocalCharacter(GUEST_KEY)
    expect(saved.data.build).toMatchObject({ name: 'Aster', ac: 12, speciesId: null, lineageId: null })
    expect(saved.data.tracker?.log).toEqual([])
  })

  it('keeps guest and signed-in browser saves separate', () => {
    const tracker = newTracker(build)
    writeLocalCharacter(GUEST_KEY, { build, tracker }, false)
    activateCharacterStorage(userKey('player-one'))
    expect(useCharacterStore.getState().build).toBeNull()

    useCharacterStore.getState().saveBuild({ ...build, name: 'Cloud hero' })
    expect(readLocalCharacter(userKey('player-one')).dirty).toBe(true)
    expect(readLocalCharacter(GUEST_KEY).data.build?.name).toBe('Aster')

    const current = useCharacterStore.getState()
    markCharacterSynced({ build: current.build, tracker: current.tracker })
    expect(readLocalCharacter(userKey('player-one')).dirty).toBe(false)

    activateCharacterStorage(userKey('player-two'))
    expect(useCharacterStore.getState().build).toBeNull()
    activateCharacterStorage(GUEST_KEY)
    expect(useCharacterStore.getState().build?.name).toBe('Aster')
  })
})
