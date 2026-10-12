// Turns a CharacterBuild + class data into the resources, actions and passives the character has right now.

import { BASIC_ACTIONS } from '../data/basicActions'
import { CLASSES, SPECIES, SUBCLASSES } from '../data/registry'
import type {
  ActionDef,
  CastingTime,
  CharacterBuild,
  CharacterState,
  ClassDef,
  Cost,
  Economy,
  FeatureSet,
  PassiveDef,
  PaymentOption,
  ResourceDef,
  ResourceId,
  Spell,
  SpellModifierDef,
  TextFormula,
} from './types'

export function slotId(level: number): ResourceId {
  return `slot_${level}`
}

export function spellActionId(name: string): string {
  return `spell:${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

export function resolveText(text: TextFormula, build: CharacterBuild): string {
  return typeof text === 'function' ? text(build) : text
}

export function getClass(build: CharacterBuild): ClassDef {
  const cls = CLASSES[build.classId]
  if (!cls) throw new Error(`Unknown class: ${build.classId}`)
  return cls
}

function featureSets(build: CharacterBuild): FeatureSet[] {
  const cls = getClass(build)
  const sub = build.subclassId ? SUBCLASSES[build.subclassId] : undefined
  const species = build.speciesId ? SPECIES[build.speciesId] : undefined
  const lineage = species?.lineages.find((l) => l.id === build.lineageId)
  // Everyone gets the basic actions, then class, subclass, species and lineage.
  const sets: (FeatureSet | undefined)[] = [
    BASIC_ACTIONS,
    cls,
    sub && sub.classId === cls.id ? sub : undefined,
    species,
    lineage,
  ]
  return sets.filter((s): s is FeatureSet => !!s)
}

function slotResources(table: number[][]): ResourceDef[] {
  const highest = Math.max(...table.map((row) => row.length))
  const resources: ResourceDef[] = []
  for (let level = 1; level <= highest; level++) {
    resources.push({
      id: slotId(level),
      name: `Level ${level} slots`,
      kind: 'spellSlot',
      slotLevel: level,
      max: (b) => {
        const row = table[Math.min(Math.max(b.level, 1), table.length) - 1]
        return row?.[level - 1] ?? 0
      },
      recharge: { long: { type: 'all' } },
    })
  }
  return resources
}

/** Every resource the character has (max above 0). */
export function getResources(build: CharacterBuild): ResourceDef[] {
  const cls = getClass(build)
  const hitDice: ResourceDef = {
    id: 'hit_dice',
    name: `Hit Point Dice (d${cls.hitDie})`,
    kind: 'hitDice',
    max: (b) => b.level,
    recharge: { long: { type: 'all' } }, // 2024: long rest restores all of them
  }
  return [...slotResources(cls.slotTable), hitDice, ...featureSets(build).flatMap((s) => s.resources)].filter(
    (r) => r.max(build) > 0,
  )
}

export function getResource(build: CharacterBuild, id: ResourceId): ResourceDef | undefined {
  return getResources(build).find((r) => r.id === id)
}

export function maxOf(build: CharacterBuild, id: ResourceId): number {
  return getResource(build, id)?.max(build) ?? 0
}

/** Current = max - expended. Can be above max for created slots, never below 0. */
export function currentOf(build: CharacterBuild, state: CharacterState, id: ResourceId): number {
  return Math.max(0, maxOf(build, id) - (state.expended[id] ?? 0))
}

/** True if the character has enough of every resource in these costs. */
export function canAfford(build: CharacterBuild, state: CharacterState, costs: Cost[]): boolean {
  const totals = new Map<string, number>()
  for (const c of costs) totals.set(c.resource, (totals.get(c.resource) ?? 0) + c.amount)
  return [...totals].every(([resource, amount]) => currentOf(build, state, resource) >= amount)
}

function economyFor(castingTime: CastingTime): Economy {
  // "other" (e.g. 1 minute casting times) doesn't use the combat turn economy.
  return castingTime === 'other' ? 'free' : castingTime
}

function spellAction(
  build: CharacterBuild,
  spell: Spell,
  extraPayments: PaymentOption[] = [],
  note?: TextFormula,
): ActionDef {
  const payments: PaymentOption[] =
    spell.level === 0
      ? [{ id: 'cantrip', label: 'Cantrip', costs: [] }]
      : getResources(build)
          .filter((r) => r.kind === 'spellSlot' && (r.slotLevel ?? 0) >= spell.level)
          .map((r) => ({
            id: r.id,
            label: `Level ${r.slotLevel} slot`,
            costs: [{ resource: r.id, amount: 1 }],
            castLevel: r.slotLevel,
          }))
  const finalNote = note ?? spell.note
  return {
    id: spellActionId(spell.name),
    name: spell.name,
    economy: economyFor(spell.castingTime),
    payments: [...payments, ...extraPayments],
    spell,
    ...(spell.concentration ? { effect: { name: spell.name, duration: 'Concentration', concentration: true } } : {}),
    ...(finalNote !== undefined ? { note: finalNote } : {}),
  }
}

const atLevel = (build: CharacterBuild) => (x: { minLevel?: number }) => build.level >= (x.minLevel ?? 1)

/** Every action available at this level: class/subclass features, then spells. */
export function getActions(build: CharacterBuild): ActionDef[] {
  const sets = featureSets(build)
  const has = atLevel(build)
  const features = sets.flatMap((s) => s.actions).filter(has)

  const spells: ActionDef[] = []
  const seen = new Set<string>()
  for (const g of sets.flatMap((s) => s.grantedSpells).filter(has)) {
    spells.push(spellAction(build, g.spell, g.extraPayments, g.note))
    seen.add(spellActionId(g.spell.name))
  }
  for (const s of build.spells) {
    const id = spellActionId(s.name)
    if (seen.has(id)) continue // already granted by the class
    seen.add(id)
    spells.push(spellAction(build, s))
  }

  return [...features, ...spells].map((a) => ({ ...a, payments: a.payments.filter(has) }))
}

export function getAction(build: CharacterBuild, id: string): ActionDef | undefined {
  return getActions(build).find((a) => a.id === id)
}

/** Spell modifiers (e.g. Metamagic) the player picked and has the level for. */
export function getSpellModifiers(build: CharacterBuild): SpellModifierDef[] {
  return featureSets(build)
    .flatMap((s) => s.spellModifiers)
    .filter((m) => build.level >= m.minLevel && build.spellModifiers.includes(m.id))
}

/** Why this modifier can't be used on this action at all, or null if it can. Doesn't look at the turn. */
export function modifierProblem(m: SpellModifierDef, action: ActionDef): string | null {
  if (!action.spell) return `${m.name} only works on spells`
  if (m.economyChange && m.economyChange.from !== action.economy) return `${m.name} doesn't apply to this spell`
  if (m.needsUpcast && (action.spell.level === 0 || !action.spell.upcast)) {
    return `${m.name} only works on level 1+ spells that can be upcast`
  }
  return null
}

/** Every spell modifier the class offers, for picking in setup. */
export function getAllSpellModifiers(build: CharacterBuild): SpellModifierDef[] {
  return featureSets(build).flatMap((s) => s.spellModifiers)
}

export function getPassives(build: CharacterBuild): PassiveDef[] {
  return featureSets(build)
    .flatMap((s) => s.passives)
    .filter(atLevel(build))
}
