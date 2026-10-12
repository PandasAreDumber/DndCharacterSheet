// VIEWMODEL. Holds the build and the event log, saves them to localStorage,
// and turns UI intents into engine events. No rules math happens here.

import { create } from 'zustand'
import { abilityMod } from '../rules/abilities'
import { changeBuild, compact, dispatch, newTracker, undo } from '../rules/engine'
import type { CharacterBuild, GameEvent, Spell, Tracker } from '../rules/types'

export type CharacterData = { build: CharacterBuild | null; tracker: Tracker | null }
export type LocalCharacter = { data: CharacterData; dirty: boolean }

export const GUEST_KEY = 'dnd-combat-tracker'
export const userKey = (uid: string) => `dnd-combat-tracker-user-${uid}`
const emptyCharacter = (): CharacterData => ({ build: null, tracker: null })

// Existing guest saves use Zustand's old { state, version } shape.
export function readLocalCharacter(key: string): LocalCharacter {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { data: emptyCharacter(), dirty: false }
    const saved = JSON.parse(raw) as {
      version?: number
      state?: CharacterData
      data?: CharacterData
      dirty?: boolean
    }
    const data = saved.data ?? saved.state
    if (!data || !('build' in data) || !('tracker' in data)) throw new Error('Invalid save')
    let build = data.build
    if (build && (saved.version ?? 0) < 2) build = { ...build, speciesId: null, lineageId: null }
    if (build && (saved.version ?? 0) < 3) build = { ...build, ac: 10 + abilityMod(build.abilities.dex) }
    return { data: { build, tracker: data.tracker }, dirty: !!saved.dirty }
  } catch {
    return { data: emptyCharacter(), dirty: false }
  }
}

export function writeLocalCharacter(key: string, data: CharacterData, dirty: boolean): void {
  try {
    localStorage.setItem(key, JSON.stringify({ version: 3, data, dirty }))
  } catch {
    // Browser storage may be unavailable or full. Firestore can still save signed-in data.
  }
}

// Keep the log short enough to replay quickly. Older events get folded into the base.
const MAX_LOG = 300
const KEEP_LOG = 150

export type Message = { kind: 'error' | 'warning'; text: string; id: number }

type CharacterStore = {
  build: CharacterBuild | null
  tracker: Tracker | null
  message: Message | null

  saveBuild: (build: CharacterBuild) => void
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
let dirty = false
let switching = false
const initial = readLocalCharacter(GUEST_KEY)
const listeners = new Set<(data: CharacterData) => void>()

export const useCharacterStore = create<CharacterStore>()((set, get) => ({
      build: initial.data.build,
      tracker: initial.data.tracker,
      message: null,

      saveBuild: (build) => {
        const { build: old, tracker } = get()
        set({ build, tracker: old && tracker ? changeBuild(old, build, tracker) : newTracker(build), message: null })
      },

      deleteCharacter: () => set({ build: null, tracker: null, message: null }),

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
  if (switching || (state.build === previous.build && state.tracker === previous.tracker)) return
  const data = { build: state.build, tracker: state.tracker }
  dirty = storageKey !== GUEST_KEY
  writeLocalCharacter(storageKey, data, dirty)
  for (const listener of listeners) listener(data)
})

/** Switch the visible character and its local save together, without crossing accounts. */
export function activateCharacterStorage(key: string, saved = readLocalCharacter(key)): void {
  switching = true
  storageKey = key
  dirty = saved.dirty
  useCharacterStore.setState({ ...saved.data, message: null })
  writeLocalCharacter(key, saved.data, dirty)
  switching = false
}

export function markCharacterSynced(data: CharacterData): void {
  const current = useCharacterStore.getState()
  if (current.build !== data.build || current.tracker !== data.tracker) return
  dirty = false
  writeLocalCharacter(storageKey, data, false)
}

export function subscribeCharacterChanges(listener: (data: CharacterData) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
