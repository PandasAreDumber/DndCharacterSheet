import type { ClassDef } from '../../rules/types'
import { abilityMod } from '../../rules/abilities'
import { spell } from '../helpers'
import { HALF_CASTER_SLOTS } from '../slotTables'

export const paladin: ClassDef = {
  id: 'paladin',
  name: 'Paladin',
  hitDie: 10,
  slotTable: HALF_CASTER_SLOTS,
  resources: [
    {
      id: 'lay_on_hands',
      name: 'Lay on Hands',
      kind: 'pool',
      max: (b) => 5 * b.level,
      recharge: { long: { type: 'all' } },
    },
    {
      id: 'paladins_smite',
      name: "Paladin's Smite (free Divine Smite)",
      kind: 'uses',
      max: (b) => (b.level >= 2 ? 1 : 0),
      recharge: { long: { type: 'all' } },
    },
    {
      id: 'channel_divinity',
      name: 'Channel Divinity',
      kind: 'uses',
      max: (b) => (b.level >= 3 ? 2 : 0),
      recharge: { short: { type: 'amount', amount: () => 1 }, long: { type: 'all' } },
    },
    {
      id: 'faithful_steed',
      name: 'Faithful Steed (free Find Steed)',
      kind: 'uses',
      max: (b) => (b.level >= 5 ? 1 : 0),
      recharge: { long: { type: 'all' } },
    },
  ],
  actions: [
    {
      id: 'lay_on_hands',
      name: 'Lay on Hands',
      economy: 'bonus',
      payments: [{ id: 'pool', label: 'Spend from pool', costs: [] }],
      variableCost: { resource: 'lay_on_hands', min: 1 },
      note: 'Touch a creature and restore HP from your Lay on Hands pool. Pick how many points to spend.',
    },
    {
      id: 'lay_on_hands_poison',
      name: 'Lay on Hands: Cure Poison',
      economy: 'bonus',
      payments: [{ id: 'pool', label: '5 from pool', costs: [{ resource: 'lay_on_hands', amount: 5 }] }],
      note: 'Removes the Poisoned condition instead of healing.',
    },
    {
      id: 'divine_sense',
      name: 'Divine Sense',
      economy: 'bonus',
      minLevel: 3,
      payments: [{ id: 'channel_divinity', label: '1 Channel Divinity', costs: [{ resource: 'channel_divinity', amount: 1 }] }],
      effect: { name: 'Divine Sense', duration: '10 minutes' },
      note: 'For 10 minutes, you know where any Celestial, Fiend or Undead within 60 ft is, and you sense consecrated or desecrated places.',
    },
    {
      id: 'abjure_foes',
      name: 'Abjure Foes',
      economy: 'action',
      minLevel: 9,
      payments: [{ id: 'channel_divinity', label: '1 Channel Divinity', costs: [{ resource: 'channel_divinity', amount: 1 }] }],
      effect: { name: 'Abjure Foes', duration: '1 minute' },
      note: (b) =>
        `Up to ${Math.max(1, abilityMod(b.abilities.cha))} creatures you can see within 60 ft make a WIS save against your spell save DC. On a fail they are Frightened for 1 minute or until they take damage, and can only move, take an action or take a Bonus Action on each turn (one of them).`,
    },
  ],
  passives: [
    { id: 'extra_attack', name: 'Extra Attack', minLevel: 5, text: 'Attack twice when you take the Attack action.' },
    {
      id: 'aura_of_protection',
      name: 'Aura of Protection',
      minLevel: 6,
      text: (b) =>
        `You and allies within 10 ft add +${Math.max(1, abilityMod(b.abilities.cha))} to saving throws.`,
    },
  ],
  grantedSpells: [
    {
      spell: spell('Divine Smite', 1, { castingTime: 'bonus', upcast: true }),
      minLevel: 2,
      note: 'Right after hitting with a melee weapon or unarmed strike. 2d8 radiant, +1d8 per slot level above 1st.',
      extraPayments: [
        {
          id: 'free_use',
          label: "Free (Paladin's Smite)",
          costs: [{ resource: 'paladins_smite', amount: 1 }],
          castLevel: 1,
        },
      ],
    },
    {
      spell: spell('Find Steed', 2, { upcast: true }),
      minLevel: 5,
      extraPayments: [
        {
          id: 'free_use',
          label: 'Free (Faithful Steed)',
          costs: [{ resource: 'faithful_steed', amount: 1 }],
          castLevel: 2,
        },
      ],
    },
  ],
  spellModifiers: [],
}
