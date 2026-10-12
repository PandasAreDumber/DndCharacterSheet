import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDocFromServer, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore'
import { create } from 'zustand'
import {
  GUEST_KEY,
  activateCharacterStorage,
  markCharacterSynced,
  readLocalCharacter,
  subscribeCharacterChanges,
  userKey,
  type CharacterData,
} from './characterStore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Object.values(config).every(Boolean)
const app = firebaseConfigured ? initializeApp(config) : null
const auth = app ? getAuth(app) : null
const db = app ? getFirestore(app) : null

type SyncStatus = 'unconfigured' | 'local' | 'loading' | 'saving' | 'saved' | 'error'

type AccountStore = {
  ready: boolean
  uid: string | null
  email: string | null
  syncStatus: SyncStatus
  error: string | null
  setAccount: (patch: Partial<Omit<AccountStore, 'setAccount' | 'signIn' | 'signOut'>>) => void
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'

export const useAccountStore = create<AccountStore>((set) => ({
  ready: !auth,
  uid: null,
  email: null,
  syncStatus: auth ? 'loading' : 'unconfigured',
  error: null,
  setAccount: (patch) => set(patch),
  signIn: async () => {
    if (!auth) return
    set({ error: null })
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (error) {
      set({ error: errorText(error) })
    }
  },
  signOut: async () => {
    if (!auth) return
    set({ error: null })
    try {
      await signOut(auth)
    } catch (error) {
      set({ error: errorText(error) })
    }
  },
}))

const hasCharacter = (data: CharacterData) => !!data.build && !!data.tracker

let started = false
let retry: (() => void) | null = null

export function retryCloudSync(): void {
  retry?.()
}

/** Start once, outside React StrictMode. The guest save and each UID have separate local keys. */
export function startCloudSync(): void {
  if (started || !auth || !db) return
  started = true
  const firebaseAuth = auth
  const firestore = db
  let generation = 0
  let currentUid: string | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: CharacterData | null = null
  let writeChain = Promise.resolve()
  let importedGuest = false
  let remoteReady = false
  let saveVersion = 0

  const setStatus = (patch: Partial<ReturnType<typeof useAccountStore.getState>>) =>
    useAccountStore.getState().setAccount(patch)

  const flush = () => {
    if (!currentUid || !pending) return
    const uid = currentUid
    const token = generation
    const data = pending
    const version = saveVersion
    pending = null
    setStatus({ syncStatus: 'saving', error: null })
    writeChain = writeChain
      .catch(() => undefined)
      .then(async () => {
        await setDoc(doc(firestore, 'users', uid, 'characters', 'main'), {
          schemaVersion: 3,
          build: data.build,
          tracker: data.tracker,
          updatedAt: serverTimestamp(),
        })
        if (token !== generation) return
        if (version === saveVersion) markCharacterSynced(data)
        if (importedGuest && hasCharacter(data)) {
          try { localStorage.removeItem(GUEST_KEY) } catch { /* Cloud copy is already saved. */ }
          importedGuest = false
        }
        setStatus({ syncStatus: version === saveVersion ? 'saved' : 'saving', error: null })
      })
      .catch((error: unknown) => {
        if (token === generation && version === saveVersion)
          setStatus({ syncStatus: 'error', error: error instanceof Error ? error.message : 'Cloud save failed.' })
      })
  }

  const queueSave = (data: CharacterData) => {
    saveVersion++
    pending = data
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      flush()
    }, 500)
  }

  subscribeCharacterChanges((data) => {
    if (currentUid && remoteReady && useAccountStore.getState().ready) queueSave(data)
  })

  const loadAccount = async (uid: string, email: string | null, token: number) => {
    currentUid = uid
    remoteReady = false
    const local = readLocalCharacter(userKey(uid))
    activateCharacterStorage(userKey(uid), local)
    setStatus({ uid, email, ready: false, syncStatus: 'loading', error: null })

    try {
      const remote = await getDocFromServer(doc(firestore, 'users', uid, 'characters', 'main'))
      if (token !== generation) return
      remoteReady = true
      if (local.dirty) {
        // Preserve offline edits made on this device. The latest save wins across devices.
        queueSave(local.data)
      } else if (remote.exists()) {
        const value = remote.data()
        if (!('build' in value) || !('tracker' in value)) throw new Error('Cloud character data is incomplete.')
        activateCharacterStorage(userKey(uid), { data: { build: value.build, tracker: value.tracker } as CharacterData, dirty: false })
        setStatus({ syncStatus: 'saved' })
      } else if (hasCharacter(local.data)) {
        queueSave(local.data)
      } else {
        const guest = readLocalCharacter(GUEST_KEY)
        if (hasCharacter(guest.data)) {
          importedGuest = true
          activateCharacterStorage(userKey(uid), { data: guest.data, dirty: true })
          queueSave(guest.data)
        } else {
          setStatus({ syncStatus: 'saved' })
        }
      }
      setStatus({ ready: true })
    } catch (error) {
      if (token !== generation) return
      remoteReady = false
      setStatus({ ready: true, syncStatus: 'error', error: error instanceof Error ? error.message : 'Cloud load failed.' })
    }
  }

  retry = () => {
    if (!currentUid) return
    if (timer) clearTimeout(timer)
    timer = null
    pending = null
    void loadAccount(currentUid, useAccountStore.getState().email, ++generation)
  }

  onAuthStateChanged(firebaseAuth, (user) => {
    generation++
    remoteReady = false
    writeChain = Promise.resolve()
    if (timer) clearTimeout(timer)
    timer = null
    pending = null
    importedGuest = false
    if (user) {
      void loadAccount(user.uid, user.email, generation)
    } else {
      currentUid = null
      activateCharacterStorage(GUEST_KEY)
      setStatus({ uid: null, email: null, ready: true, syncStatus: 'local', error: null })
    }
  }, (error) => {
    currentUid = null
    activateCharacterStorage(GUEST_KEY)
    setStatus({ uid: null, email: null, ready: true, syncStatus: 'error', error: error.message })
  })

  window.addEventListener('online', () => {
    if (currentUid && useAccountStore.getState().syncStatus === 'error') {
      retry?.()
    }
  })
}
