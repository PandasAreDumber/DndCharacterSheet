import type { ActionDef, Economy, EffectDef, FeatureSet } from '../rules/types'

// Actions every character has in the 2024 rules. Short summaries, not the full rule text.

function basic(id: string, name: string, economy: Economy, note: string, effect?: EffectDef): ActionDef {
  return {
    id: `basic_${id}`,
    name,
    economy,
    basic: true,
    payments: [{ id: 'use', label: 'Use', costs: [] }],
    note,
    ...(effect ? { effect } : {}),
  }
}

const untilNextTurn = (name: string): EffectDef => ({ name, duration: 'Until your next turn', endsOnNewTurn: true })

export const BASIC_ACTIONS: FeatureSet = {
  resources: [],
  passives: [],
  grantedSpells: [],
  spellModifiers: [],
  actions: [
    basic(
      'attack',
      'Attack',
      'action',
      'Attack with a weapon or an Unarmed Strike (Unarmed Strike can be a Grapple or Shove). Extra Attack gives more attacks per Attack action.',
    ),
    basic('dash', 'Dash', 'action', 'Gain extra movement equal to your Speed for this turn.'),
    basic(
      'disengage',
      'Disengage',
      'action',
      "Your movement doesn't provoke Opportunity Attacks for the rest of this turn.",
      untilNextTurn('Disengaged'),
    ),
    basic(
      'dodge',
      'Dodge',
      'action',
      'Until your next turn: attacks against you have Disadvantage if you can see the attacker, and you have Advantage on DEX saves. Lost if you are Incapacitated or your Speed is 0.',
      untilNextTurn('Dodging'),
    ),
    basic(
      'help',
      'Help',
      'action',
      'Give an ally Advantage on one ability check (needs a skill or tool you are proficient in), or on their next attack against an enemy within 5 ft of you.',
    ),
    basic(
      'hide',
      'Hide',
      'action',
      "DC 15 DEX (Stealth) check while out of sight (Heavily Obscured or behind cover). On a success you're Invisible until you make noise, attack, cast a spell with a Verbal component, or get found.",
      { name: 'Hidden', duration: 'Until found' },
    ),
    basic(
      'influence',
      'Influence',
      'action',
      "Try to change a creature's attitude: CHA (Deception, Intimidation, Performance or Persuasion) or WIS (Animal Handling).",
    ),
    basic(
      'magic',
      'Magic',
      'action',
      'Use a magic item or a magical feature. (Your spells are listed below.)',
    ),
    basic(
      'ready',
      'Ready',
      'action',
      'Pick a trigger and an action (or a spell). When the trigger happens before your next turn, use your Reaction to do it. A readied spell needs Concentration.',
      untilNextTurn('Readied action'),
    ),
    basic(
      'search',
      'Search',
      'action',
      'WIS check to notice something: Insight, Medicine, Perception or Survival.',
    ),
    basic(
      'study',
      'Study',
      'action',
      'INT check to recall or figure something out: Arcana, History, Investigation, Nature or Religion.',
    ),
    basic('utilize', 'Utilize', 'action', 'Use a nonmagical object (beyond your one free object interaction).'),

    basic(
      'light_weapon_attack',
      'Off-hand attack (Light weapon)',
      'bonus',
      "After attacking with a Light weapon this turn, attack with a different Light weapon. Don't add your ability modifier to damage unless it's negative.",
    ),

    basic(
      'opportunity_attack',
      'Opportunity Attack',
      'reaction',
      'When a creature you can see leaves your reach, make one melee attack against it.',
    ),
    basic('readied', 'Readied action', 'reaction', 'Do what you readied when its trigger happens.'),
  ],
}
