// The rules engine. Pure functions: (build, state, event) -> new state.
// Every state change is an event in a log, so undo is just dropping the last event.

import { canAfford, currentOf, getAction, getActions, getResource, getResources, getSpellModifiers, resolveText } from './character'
import type {
  ActionDef,
  CharacterBuild,
  CharacterState,
  Check,
  Cost,
  Economy,
  GameEvent,
  PaymentOption,
  SpellModifierDef,
  Tracker,
} from './types'

type PerformEvent = Extract<GameEvent, { type: 'PERFORM_ACTION' }>

const ECONOMY_LABEL: Record<Exclude<Economy, 'free'>, string> = {
  action: 'Action',
  bonus: 'Bonus action',
  reaction: 'Reaction',
}

const fail = (reason: string): Check => ({ ok: false, reason })
const ok = (warnings: string[] = []): Check => ({ ok: true, warnings })

export function initialState(build: CharacterBuild): CharacterState {
  return {
    expended: {},
    hp: { current: build.maxHp, temp: 0 },
    turn: freshTurn(),
    effects: [],
    nextEffectId: 1,
  }
}

function freshTurn(): CharacterState['turn'] {
  return { action: false, bonus: false, reaction: false, slotSpellCast: false, followUps: [] }
}

export function newTracker(build: CharacterBuild): Tracker {
  return { base: initialState(build), log: [] }
}

// ---------- Performing actions ----------

type ResolvedPerform = {
  action: ActionDef
  payment: PaymentOption
  modifiers: SpellModifierDef[]
  economy: Economy
  costs: Cost[]
  usesSlot: boolean
}

/** Works out everything about a PERFORM_ACTION, or why it isn't allowed. */
function resolvePerform(
  build: CharacterBuild,
  state: CharacterState,
  ev: PerformEvent,
): { ok: true; value: ResolvedPerform } | { ok: false; reason: string } {
  const no = (reason: string) => ({ ok: false as const, reason })

  const action = getAction(build, ev.actionId)
  if (!action) return no('Unknown action')
  if (action.after && !state.turn.followUps.includes(action.id)) {
    return no('Only available right after its trigger')
  }

  const payment = action.payments.find((p) => p.id === ev.paymentId)
  if (!payment) return no('Unknown payment option')
  if (payment.onlyWhenEmpty && currentOf(build, state, payment.onlyWhenEmpty) > 0) {
    return no('Only when out of regular uses')
  }

  // Spell modifiers (Metamagic)
  const known = getSpellModifiers(build)
  const modifiers: SpellModifierDef[] = []
  for (const id of ev.spellModifiers ?? []) {
    const m = known.find((k) => k.id === id)
    if (!m) return no(`Unknown spell modifier: ${id}`)
    if (!action.spell) return no(`${m.name} only works on spells`)
    modifiers.push(m)
  }
  if (modifiers.filter((m) => !m.combinable).length > 1) return no('Only one of those per spell')

  let economy = action.economy
  for (const m of modifiers) {
    if (m.economyChange) {
      if (m.economyChange.from !== economy) return no(`${m.name} doesn't apply to this spell`)
      economy = m.economyChange.to
    }
  }
  if (economy !== 'free' && state.turn[economy]) return no(`${ECONOMY_LABEL[economy]} already used`)

  // 2024: only one spell slot spent on spells per turn.
  const usesSlot = !!action.spell && payment.costs.some((c) => getResource(build, c.resource)?.kind === 'spellSlot')
  // TODO(rules): the rule applies on any creature's turn, but the tracker only knows "my turn".
  // Reaction spells skip the check so a reaction on an enemy's turn isn't wrongly blocked.
  if (usesSlot && state.turn.slotSpellCast && economy !== 'reaction') {
    return no('Already spent a spell slot on a spell this turn')
  }

  const costs: Cost[] = [...payment.costs, ...modifiers.flatMap((m) => m.costs)]
  if (action.variableCost) {
    const amount = ev.amount
    if (amount === undefined || !Number.isInteger(amount) || amount < action.variableCost.min) {
      return no(`Pick an amount of at least ${action.variableCost.min}`)
    }
    costs.push({ resource: action.variableCost.resource, amount })
  }

  if (!canAfford(build, state, costs)) {
    const short = costs.find((c) => !canAfford(build, state, costs.filter((x) => x.resource === c.resource)))
    return no(`Not enough ${short ? (getResource(build, short.resource)?.name ?? short.resource) : 'resources'}`)
  }
  for (const g of payment.gains ?? []) {
    if (!getResource(build, g.resource)) return no(`You don't have ${g.resource}`)
  }

  return { ok: true, value: { action, payment, modifiers, economy, costs, usesSlot } }
}

function checkPerform(build: CharacterBuild, state: CharacterState, ev: PerformEvent): Check {
  const r = resolvePerform(build, state, ev)
  if (!r.ok) return fail(r.reason)
  const warnings: string[] = []
  const conc = state.effects.find((e) => e.concentration)
  if (r.value.action.effect?.concentration && conc) {
    warnings.push(`You're concentrating on ${conc.name}. Casting this ends it.`)
  }
  return ok(warnings)
}

function applyPerform(build: CharacterBuild, state: CharacterState, ev: PerformEvent): CharacterState {
  const r = resolvePerform(build, state, ev)
  if (!r.ok) throw new Error(r.reason)
  const { action, payment, economy, costs, usesSlot } = r.value

  const expended = { ...state.expended }
  for (const c of costs) expended[c.resource] = (expended[c.resource] ?? 0) + c.amount
  for (const g of payment.gains ?? []) {
    const after = (expended[g.resource] ?? 0) - g.amount
    // Negative expended = above max. Only allowed for gains that say so (created slots).
    expended[g.resource] = g.canExceedMax ? after : Math.max(0, after)
  }

  const turn = { ...state.turn }
  if (economy !== 'free') turn[economy] = true
  if (usesSlot) turn.slotSpellCast = true
  turn.followUps = getActions(build)
    .filter((a) => a.after === action.id)
    .map((a) => a.id)

  let effects = state.effects
  let nextEffectId = state.nextEffectId
  if (action.effect) {
    const concentration = !!action.effect.concentration
    // Starting a new concentration effect ends the old one.
    effects = concentration ? effects.filter((e) => !e.concentration) : [...effects]
    effects.push({
      id: nextEffectId++,
      name: action.effect.name,
      duration: resolveText(action.effect.duration, build),
      concentration,
      sourceActionId: action.id,
      ...(action.effect.endsOnNewTurn ? { endsOnNewTurn: true } : {}),
    })
  }

  const hp = { ...state.hp }
  if (action.tempHp) hp.temp = Math.max(hp.temp, action.tempHp(build))
  if (action.heal) hp.current = Math.min(build.maxHp, hp.current + action.heal(build))

  return { ...state, expended, hp, turn, effects, nextEffectId }
}

// ---------- Rests ----------

function applyRest(build: CharacterBuild, state: CharacterState, rest: 'short' | 'long'): CharacterState {
  const expended = { ...state.expended }
  for (const r of getResources(build)) {
    const rule = r.recharge[rest]
    const used = expended[r.id] ?? 0
    if (!rule) continue
    if (rule.type === 'all') {
      // Long rest also wipes anything above max (created slots vanish).
      expended[r.id] = rest === 'long' ? 0 : Math.min(used, 0)
    } else if (used > 0) {
      if (rule.limitedBy) {
        const limiterLeft = (getResource(build, rule.limitedBy)?.max(build) ?? 0) - (expended[rule.limitedBy] ?? 0)
        if (limiterLeft <= 0) continue
        expended[rule.limitedBy] = (expended[rule.limitedBy] ?? 0) + 1
      }
      expended[r.id] = Math.max(0, used - rule.amount(build))
    }
  }
  return {
    ...state,
    expended,
    hp: rest === 'long' ? { current: build.maxHp, temp: 0 } : state.hp,
    turn: freshTurn(),
    effects: [], // rests take at least an hour; tracked effects are assumed over
  }
}

// ---------- Public API ----------

const isNonNegInt = (n: number) => Number.isInteger(n) && n >= 0

/** Is this event allowed right now? Use this to gray things out in the UI. */
export function checkEvent(build: CharacterBuild, state: CharacterState, ev: GameEvent): Check {
  switch (ev.type) {
    case 'PERFORM_ACTION':
      return checkPerform(build, state, ev)
    case 'USE_ECONOMY':
      return state.turn[ev.economy] ? fail(`${ECONOMY_LABEL[ev.economy]} already used`) : ok()
    case 'SHORT_REST': {
      if (!ev.hitDice) return ok()
      const { count, healing } = ev.hitDice
      if (!isNonNegInt(count) || !isNonNegInt(healing)) return fail('Use whole numbers')
      return currentOf(build, state, 'hit_dice') >= count ? ok() : fail('Not enough hit point dice')
    }
    case 'DAMAGE':
    case 'HEAL':
    case 'SET_TEMP_HP':
      return isNonNegInt(ev.amount) ? ok() : fail('Amount must be a whole number')
    case 'END_EFFECT':
      return state.effects.some((e) => e.id === ev.effectId) ? ok() : fail('No such effect')
    case 'DISMISS_FOLLOW_UPS':
      return state.turn.followUps.length > 0 ? ok() : fail('Nothing to skip')
    case 'NEW_TURN':
    case 'LONG_REST':
      return ok()
  }
}

/** Applies an event. Assumes it was checked; throws if it is invalid. */
export function applyEvent(build: CharacterBuild, state: CharacterState, ev: GameEvent): CharacterState {
  const cleared = { ...state, turn: { ...state.turn, followUps: [] } }
  switch (ev.type) {
    case 'PERFORM_ACTION':
      return applyPerform(build, state, ev)
    case 'USE_ECONOMY':
      return { ...cleared, turn: { ...cleared.turn, [ev.economy]: true } }
    case 'DISMISS_FOLLOW_UPS':
      return cleared
    case 'NEW_TURN':
      return { ...state, turn: freshTurn(), effects: state.effects.filter((e) => !e.endsOnNewTurn) }
    case 'SHORT_REST': {
      if (!ev.hitDice || ev.hitDice.count === 0) return applyRest(build, state, 'short')
      const spent: CharacterState = {
        ...state,
        expended: { ...state.expended, hit_dice: (state.expended.hit_dice ?? 0) + ev.hitDice.count },
        hp: { ...state.hp, current: Math.min(build.maxHp, state.hp.current + ev.hitDice.healing) },
      }
      return applyRest(build, spent, 'short')
    }
    case 'LONG_REST':
      return applyRest(build, state, 'long')
    case 'DAMAGE': {
      const fromTemp = Math.min(state.hp.temp, ev.amount)
      return {
        ...state,
        hp: { temp: state.hp.temp - fromTemp, current: Math.max(0, state.hp.current - (ev.amount - fromTemp)) },
      }
    }
    case 'HEAL':
      return { ...state, hp: { ...state.hp, current: Math.min(build.maxHp, state.hp.current + ev.amount) } }
    case 'SET_TEMP_HP':
      // Temp HP doesn't stack: the new value replaces the old one. The UI lets the player choose.
      return { ...state, hp: { ...state.hp, temp: ev.amount } }
    case 'END_EFFECT':
      return { ...state, effects: state.effects.filter((e) => e.id !== ev.effectId) }
  }
}

/** Current state = base with every logged event applied. */
export function currentState(build: CharacterBuild, tracker: Tracker): CharacterState {
  return tracker.log.reduce((s, ev) => applyEvent(build, s, ev), tracker.base)
}

/** Checks the event and appends it to the log if allowed. */
export function dispatch(
  build: CharacterBuild,
  tracker: Tracker,
  ev: GameEvent,
): { ok: true; tracker: Tracker; warnings: string[] } | { ok: false; reason: string } {
  const check = checkEvent(build, currentState(build, tracker), ev)
  if (!check.ok) return check
  return { ok: true, tracker: { ...tracker, log: [...tracker.log, ev] }, warnings: check.warnings }
}

export function undo(tracker: Tracker): Tracker {
  return { ...tracker, log: tracker.log.slice(0, -1) }
}

/**
 * Use when the player edits their build. Keeps what's been spent so far.
 * Changing class starts fresh, since the old resources don't exist anymore.
 */
export function changeBuild(oldBuild: CharacterBuild, newBuild: CharacterBuild, tracker: Tracker): Tracker {
  if (oldBuild.classId !== newBuild.classId) return newTracker(newBuild)
  const { base } = compact(oldBuild, tracker)
  return {
    base: { ...base, hp: { ...base.hp, current: Math.min(base.hp.current, newBuild.maxHp) } },
    log: [],
  }
}

/**
 * Folds old events into the base so the log doesn't grow forever.
 * Keeps the last `keep` events undoable. Also use with keep = 0 before changing the build.
 */
export function compact(build: CharacterBuild, tracker: Tracker, keep = 0): Tracker {
  const cut = Math.max(0, tracker.log.length - keep)
  const folded = tracker.log.slice(0, cut).reduce((s, ev) => applyEvent(build, s, ev), tracker.base)
  return { base: folded, log: tracker.log.slice(cut) }
}
