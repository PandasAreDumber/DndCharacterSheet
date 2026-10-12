// VIEWMODEL. Turns engine output into plain data the components can render directly.

import { CLASSES, SUBCLASSES } from '../data/registry'
import { abilityMod } from '../rules/abilities'
import {
  canAfford,
  currentOf,
  getActions,
  getClass,
  getPassives,
  getResource,
  getResources,
  getSpellModifiers,
  resolveText,
} from '../rules/character'
import { checkEvent, currentState } from '../rules/engine'
import type {
  ActionDef,
  CharacterBuild,
  CharacterState,
  Economy,
  ResourceKind,
  Spell,
  SpellModifierDef,
  Tracker,
} from '../rules/types'

export type ResourceView = { id: string; name: string; kind: ResourceKind; current: number; max: number }

export type CharacterView = {
  build: CharacterBuild
  state: CharacterState
  title: string // "Level 5 Paladin (Oath of Glory)"
  resources: ResourceView[]
  passives: { id: string; name: string; text: string }[]
  actionsByEconomy: Record<Economy, ActionDef[]>
  spellModifiers: SpellModifierDef[]
  spellModifierName: string
  hitDice: { current: number; max: number; die: number; conMod: number }
  canUndo: boolean
}

export function viewCharacter(build: CharacterBuild, tracker: Tracker): CharacterView {
  const state = currentState(build, tracker)
  const cls = getClass(build)
  const sub = build.subclassId ? SUBCLASSES[build.subclassId] : undefined

  const actionsByEconomy: Record<Economy, ActionDef[]> = { action: [], bonus: [], reaction: [], free: [] }
  for (const a of getActions(build)) {
    // Follow ups only show up right after their trigger.
    if (a.after && !state.turn.followUps.includes(a.id)) continue
    actionsByEconomy[a.economy].push(a)
  }

  return {
    build,
    state,
    title: `Level ${build.level} ${cls.name}${sub && build.level >= 3 ? ` (${sub.name})` : ''}`,
    resources: getResources(build).map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      current: currentOf(build, state, r.id),
      max: r.max(build),
    })),
    passives: getPassives(build).map((p) => ({ id: p.id, name: p.name, text: resolveText(p.text, build) })),
    actionsByEconomy,
    spellModifiers: getSpellModifiers(build),
    spellModifierName: cls.spellModifierName ?? 'Spell options',
    hitDice: {
      current: currentOf(build, state, 'hit_dice'),
      max: getResource(build, 'hit_dice')?.max(build) ?? 0,
      die: cls.hitDie,
      conMod: abilityMod(build.abilities.con),
    },
    canUndo: tracker.log.length > 0,
  }
}

export type PaymentView = { id: string; label: string; ok: boolean; reason?: string }

export type ActionView = {
  id: string
  name: string
  note?: string
  spell?: Spell
  isFollowUp: boolean
  payments: PaymentView[] // only ones you can still afford
  spellModifiers: { id: string; label: string }[] // ones that can apply to this action
  variable?: { resourceName: string; min: number; max: number }
  available: boolean
  reason?: string // why nothing is available
}

/** Everything one action row needs, given the choices the player made in that row. */
export function describeAction(
  build: CharacterBuild,
  state: CharacterState,
  action: ActionDef,
  choice: { spellModifiers: string[]; amount?: number },
): ActionView {
  const variable = action.variableCost
    ? {
        resourceName: getResource(build, action.variableCost.resource)?.name ?? action.variableCost.resource,
        min: action.variableCost.min,
        max: currentOf(build, state, action.variableCost.resource),
      }
    : undefined

  // Hide ways to pay you're out of (e.g. slot levels with no slots left). Gray out the rest if blocked.
  const affordable = action.payments.filter((p) => canAfford(build, state, p.costs))
  const payments: PaymentView[] = affordable.map((p) => {
    const check = checkEvent(build, state, {
      type: 'PERFORM_ACTION',
      actionId: action.id,
      paymentId: p.id,
      spellModifiers: choice.spellModifiers,
      ...(variable ? { amount: choice.amount ?? variable.min } : {}),
    })
    return check.ok ? { id: p.id, label: p.label, ok: true } : { id: p.id, label: p.label, ok: false, reason: check.reason }
  })

  const spellModifiers = action.spell
    ? getSpellModifiers(build)
        .filter((m) => !m.economyChange || m.economyChange.from === action.economy)
        .map((m) => ({ id: m.id, label: `${m.name} (${m.costs.map((c) => c.amount).join('+')})` }))
    : []

  const firstBlocked = payments.find((p) => !p.ok)
  const available = payments.some((p) => p.ok)
  const reason = available
    ? undefined
    : (firstBlocked?.reason ?? (action.spell && action.spell.level > 0 ? 'No slots left' : 'None left'))

  return {
    id: action.id,
    name: action.name,
    ...(action.note !== undefined ? { note: resolveText(action.note, build) } : {}),
    ...(action.spell ? { spell: action.spell } : {}),
    isFollowUp: !!action.after,
    payments,
    spellModifiers,
    ...(variable ? { variable } : {}),
    available,
    ...(reason ? { reason } : {}),
  }
}

// ---------- Options for the setup form ----------

export const classOptions = Object.values(CLASSES).map((c) => ({ id: c.id, name: c.name }))

export function subclassOptions(classId: string) {
  return Object.values(SUBCLASSES)
    .filter((s) => s.classId === classId)
    .map((s) => ({ id: s.id, name: s.name }))
}

export function spellModifierOptions(classId: string) {
  const cls = CLASSES[classId]
  return {
    name: cls?.spellModifierName ?? 'Spell options',
    options: (cls?.spellModifiers ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      cost: m.costs.map((c) => c.amount).join(' + '),
    })),
  }
}
