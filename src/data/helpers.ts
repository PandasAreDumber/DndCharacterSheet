import { proficiencyBonus } from '../rules/abilities'
import type { ActionDef, CastingTime, FeatureSet, Formula, GrantedSpell, ResourceDef, Spell } from '../rules/types'

/** Short way to write a spell. Only name and level are required. */
export function spell(
  name: string,
  level: number,
  opts: Partial<Omit<Spell, 'name' | 'level'>> & { castingTime?: CastingTime } = {},
): Spell {
  return {
    name,
    level,
    castingTime: opts.castingTime ?? 'action',
    concentration: opts.concentration ?? false,
    ritual: opts.ritual ?? false,
    upcast: opts.upcast ?? false,
    ...(opts.note !== undefined ? { note: opts.note } : {}),
  }
}

// ---------- Helpers for species (and anything else with "X times per rest" features) ----------

/** Fills in the empty lists so data files only list what they have. */
export function features(p: Partial<FeatureSet>): FeatureSet {
  return { resources: [], actions: [], passives: [], grantedSpells: [], spellModifiers: [], ...p }
}

/** Proficiency bonus as a formula. Lots of species uses are "PB times per long rest". */
export const PB: Formula = (b) => proficiencyBonus(b.level)

/** A limited use resource that unlocks at `minLevel`. */
export function uses(
  id: string,
  name: string,
  opts: { minLevel?: number; max?: Formula; rest?: 'long' | 'short' } = {},
): ResourceDef {
  const minLevel = opts.minLevel ?? 1
  const max = opts.max ?? (() => 1)
  return {
    id,
    name,
    kind: 'uses',
    max: (b) => (b.level >= minLevel ? max(b) : 0),
    // "short" means it comes back on a short OR long rest.
    recharge: opts.rest === 'short' ? { short: { type: 'all' }, long: { type: 'all' } } : { long: { type: 'all' } },
  }
}

/**
 * A spell you always have that you can also cast without a slot, using `resource`
 * (usually once per long rest). Slots still work too. Cantrips just get granted.
 */
export function innateSpell(s: Spell, minLevel: number, resource?: string, freeLabel = 'Free (once per long rest)'): GrantedSpell {
  return {
    spell: s,
    minLevel,
    ...(resource
      ? { extraPayments: [{ id: 'free_use', label: freeLabel, costs: [{ resource, amount: 1 }], castLevel: s.level }] }
      : {}),
  }
}

/** One action per payment: costs 1 of `resource`. */
export function limitedAction(
  id: string,
  name: string,
  economy: ActionDef['economy'],
  resource: string,
  extra: Partial<ActionDef> = {},
): ActionDef {
  return {
    id,
    name,
    economy,
    payments: [{ id: 'use', label: 'Use', costs: [{ resource, amount: 1 }] }],
    ...extra,
  }
}
