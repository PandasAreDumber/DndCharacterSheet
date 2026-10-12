// VIEWMODEL. Holds the build and the event log, saves them to localStorage,
// and turns UI intents into engine events. No rules math happens here.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { changeBuild, compact, dispatch, newTracker, undo } from '../rules/engine'
import type { CharacterBuild, GameEvent, Spell, Tracker } from '../rules/types'

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

export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set, get) => ({
      build: null,
      tracker: null,
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
    }),
    {
      name: 'dnd-combat-tracker',
      version: 2,
      // Saves from older versions of the app get the fields they're missing.
      migrate: (persisted, version) => {
        const saved = persisted as { build: CharacterBuild | null; tracker: Tracker | null }
        if (version < 2 && saved.build) {
          saved.build = { ...saved.build, speciesId: null, lineageId: null }
        }
        return saved
      },
      // Only the data is saved. Messages are temporary.
      partialize: (s) => ({ build: s.build, tracker: s.tracker }),
    },
  ),
)
