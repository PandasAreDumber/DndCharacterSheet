import type { ClassDef, PaymentOption, SpellModifierDef } from '../../rules/types'
import { FULL_CASTER_SLOTS } from '../slotTables'

// Font of Magic: creating a slot. [slot level, SP cost, min sorcerer level]
const CREATE_SLOT_TABLE: [number, number, number][] = [
  [1, 2, 2],
  [2, 3, 3],
  [3, 5, 5],
  [4, 6, 7],
  [5, 7, 9],
]

const slotToPoints: PaymentOption[] = [1, 2, 3, 4, 5].map((level) => ({
  id: `slot_${level}`,
  label: `Level ${level} slot → ${level} SP`,
  costs: [{ resource: `slot_${level}`, amount: 1 }],
  // TODO(rules): 2024 text doesn't say if converted SP can go above your SP max. We cap at max for now.
  gains: [{ resource: 'sorcery_points', amount: level }],
}))

const pointsToSlot: PaymentOption[] = CREATE_SLOT_TABLE.map(([level, cost, minLevel]) => ({
  id: `slot_${level}`,
  label: `${cost} SP → level ${level} slot`,
  costs: [{ resource: 'sorcery_points', amount: cost }],
  gains: [{ resource: `slot_${level}`, amount: 1, canExceedMax: true }],
  minLevel,
}))

// TODO(rules): double check these 2024 costs and which options can be combined.
const metamagic: SpellModifierDef[] = [
  { id: 'careful', name: 'Careful Spell', minLevel: 2, costs: [{ resource: 'sorcery_points', amount: 1 }] },
  { id: 'distant', name: 'Distant Spell', minLevel: 2, costs: [{ resource: 'sorcery_points', amount: 1 }] },
  {
    id: 'empowered',
    name: 'Empowered Spell',
    minLevel: 2,
    costs: [{ resource: 'sorcery_points', amount: 1 }],
    combinable: true,
  },
  { id: 'extended', name: 'Extended Spell', minLevel: 2, costs: [{ resource: 'sorcery_points', amount: 1 }] },
  { id: 'heightened', name: 'Heightened Spell', minLevel: 2, costs: [{ resource: 'sorcery_points', amount: 2 }] },
  {
    id: 'quickened',
    name: 'Quickened Spell',
    minLevel: 2,
    costs: [{ resource: 'sorcery_points', amount: 2 }],
    economyChange: { from: 'action', to: 'bonus' },
    // TODO(rules): 2024 Quickened may also forbid other level 1+ spells on the same turn. Not enforced beyond the one-slot rule.
  },
  {
    id: 'seeking',
    name: 'Seeking Spell',
    minLevel: 2,
    costs: [{ resource: 'sorcery_points', amount: 1 }],
    combinable: true,
  },
  { id: 'subtle', name: 'Subtle Spell', minLevel: 2, costs: [{ resource: 'sorcery_points', amount: 1 }] },
  { id: 'transmuted', name: 'Transmuted Spell', minLevel: 2, costs: [{ resource: 'sorcery_points', amount: 1 }] },
  { id: 'twinned', name: 'Twinned Spell', minLevel: 2, costs: [{ resource: 'sorcery_points', amount: 1 }] },
]

export const sorcerer: ClassDef = {
  id: 'sorcerer',
  name: 'Sorcerer',
  hitDie: 6,
  slotTable: FULL_CASTER_SLOTS,
  spellModifierName: 'Metamagic',
  resources: [
    {
      id: 'innate_sorcery',
      name: 'Innate Sorcery',
      kind: 'uses',
      max: () => 2,
      recharge: { long: { type: 'all' } },
    },
    {
      id: 'sorcery_points',
      name: 'Sorcery Points',
      kind: 'pool',
      max: (b) => (b.level >= 2 ? b.level : 0),
      recharge: {
        long: { type: 'all' },
        // Sorcerous Restoration (L5): half level, once per long rest.
        short: { type: 'amount', amount: (b) => Math.floor(b.level / 2), limitedBy: 'sorcerous_restoration' },
      },
    },
    {
      id: 'sorcerous_restoration',
      name: 'Sorcerous Restoration',
      kind: 'uses',
      max: (b) => (b.level >= 5 ? 1 : 0),
      recharge: { long: { type: 'all' } },
    },
  ],
  actions: [
    {
      id: 'innate_sorcery',
      name: 'Innate Sorcery',
      economy: 'bonus',
      payments: [
        { id: 'use', label: 'Use', costs: [{ resource: 'innate_sorcery', amount: 1 }] },
        {
          id: 'sorcery_incarnate',
          label: '2 SP (Sorcery Incarnate)',
          costs: [{ resource: 'sorcery_points', amount: 2 }],
          minLevel: 7,
          onlyWhenEmpty: 'innate_sorcery',
        },
      ],
      effect: { name: 'Innate Sorcery', duration: '1 minute' },
    },
    {
      id: 'font_slot_to_points',
      name: 'Font of Magic: Slot → Sorcery Points',
      economy: 'free',
      minLevel: 2,
      payments: slotToPoints,
    },
    {
      id: 'font_points_to_slot',
      name: 'Font of Magic: Sorcery Points → Slot',
      economy: 'bonus',
      minLevel: 2,
      payments: pointsToSlot,
      note: 'Created slots vanish on a long rest.',
    },
  ],
  passives: [],
  grantedSpells: [],
  spellModifiers: metamagic,
}
