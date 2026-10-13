import { beforeEach, describe, expect, it, vi } from 'vitest'
import { newTracker } from '../rules/engine'
import type { CharacterBuild } from '../rules/types'
import { activateCharacterStorage, markCharacterSynced, useCharacterStore } from './characterStore'
import { GUEST_KEY, mergeCharacters, readLocalRoster, userKey, writeLocalRoster } from './characterStorage'


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
  it('migrates an existing Zustand guest save into the main character', () => {
    localStorage.setItem(GUEST_KEY, JSON.stringify({
      version: 1,
      state: { build: { ...build, ac: undefined, speciesId: undefined, lineageId: undefined }, tracker: newTracker(build) },
    }))
    const saved = readLocalRoster(GUEST_KEY).main
    expect(saved.data.build).toMatchObject({ name: 'Aster', ac: 12, speciesId: null, lineageId: null })
    expect(saved.data.tracker?.log).toEqual([])
  })

  it('preserves pending edits and deletions in the previous account save format', () => {
    const key = userKey('one')
    localStorage.setItem(key, JSON.stringify({ version: 3, data: { build, tracker: newTracker(build) }, dirty: true }))
    expect(readLocalRoster(key).main).toMatchObject({ dirty: true, data: { build } })
    localStorage.setItem(key, JSON.stringify({ version: 3, data: { build: null, tracker: null }, dirty: true }))
    expect(readLocalRoster(key).main).toEqual({ dirty: true, data: { build: null, tracker: null } })
  })

  it('keeps multiple characters and their combat history independent after reloading', () => {
    const store = useCharacterStore.getState
    const first = store().createCharacter(build)
    store().damage(3)
    store().markUsed('action')
    const firstTracker = store().tracker
    const second = store().createCharacter({ ...build, name: 'Bryn' })
    expect(second).not.toBe(first)
    expect(store().tracker?.log).toEqual([])
    store().damage(1)
    const secondTracker = store().tracker
    store().selectCharacter(first)
    expect(store().tracker).toBe(firstTracker)
    store().saveBuild({ ...build, name: 'Renamed' })
    const editedTracker = store().tracker
    store().selectCharacter(second)
    expect(store().tracker).toBe(secondTracker)
    expect(store().build?.name).toBe('Bryn')
    activateCharacterStorage(GUEST_KEY)
    expect(Object.keys(store().characters)).toHaveLength(2)
    store().selectCharacter(first)
    expect(store().build?.name).toBe('Renamed')
    expect(store().tracker).toEqual(editedTracker)
    store().damage(1)
    store().undo()
    expect(store().characters[second].data.tracker).toEqual(secondTracker)
  })

  it('allows identical names without overwriting either character', () => {
    useCharacterStore.getState().createCharacter(build)
    useCharacterStore.getState().createCharacter(build)
    expect(Object.keys(readLocalRoster(GUEST_KEY))).toHaveLength(2)
  })

  it('keeps guest and different accounts separate and clears selection on account changes', () => {
    const guestId = useCharacterStore.getState().createCharacter(build)
    activateCharacterStorage(userKey('one'))
    expect(useCharacterStore.getState().build).toBeNull()
    const cloudId = useCharacterStore.getState().createCharacter({ ...build, name: 'Cloud hero' })
    expect(readLocalRoster(userKey('one'))[cloudId].dirty).toBe(true)
    expect(readLocalRoster(GUEST_KEY)[guestId].data.build?.name).toBe('Aster')
    activateCharacterStorage(userKey('two'))
    expect(useCharacterStore.getState().characters).toEqual({})
    expect(useCharacterStore.getState().activeId).toBeNull()
    activateCharacterStorage(GUEST_KEY)
    useCharacterStore.getState().selectCharacter(guestId)
    expect(useCharacterStore.getState().build?.name).toBe('Aster')
  })

  it('acknowledges only the exact uploaded character version even after switching sheets', () => {
    const key = userKey('one')
    activateCharacterStorage(key)
    const first = useCharacterStore.getState().createCharacter(build)
    const uploaded = useCharacterStore.getState().characters[first]
    const second = useCharacterStore.getState().createCharacter(build)
    markCharacterSynced(key, first, uploaded)
    expect(readLocalRoster(key)[first].dirty).toBe(false)
    expect(readLocalRoster(key)[second].dirty).toBe(true)
    useCharacterStore.getState().selectCharacter(first)
    useCharacterStore.getState().damage(2)
    markCharacterSynced(key, first, uploaded)
    expect(readLocalRoster(key)[first].dirty).toBe(true)
    const latest = useCharacterStore.getState().characters[first]
    markCharacterSynced(userKey('two'), first, latest)
    expect(readLocalRoster(key)[first].dirty).toBe(true)
  })

  it('deletes only the selected character and persists its deletion for offline sync', () => {
    const key = userKey('one')
    activateCharacterStorage(key)
    const first = useCharacterStore.getState().createCharacter(build)
    const second = useCharacterStore.getState().createCharacter(build)
    useCharacterStore.getState().deleteCharacter()
    expect(useCharacterStore.getState().activeId).toBeNull()
    expect(useCharacterStore.getState().selectCharacter(second)).toBe(false)
    expect(readLocalRoster(key)[second]).toEqual({ data: { build: null, tracker: null }, dirty: true })
    expect(useCharacterStore.getState().selectCharacter(first)).toBe(true)
  })

  it('merges per character without overwriting offline changes or unrelated remote characters', () => {
    const local = { data: { build, tracker: newTracker(build) }, dirty: true }
    const remote = { data: { build: { ...build, name: 'Remote' }, tracker: newTracker(build) }, dirty: false }
    const deleted = { data: { build: null, tracker: null }, dirty: true }
    const merged = mergeCharacters({ main: local, gone: deleted, extra: local }, { main: remote, gone: remote, other: remote })
    expect(merged.main).toEqual(local)
    expect(merged.gone).toEqual(deleted)
    expect(merged.other).toEqual(remote)
    expect(merged.extra).toEqual(local)
    expect(mergeCharacters({ main: { ...local, dirty: false } }, { main: remote }).main).toEqual(remote)
  })

  it('retains cloud deletion markers instead of resurrecting clean cached characters', () => {
    const local = { data: { build, tracker: newTracker(build) }, dirty: false }
    const deleted = { data: { build: null, tracker: null }, dirty: false }
    expect(mergeCharacters({ main: local }, { main: deleted }).main).toEqual(deleted)
  })

  it('round trips a roster without dropping any character', () => {
    const saved = { data: { build, tracker: newTracker(build) }, dirty: true }
    writeLocalRoster(userKey('one'), { main: saved, second: saved })
    expect(readLocalRoster(userKey('one'))).toEqual({ main: saved, second: saved })
  })
})
