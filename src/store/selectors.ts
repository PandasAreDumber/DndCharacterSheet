// VIEWMODEL. Turns engine output into plain data the components can render directly.

import { CLASSES, SPECIES, SUBCLASSES } from '../data/registry'
import { abilityMod } from '../rules/abilities'
import {
  canAfford,
  currentOf,
  getAction,
  getActions,
  getClass,
  getPassives,
  getResource,
  getResources,
  getSpellModifiers,
  modifierProblem,
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
  title: string // "Level 5 Orc Paladin (Oath of Glory)"
  speciesLine: string | null // "Goliath, Storm Giant"
  resources: ResourceView[]
  passives: { id: string; name: string; text: string }[]
  actionsByEconomy: Record<Economy, ActionDef[]> // follow ups are not in here
  followUps: ActionDef[] // unlocked by the last action, shown as a prompt
  concentration: string | null // name of the effect being concentrated on
  spellModifiers: ModifierView[] // the ones the player picked and has the level for
  spellModifierName: string
  /** Right after a spell: modifiers the player can still use on it (Seeking Spell). Null if none. */
  afterCast: { spellName: string; modifiers: ModifierView[] } | null
  hitDice: { current: number; max: number; die: number; conMod: number }
  canUndo: boolean
}

export function viewCharacter(build: CharacterBuild, tracker: Tracker): CharacterView {
  const state = currentState(build, tracker)
  const cls = getClass(build)
  const sub = build.subclassId ? SUBCLASSES[build.subclassId] : undefined
  const species = build.speciesId ? SPECIES[build.speciesId] : undefined
  const lineage = species?.lineages.find((l) => l.id === build.lineageId)

  const actionsByEconomy: Record<Economy, ActionDef[]> = { action: [], bonus: [], reaction: [], free: [] }
  const followUps: ActionDef[] = []
  for (const a of getActions(build)) {
    if (!a.after) actionsByEconomy[a.economy].push(a)
    // Only prompt for follow ups the player can actually pay for.
    else if (state.turn.followUps.includes(a.id) && a.payments.some((p) => canAfford(build, state, p.costs)))
      followUps.push(a)
  }

  return {
    build,
    state,
    title: `Level ${build.level} ${species ? `${species.name} ` : ''}${cls.name}${sub && build.level >= subclassLevel(cls.id) ? ` (${sub.name})` : ''}`,
    speciesLine: lineage ? `${species?.lineageLabel ?? 'Lineage'}: ${lineage.name}` : null,
    resources: getResources(build).map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      current: currentOf(build, state, r.id),
      max: r.max(build),
    })),
    passives: getPassives(build).map((p) => ({ id: p.id, name: p.name, text: resolveText(p.text, build) })),
    actionsByEconomy,
    followUps,
    concentration: state.effects.find((e) => e.concentration)?.name ?? null,
    spellModifiers: getSpellModifiers(build).map(modifierView),
    spellModifierName: cls.spellModifierName ?? 'Spell options',
    afterCast: afterCastView(build, state),
    hitDice: {
      current: currentOf(build, state, 'hit_dice'),
      max: getResource(build, 'hit_dice')?.max(build) ?? 0,
      die: cls.hitDie,
      conMod: abilityMod(build.abilities.con),
    },
    canUndo: tracker.log.length > 0,
  }
}

/** An action's note as plain text (some notes are formulas of the build). */
export function actionNote(build: CharacterBuild, action: ActionDef): string {
  return action.note === undefined ? '' : resolveText(action.note, build)
}

/** A spell modifier (Metamagic option) ready to show, with its info popup text. */
export type ModifierView = { id: string; name: string; cost: string; description?: string; minLevel: number }

function modifierView(m: SpellModifierDef): ModifierView {
  const cost = m.costs.map((c) => c.amount).join(' + ')
  return { id: m.id, name: m.name, cost, minLevel: m.minLevel, ...(m.description ? { description: m.description } : {}) }
}

function afterCastView(build: CharacterBuild, state: CharacterState): CharacterView['afterCast'] {
  const spell = state.turn.lastSpell ? getAction(build, state.turn.lastSpell) : undefined
  if (!spell) return null
  const modifiers = getSpellModifiers(build)
    .filter((m) => m.afterCast && checkEvent(build, state, { type: 'AFTER_CAST_MODIFIER', modifierId: m.id }).ok)
    .map(modifierView)
  return modifiers.length ? { spellName: spell.name, modifiers } : null
}

export type PaymentView = { id: string; label: string; ok: boolean; reason?: string; warnings: string[] }

export type ActionView = {
  id: string
  name: string
  note?: string
  spell?: Spell
  isFollowUp: boolean
  payments: PaymentView[] // only ones you can still afford
  spellModifiers: ModifierView[] // ones that can apply to this action
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
    return check.ok
      ? { id: p.id, label: p.label, ok: true, warnings: check.warnings }
      : { id: p.id, label: p.label, ok: false, reason: check.reason, warnings: [] }
  })

  const spellModifiers = action.spell
    ? getSpellModifiers(build)
        .filter((m) => !m.afterCast && !modifierProblem(m, action))
        .map(modifierView)
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

export function subclassLevel(classId: string): number {
  return CLASSES[classId]?.subclassLevel ?? 3
}

export function subclassOptions(classId: string) {
  return Object.values(SUBCLASSES)
    .filter((s) => s.classId === classId)
    .map((s) => ({ id: s.id, name: s.name }))
}

export const speciesOptions = Object.values(SPECIES).map((s) => ({
  id: s.id,
  name: s.name,
  lineageLabel: s.lineageLabel ?? 'Lineage',
  lineages: s.lineages.map((l) => ({ id: l.id, name: l.name })),
}))

export function spellModifierOptions(classId: string) {
  const cls = CLASSES[classId]
  return {
    name: cls?.spellModifierName ?? 'Spell options',
    options: (cls?.spellModifiers ?? []).map(modifierView),
    unlockLevel: Math.min(...(cls?.spellModifiers ?? []).map((m) => m.minLevel)),
  }
}
