// VIEWMODEL. Holds the build and the event log, saves them to localStorage,
// and turns UI intents into engine events. No rules math happens here.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { changeBuild, compact, dispatch, newTracker, undo } from '../rules/engine'
import type { CharacterBuild, GameEvent, Tracker } from '../rules/types'

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

  /** Sends an event to the engine. Returns false (and shows why) if it isn't allowed. */
  send: (event: GameEvent) => boolean
  perform: (actionId: string, paymentId: string, opts?: { amount?: number; spellModifiers?: string[] }) => boolean
  markUsed: (economy: 'action' | 'bonus' | 'reaction') => boolean
  newTurn: () => void
  shortRest: (hitDice?: { count: number; healing: number }) => boolean
  longRest: () => void
  damage: (amount: number) => boolean
  heal: (amount: number) => boolean
  setTempHp: (amount: number) => boolean
  endEffect: (effectId: number) => boolean
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

      send: (event) => {
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
          message: result.warnings.length ? message('warning', result.warnings.join(' ')) : null,
        })
        return true
      },

      perform: (actionId, paymentId, opts = {}) =>
        get().send({ type: 'PERFORM_ACTION', actionId, paymentId, ...opts }),
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
      undo: () => {
        const { tracker } = get()
        if (tracker && tracker.log.length > 0) set({ tracker: undo(tracker), message: null })
      },
      clearMessage: () => set({ message: null }),
    }),
    {
      name: 'dnd-combat-tracker',
      version: 1,
      // Only the data is saved. Messages are temporary.
      partialize: (s) => ({ build: s.build, tracker: s.tracker }),
    },
  ),
)
