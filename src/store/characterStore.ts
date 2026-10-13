// VIEWMODEL. Holds the build and the event log, saves them to localStorage,
// and turns UI intents into engine events. No rules math happens here.

import { create } from 'zustand'
import { changeBuild, compact, dispatch, newTracker, undo } from '../rules/engine'
import type { CharacterBuild, GameEvent, Spell, Tracker } from '../rules/types'
import {
  GUEST_KEY, emptyCharacter, hasCharacter, readLocalRoster, writeLocalRoster,
  type CharacterRoster, type LocalCharacter,
} from './characterStorage'

// Keep the log short enough to replay quickly. Older events get folded into the base.
const MAX_LOG = 300
const KEEP_LOG = 150

export type Message = { kind: 'error' | 'warning'; text: string; id: number }

type CharacterStore = {
  characters: CharacterRoster
  activeId: string | null
  build: CharacterBuild | null
  tracker: Tracker | null
  message: Message | null

  saveBuild: (build: CharacterBuild) => void
  createCharacter: (build: CharacterBuild) => string
  selectCharacter: (id: string) => boolean
  deleteCharacter: () => void
  /** Adds (or replaces, by name) a spell mid-session. Keeps the undo history. */
  addSpell: (spell: Spell) => boolean

  /**
   * Sends an event to the engine. Returns false (and shows why) if it isn't allowed.
   * `quiet` skips showing warnings, for when the UI already confirmed them with the player.
   */
  send: (event: GameEvent, opts?: { quiet?: boolean }) => boolean
  perform: (actionId: string, paymentId: string, opts?: { amount?: number; spellModifiers?: string[] }) => boolean
  markUsed: (economy: 'action' | 'bonus' | 'reaction') => boolean
  newTurn: () => void
  shortRest: (hitDice?: { count: number; healing: number }) => boolean
  longRest: () => void
  damage: (amount: number) => boolean
  heal: (amount: number) => boolean
  setTempHp: (amount: number) => boolean
  endEffect: (effectId: number) => boolean
  dismissFollowUps: () => void
  applyAfterCast: (modifierId: string) => boolean
  skipAfterCast: () => void
  undo: () => void
  clearMessage: () => void
}

let messageId = 0
const message = (kind: Message['kind'], text: string): Message => ({ kind, text, id: ++messageId })

let storageKey = GUEST_KEY
let switching = false
const listeners = new Set<() => void>()

export const useCharacterStore = create<CharacterStore>()((set, get) => ({
      characters: readLocalRoster(GUEST_KEY),
      activeId: null,
      build: null,
      tracker: null,
      message: null,

      createCharacter: (build) => {
        const id = crypto.randomUUID()
        const data = { build, tracker: newTracker(build) }
        set({
          characters: { ...get().characters, [id]: { data, dirty: storageKey !== GUEST_KEY } },
          activeId: id, ...data, message: null,
        })
        return id
      },
      selectCharacter: (id) => {
        const saved = get().characters[id]
        if (!saved || !hasCharacter(saved.data)) return false
        set({ activeId: id, ...saved.data, message: null })
        return true
      },
      saveBuild: (build) => {
        if (!get().activeId) { get().createCharacter(build); return }
        const { build: old, tracker } = get()
        set({ build, tracker: old && tracker ? changeBuild(old, build, tracker) : newTracker(build), message: null })
      },

      deleteCharacter: () => {
        const { activeId, characters } = get()
        if (!activeId) return
        // Persist the deletion until every device can learn about it from Firestore.
        set({
          characters: { ...characters, [activeId]: { data: emptyCharacter(), dirty: storageKey !== GUEST_KEY } },
          activeId: null, ...emptyCharacter(), message: null,
        })
      },

      addSpell: (spell) => {
        const { build } = get()
        const name = spell.name.trim()
        if (!build || !name || !Number.isInteger(spell.level) || spell.level < 0 || spell.level > 9) return false
        const lower = name.toLowerCase()
        // Adding a spell only adds options, so past events still replay the same way.
        // That's why this skips changeBuild and keeps the log (and undo) intact.
        set({
          build: { ...build, spells: [...build.spells.filter((s) => s.name.toLowerCase() !== lower), { ...spell, name }] },
          message: null,
        })
        return true
      },

      send: (event, opts = {}) => {
        const { build, tracker } = get()
        if (!build || !tracker) return false
        const result = dispatch(build, tracker, event)
        if (!result.ok) {
          set({ message: message('error', result.reason) })
          return false
        }
        let next = result.tracker
        if (next.log.length > MAX_LOG) next = compact(build, next, KEEP_LOG)
        set({
          tracker: next,
          message: result.warnings.length && !opts.quiet ? message('warning', result.warnings.join(' ')) : null,
        })
        return true
      },

      // Action rows confirm warnings (like concentration) before calling this.
      perform: (actionId, paymentId, opts = {}) =>
        get().send({ type: 'PERFORM_ACTION', actionId, paymentId, ...opts }, { quiet: true }),
      markUsed: (economy) => get().send({ type: 'USE_ECONOMY', economy }),
      newTurn: () => {
        get().send({ type: 'NEW_TURN' })
      },
      shortRest: (hitDice) => get().send(hitDice ? { type: 'SHORT_REST', hitDice } : { type: 'SHORT_REST' }),
      longRest: () => {
        get().send({ type: 'LONG_REST' })
      },
      damage: (amount) => get().send({ type: 'DAMAGE', amount }),
      heal: (amount) => get().send({ type: 'HEAL', amount }),
      setTempHp: (amount) => get().send({ type: 'SET_TEMP_HP', amount }),
      endEffect: (effectId) => get().send({ type: 'END_EFFECT', effectId }),
      dismissFollowUps: () => {
        get().send({ type: 'DISMISS_FOLLOW_UPS' })
      },
      applyAfterCast: (modifierId) => get().send({ type: 'AFTER_CAST_MODIFIER', modifierId }),
      skipAfterCast: () => {
        get().send({ type: 'SKIP_AFTER_CAST' })
      },
      undo: () => {
        const { tracker } = get()
        if (tracker && tracker.log.length > 0) set({ tracker: undo(tracker), message: null })
      },
      clearMessage: () => set({ message: null }),
    }))

useCharacterStore.subscribe((state, previous) => {
  if (switching) return
  if (state.activeId && state.activeId === previous.activeId &&
      (state.build !== previous.build || state.tracker !== previous.tracker)) {
    useCharacterStore.setState({ characters: {
      ...state.characters,
      [state.activeId]: { data: { build: state.build, tracker: state.tracker }, dirty: storageKey !== GUEST_KEY },
    } })
    return
  }
  if (state.characters === previous.characters) return
  writeLocalRoster(storageKey, state.characters)
  for (const listener of listeners) listener()
})

/** Account changes clear the selection. Refreshing the same account keeps a valid selection. */
export function activateCharacterStorage(key: string, characters = readLocalRoster(key)): void {
  const previousId = key === storageKey ? useCharacterStore.getState().activeId : null
  const saved = previousId ? characters[previousId] : null
  const activeId = saved && hasCharacter(saved.data) ? previousId : null
  switching = true
  storageKey = key
  useCharacterStore.setState({ characters, activeId, ...(activeId && saved ? saved.data : emptyCharacter()), message: null })
  writeLocalRoster(key, characters)
  switching = false
}

export function markCharacterSynced(key: string, id: string, saved: LocalCharacter): void {
  if (key !== storageKey) {
    const cached = readLocalRoster(key)
    // An upload may finish after logout. Clear only the exact persisted version it saved.
    if (cached[id]?.dirty && JSON.stringify(cached[id].data) === JSON.stringify(saved.data)) {
      writeLocalRoster(key, { ...cached, [id]: { ...cached[id], dirty: false } })
    }
    return
  }
  const { characters } = useCharacterStore.getState()
  if (characters[id] !== saved) return
  switching = true
  const next = { ...characters, [id]: { ...saved, dirty: false } }
  useCharacterStore.setState({ characters: next })
  writeLocalRoster(key, next)
  switching = false
}

export function subscribeCharacterChanges(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
