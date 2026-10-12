import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newTracker } from '../rules/engine'
import type { CharacterBuild } from '../rules/types'

const firebase = vi.hoisted(() => ({
  authChanged: null as null | ((user: { uid: string; email: string } | null) => void),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
}))
vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }))
vi.mock('firebase/auth', () => ({
  getAuth: () => ({}), GoogleAuthProvider: class {}, signInWithPopup: vi.fn(), signOut: vi.fn(),
  onAuthStateChanged: (_auth: unknown, callback: typeof firebase.authChanged) => { firebase.authChanged = callback },
}))
vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: (_db: unknown, ...path: string[]) => path.join('/'),
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  getDocsFromServer: firebase.getDocs,
  setDoc: firebase.setDoc,
  serverTimestamp: () => 'server time',
}))

const build: CharacterBuild = {
  name: 'Aster', classId: 'sorcerer', subclassId: null, speciesId: 'human', lineageId: null,
  level: 1, abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 16 },
  maxHp: 8, ac: 12, spells: [], spellModifiers: [],
}
const data = (name = 'Aster') => ({ build: { ...build, name }, tracker: newTracker(build), schemaVersion: 3 })
const snapshot = (characters: Record<string, unknown>) => ({
  docs: Object.entries(characters).map(([id, value]) => ({ id, data: () => value })),
})
const settle = async () => { await vi.advanceTimersByTimeAsync(0) }
const upload = async () => { await vi.advanceTimersByTimeAsync(500) }
const login = (uid = 'one') => firebase.authChanged?.({ uid, email: `${uid}@example.com` })

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  firebase.getDocs.mockReset().mockResolvedValue(snapshot({}))
  firebase.setDoc.mockReset().mockResolvedValue(undefined)
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  })
  vi.stubGlobal('window', { addEventListener: vi.fn() })
  for (const key of ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'APP_ID']) vi.stubEnv(`VITE_FIREBASE_${key}`, 'test')
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

async function start() {
  const sync = await import('./cloudSync')
  const store = await import('./characterStore')
  const storage = await import('./characterStorage')
  sync.startCloudSync()
  return { ...sync, ...store, ...storage, state: store.useCharacterStore.getState }
}

describe('multi-character cloud sync', () => {
  it('loads the legacy main document alongside all other characters', async () => {
    firebase.getDocs.mockResolvedValue(snapshot({ main: data(), second: data('Bryn') }))
    const app = await start()
    login()
    await settle()
    expect(firebase.getDocs).toHaveBeenCalledWith('users/one/characters')
    expect(Object.keys(app.state().characters)).toEqual(['main', 'second'])
    expect(app.state().activeId).toBeNull()
    expect(app.useAccountStore.getState().syncStatus).toBe('saved')
    await upload()
    expect(firebase.setDoc).not.toHaveBeenCalled()
  })

  it('writes different characters to different documents when switching before the debounce', async () => {
    const app = await start()
    login()
    await settle()
    const first = app.state().createCharacter(build)
    app.state().damage(2)
    const second = app.state().createCharacter({ ...build, name: 'Bryn' })
    app.state().damage(1)
    app.state().selectCharacter(first)
    await upload()
    expect(firebase.setDoc).toHaveBeenCalledTimes(2)
    expect(firebase.setDoc).toHaveBeenCalledWith(`users/one/characters/${first}`, expect.objectContaining({
      build, tracker: expect.objectContaining({ log: [{ type: 'DAMAGE', amount: 2 }] }), schemaVersion: 4,
    }))
    expect(firebase.setDoc).toHaveBeenCalledWith(`users/one/characters/${second}`, expect.objectContaining({
      build: expect.objectContaining({ name: 'Bryn' }), tracker: expect.objectContaining({ log: [{ type: 'DAMAGE', amount: 1 }] }),
    }))
    expect(Object.values(app.state().characters).every((saved) => !saved.dirty)).toBe(true)
  })

  it('does not acknowledge newer edits when an older upload completes', async () => {
    const app = await start()
    login()
    await settle()
    let finish!: () => void
    firebase.setDoc.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
    const id = app.state().createCharacter(build)
    await upload()
    app.state().damage(2)
    finish()
    await settle()
    expect(app.state().characters[id].dirty).toBe(true)
    await upload()
    expect(app.state().characters[id].dirty).toBe(false)
    expect(firebase.setDoc.mock.calls[1][1].tracker.log).toEqual([{ type: 'DAMAGE', amount: 2 }])
  })

  it('keeps an in-flight save attached to its original account on account change', async () => {
    const app = await start()
    login()
    await settle()
    const first = app.state().createCharacter(build)
    login('two')
    await settle()
    const second = app.state().createCharacter({ ...build, name: 'Other player' })
    await upload()
    expect(firebase.setDoc.mock.calls.map(([path]) => path)).toEqual([
      `users/one/characters/${first}`, `users/two/characters/${second}`,
    ])
    expect(Object.keys(app.state().characters)).toEqual([second])
  })

  it('ignores a stale account load after signing out', async () => {
    let finish!: (value: unknown) => void
    firebase.getDocs.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const app = await start()
    login()
    await settle()
    firebase.authChanged?.(null)
    finish(snapshot({ main: data('Private') }))
    await settle()
    expect(app.useAccountStore.getState().uid).toBeNull()
    expect(app.state().characters).toEqual({})
  })

  it('opens another account even while an old account upload remains pending', async () => {
    const app = await start()
    login()
    await settle()
    let finish!: () => void
    firebase.setDoc.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
    const id = app.state().createCharacter(build)
    await upload()
    firebase.getDocs.mockResolvedValue(snapshot({ other: data('Other account') }))
    login('two')
    await settle()
    expect(app.useAccountStore.getState().ready).toBe(true)
    expect(Object.keys(app.state().characters)).toEqual(['other'])
    finish()
    await settle()
    expect(app.readLocalRoster(app.userKey('one'))[id].dirty).toBe(false)
    expect(app.useAccountStore.getState().uid).toBe('two')
    expect(Object.keys(app.state().characters)).toEqual(['other'])
  })

  it('uploads migrated offline changes to main without duplicating the legacy character', async () => {
    const app = await start()
    localStorage.setItem(app.userKey('one'), JSON.stringify({
      version: 3, data: data('Offline rename'), dirty: true,
    }))
    firebase.getDocs.mockResolvedValue(snapshot({ main: data('Old name'), other: data('Another hero') }))
    login()
    await settle()
    await upload()
    expect(Object.keys(app.state().characters)).toEqual(['main', 'other'])
    expect(firebase.setDoc).toHaveBeenCalledExactlyOnceWith('users/one/characters/main', expect.objectContaining({
      build: expect.objectContaining({ name: 'Offline rename' }),
    }))
  })

  it('queues a deletion after an in-flight upload so the character cannot reappear', async () => {
    const app = await start()
    login()
    await settle()
    let finish!: () => void
    firebase.setDoc.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
    const id = app.state().createCharacter(build)
    await upload()
    app.state().deleteCharacter()
    await upload()
    finish()
    await settle()
    expect(firebase.setDoc).toHaveBeenCalledTimes(2)
    expect(firebase.setDoc.mock.calls[1]).toEqual([
      `users/one/characters/${id}`, expect.objectContaining({ build: null, tracker: null }),
    ])
    expect(app.state().characters[id].dirty).toBe(false)
    expect(app.state().activeId).toBeNull()
  })

  it('preserves an uploaded edit when a retry returns a snapshot taken before that upload', async () => {
    const app = await start()
    login()
    await settle()
    let finishWrite!: () => void
    firebase.setDoc.mockImplementationOnce(() => new Promise<void>((resolve) => { finishWrite = resolve }))
    const id = app.state().createCharacter({ ...build, name: 'Latest name' })
    await upload()
    let finishRead!: (value: unknown) => void
    firebase.getDocs.mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve }))
    app.retryCloudSync()
    await settle()
    finishWrite()
    await settle()
    finishRead(snapshot({ [id]: data('Old name') }))
    await settle()
    expect(app.state().characters[id].data.build?.name).toBe('Latest name')
    await upload()
    expect(app.useAccountStore.getState().syncStatus).toBe('saved')
  })

  it('recovers offline edits for multiple characters without overwriting other remote saves', async () => {
    firebase.getDocs.mockRejectedValueOnce(new Error('Offline'))
    const app = await start()
    login()
    await settle()
    const first = app.state().createCharacter(build)
    const second = app.state().createCharacter({ ...build, name: 'Bryn' })
    await upload()
    expect(firebase.setDoc).not.toHaveBeenCalled()
    expect(app.useAccountStore.getState().syncStatus).toBe('error')
    firebase.getDocs.mockResolvedValue(snapshot({ remote: data('Remote hero') }))
    app.retryCloudSync()
    await settle()
    await upload()
    expect(Object.keys(app.state().characters)).toEqual(['remote', first, second])
    expect(firebase.setDoc.mock.calls.map(([path]) => path)).toEqual([
      `users/one/characters/${first}`, `users/one/characters/${second}`,
    ])
  })

  it('retries failed writes without losing characters that already uploaded', async () => {
    const app = await start()
    login()
    await settle()
    const first = app.state().createCharacter(build)
    const second = app.state().createCharacter({ ...build, name: 'Bryn' })
    firebase.setDoc.mockRejectedValueOnce(new Error('Write failed'))
    await upload()
    expect(app.state().characters[first].dirty).toBe(true)
    expect(app.state().characters[second].dirty).toBe(false)
    expect(app.useAccountStore.getState().syncStatus).toBe('error')
    firebase.getDocs.mockResolvedValue(snapshot({ [second]: data('Bryn') }))
    app.retryCloudSync()
    await settle()
    await upload()
    expect(firebase.setDoc).toHaveBeenCalledTimes(3)
    expect(app.useAccountStore.getState().syncStatus).toBe('saved')
  })

  it('imports every guest character into an empty account, retaining the guest backup', async () => {
    const app = await start()
    const first = app.state().createCharacter(build)
    const second = app.state().createCharacter({ ...build, name: 'Bryn' })
    login()
    await settle()
    await upload()
    expect(firebase.setDoc).toHaveBeenCalledTimes(2)
    expect(Object.keys(app.readLocalRoster(app.GUEST_KEY))).toEqual([first, second])
    firebase.getDocs.mockResolvedValue(snapshot({ [first]: data(), [second]: data('Bryn') }))
    app.retryCloudSync()
    await settle()
    await upload()
    expect(firebase.setDoc).toHaveBeenCalledTimes(2)
  })

  it('does not import guest characters into an existing account', async () => {
    const app = await start()
    app.state().createCharacter(build)
    firebase.getDocs.mockResolvedValue(snapshot({ main: data('Account hero') }))
    login()
    await settle()
    await upload()
    expect(Object.keys(app.state().characters)).toEqual(['main'])
    expect(firebase.setDoc).not.toHaveBeenCalled()
  })

  it('persists deletion for only the selected document and does not reimport guests afterward', async () => {
    firebase.getDocs.mockResolvedValue(snapshot({ main: data(), second: data('Bryn') }))
    const app = await start()
    app.state().createCharacter(build)
    login()
    await settle()
    app.state().selectCharacter('main')
    app.state().deleteCharacter()
    await upload()
    expect(firebase.setDoc).toHaveBeenCalledExactlyOnceWith('users/one/characters/main', expect.objectContaining({ build: null, tracker: null }))
    expect(app.state().characters.second.data.build?.name).toBe('Bryn')
    app.state().selectCharacter('second')
    app.state().deleteCharacter()
    await upload()
    firebase.getDocs.mockResolvedValue(snapshot({ main: { build: null, tracker: null }, second: { build: null, tracker: null } }))
    app.retryCloudSync()
    await settle()
    await upload()
    expect(Object.values(app.state().characters).some((saved) => app.hasCharacter(saved.data))).toBe(false)
    expect(firebase.setDoc).toHaveBeenCalledTimes(2)
  })
})
