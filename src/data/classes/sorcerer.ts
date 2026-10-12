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

// 2024 Metamagic. Only one option per spell, except Empowered and Seeking which stack with others.
// Descriptions are short summaries, not the full rule text.
const sp = (amount: number) => [{ resource: 'sorcery_points', amount }]

const metamagic: SpellModifierDef[] = [
  {
    id: 'careful',
    name: 'Careful Spell',
    minLevel: 2,
    costs: sp(1),
    description:
      'For a spell that forces a saving throw: pick a number of creatures up to your Charisma modifier (min 1). They automatically succeed on the save and take no damage if they would normally take half on a success.',
  },
  {
    id: 'distant',
    name: 'Distant Spell',
    minLevel: 2,
    costs: sp(1),
    description:
      'For a spell with a range of at least 5 feet, double its range. For a spell with a range of Touch, its range becomes 30 feet.',
  },
  {
    id: 'empowered',
    name: 'Empowered Spell',
    minLevel: 2,
    costs: sp(1),
    combinable: true,
    description:
      'When you roll damage for the spell, reroll a number of the damage dice up to your Charisma modifier (min 1) and use the new rolls. Works even if you already used another Metamagic on the spell.',
  },
  {
    id: 'extended',
    name: 'Extended Spell',
    minLevel: 2,
    costs: sp(1),
    description:
      'For a spell with a duration of 1 minute or longer, double the duration (up to 24 hours). If it needs Concentration, you have Advantage on saving throws to keep it.',
  },
  {
    id: 'heightened',
    name: 'Heightened Spell',
    minLevel: 2,
    costs: sp(2),
    description: 'For a spell that forces a saving throw: one target has Disadvantage on its saves against the spell.',
  },
  {
    id: 'quickened',
    name: 'Quickened Spell',
    minLevel: 2,
    costs: sp(2),
    economyChange: { from: 'action', to: 'bonus' },
    locksLeveledSpells: true,
    description:
      "A spell with a casting time of an action is cast as a Bonus Action instead. You can't use it if you already cast a level 1+ spell this turn, and you can't cast another level 1+ spell this turn after using it.",
  },
  {
    id: 'seeking',
    name: 'Seeking Spell',
    minLevel: 2,
    costs: sp(1),
    combinable: true,
    afterCast: true,
    // TODO(rules): only matters for spells with an attack roll, but spells don't record that, so it's offered after every spell.
    description:
      'If you make an attack roll for the spell and miss, reroll the d20 and use the new roll. Works even if you already used another Metamagic on the spell.',
  },
  {
    id: 'subtle',
    name: 'Subtle Spell',
    minLevel: 2,
    costs: sp(1),
    description:
      "Cast the spell without Verbal, Somatic, or Material components (except Material components that are used up or have a gold cost). Nobody can tell you're casting.",
  },
  {
    id: 'transmuted',
    name: 'Transmuted Spell',
    minLevel: 2,
    costs: sp(1),
    description:
      "For a spell that deals Acid, Cold, Fire, Lightning, Poison, or Thunder damage, change that damage type to another one from the same list.",
  },
  {
    id: 'twinned',
    name: 'Twinned Spell',
    minLevel: 2,
    costs: sp(1),
    needsUpcast: true,
    description:
      'For a spell that can target one more creature when cast with a higher slot (like Charm Person or Hold Person): its effective level goes up by 1, so it gets one more target. Only works on level 1+ spells that can be upcast.',
  },
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
      note: 'For 1 minute: your Sorcerer spell save DC goes up by 1, and you have Advantage on attack rolls for Sorcerer spells you cast.',
    },
    {
      id: 'font_slot_to_points',
      name: 'Font of Magic: Slot → Sorcery Points',
      economy: 'free',
      minLevel: 2,
      payments: slotToPoints,
      note: 'No action needed. Spend a spell slot to gain Sorcery Points equal to its level.',
    },
    {
      id: 'font_points_to_slot',
      name: 'Font of Magic: Sorcery Points → Slot',
      economy: 'bonus',
      minLevel: 2,
      payments: pointsToSlot,
      note: "Bonus Action. Spend Sorcery Points to create a spell slot (level 5 at most). Created slots vanish on a long rest.",
    },
  ],
  passives: [],
  grantedSpells: [],
  spellModifiers: metamagic,
}
