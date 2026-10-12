import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { collection, doc, getDocsFromServer, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore'
import { create } from 'zustand'
import {
  activateCharacterStorage, markCharacterSynced, subscribeCharacterChanges, useCharacterStore,
} from './characterStore'
import {
  GUEST_KEY, decodeCharacter, hasCharacter, mergeCharacters, readLocalRoster, userKey,
  type CharacterRoster,
} from './characterStorage'

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

let started = false
let retry: (() => void) | null = null

export function retryCloudSync(): void {
  retry?.()
}

/** A save captures both the account and character ID, independent of the selected sheet. */
export function startCloudSync(): void {
  if (started || !auth || !db) return
  started = true
  const firestore = db
  let generation = 0
  let currentUid: string | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let remoteReady = false
  // Serialize writes across account changes too: an older write must never finish last.
  let writeChain = Promise.resolve()

  const setStatus = (patch: Partial<ReturnType<typeof useAccountStore.getState>>) =>
    useAccountStore.getState().setAccount(patch)
  const clearTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  const flush = () => {
    clearTimer()
    if (!currentUid || !remoteReady) return
    const uid = currentUid
    const token = generation
    const entries = Object.entries(useCharacterStore.getState().characters).filter(([, saved]) => saved.dirty)
    if (!entries.length) return
    setStatus({ syncStatus: 'saving', error: null })
    writeChain = writeChain.then(async () => {
      let failure: unknown = null
      for (const [id, saved] of entries) {
        try {
          await setDoc(doc(firestore, 'users', uid, 'characters', id), {
            schemaVersion: 4,
            build: saved.data.build,
            tracker: saved.data.tracker,
            updatedAt: serverTimestamp(),
          })
          markCharacterSynced(userKey(uid), id, saved)
        } catch (error) {
          failure = error
        }
      }
      if (token !== generation) return
      const dirty = Object.values(useCharacterStore.getState().characters).some((saved) => saved.dirty)
      setStatus({
        syncStatus: failure ? 'error' : dirty ? 'saving' : 'saved',
        error: failure ? errorText(failure) : null,
      })
    })
  }

  const queueSave = () => {
    if (!currentUid || !remoteReady) return
    clearTimer()
    setStatus({ syncStatus: 'saving', error: null })
    timer = setTimeout(flush, 500)
  }
  subscribeCharacterChanges(queueSave)

  const loadAccount = async (uid: string, email: string | null, token: number) => {
    const localCharacters = currentUid === uid ? useCharacterStore.getState().characters : readLocalRoster(userKey(uid))
    currentUid = uid
    remoteReady = false
    activateCharacterStorage(userKey(uid), localCharacters)
    setStatus({ uid, email, ready: false, syncStatus: 'loading', error: null })
    try {
      // Do not wait for uploads: Firestore can leave an offline write pending indefinitely.
      // Dirty local entries protect in-flight edits when this read returns an older version.
      const snapshot = await getDocsFromServer(collection(firestore, 'users', uid, 'characters'))
      if (token !== generation) return
      const remote: CharacterRoster = Object.fromEntries(snapshot.docs.map((document) => {
        const value = document.data()
        return [document.id, { data: decodeCharacter(value, value.schemaVersion ?? 3), dirty: false }]
      }))
      const local = { ...useCharacterStore.getState().characters }
      // A read can start before an upload commits but arrive after its acknowledgement.
      // Keep versions that were pending when the read started, even if now marked clean.
      for (const [id, saved] of Object.entries(localCharacters)) {
        if (saved.dirty && local[id]?.data === saved.data) local[id] = saved
      }
      let characters = mergeCharacters(local, remote)
      if (!Object.keys(characters).length) {
        // Import the whole guest roster only into an empty account. Keep the guest backup.
        characters = Object.fromEntries(Object.entries(readLocalRoster(GUEST_KEY))
          .filter(([, saved]) => hasCharacter(saved.data))
          .map(([id, saved]) => [id, { ...saved, dirty: true }]))
      }
      activateCharacterStorage(userKey(uid), characters)
      remoteReady = true
      setStatus({ ready: true, syncStatus: 'saved' })
      if (Object.values(characters).some((saved) => saved.dirty)) queueSave()
    } catch (error) {
      if (token !== generation) return
      remoteReady = false
      setStatus({ ready: true, syncStatus: 'error', error: errorText(error) })
    }
  }

  retry = () => {
    if (!currentUid) return
    clearTimer()
    void loadAccount(currentUid, useAccountStore.getState().email, ++generation)
  }

  onAuthStateChanged(auth, (user) => {
    // Capture pending edits for the old account before switching the local roster.
    flush()
    generation++
    remoteReady = false
    if (user) {
      void loadAccount(user.uid, user.email, generation)
    } else {
      currentUid = null
      activateCharacterStorage(GUEST_KEY)
      setStatus({ uid: null, email: null, ready: true, syncStatus: 'local', error: null })
    }
  }, (error) => {
    clearTimer()
    generation++
    remoteReady = false
    currentUid = null
    activateCharacterStorage(GUEST_KEY)
    setStatus({ uid: null, email: null, ready: true, syncStatus: 'error', error: error.message })
  })

  window.addEventListener('online', () => {
    if (currentUid && useAccountStore.getState().syncStatus === 'error') retry?.()
  })
  // Local saves are synchronous; also start any queued upload when leaving the page.
  window.addEventListener('pagehide', flush)
}
