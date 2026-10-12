// Species with no lineage choice. Short summaries of the 2024 traits, not the book text.

import { abilityMod } from '../../rules/abilities'
import type { PassiveDef, SpeciesDef } from '../../rules/types'
import { PB, features, innateSpell, spell, limitedAction, uses } from '../helpers'

const passive = (id: string, name: string, text: PassiveDef['text'], minLevel = 1): PassiveDef => ({
  id: `species_${id}`,
  name,
  minLevel,
  text,
})

export const aasimar: SpeciesDef = {
  id: 'aasimar',
  name: 'Aasimar',
  lineages: [],
  ...features({
    resources: [
      uses('species_healing_hands', 'Healing Hands'),
      uses('species_celestial_revelation', 'Celestial Revelation', { minLevel: 3 }),
    ],
    actions: [
      limitedAction('species_healing_hands', 'Healing Hands', 'action', 'species_healing_hands', {
        note: (b) => `Magic action. Touch a creature and roll ${PB(b)}d4: it regains that many HP.`,
      }),
      ...(
        [
          ['heavenly_wings', 'Heavenly Wings', 'Spectral wings: Fly Speed equal to your Speed.', 'radiant'],
          ['inner_radiance', 'Inner Radiance', 'You shed bright light. At the end of each of your turns, each creature within 10 ft takes radiant damage equal to your PB.', 'radiant'],
          ['necrotic_shroud', 'Necrotic Shroud', 'Creatures within 10 ft (your choice) make a CHA save or are Frightened of you until the end of your next turn.', 'necrotic'],
        ] as const
      ).map(([id, name, text, dmg]) =>
        limitedAction(`species_${id}`, `Celestial Revelation: ${name}`, 'bonus', 'species_celestial_revelation', {
          minLevel: 3,
          note: (b) =>
            `${text} Once per turn, add ${PB(b)} ${dmg} damage to one target when you deal damage with an attack or spell.` +
            (id === 'necrotic_shroud' ? ` Save DC ${8 + abilityMod(b.abilities.cha) + PB(b)}.` : ''),
          effect: { name, duration: '1 minute' },
        }),
      ),
    ],
    passives: [
      passive('celestial_resistance', 'Celestial Resistance', 'Resistance to Necrotic and Radiant damage.'),
      passive('darkvision', 'Darkvision', '60 ft.'),
    ],
    grantedSpells: [innateSpell(spell('Light', 0), 1)],
  }),
}

export const dwarf: SpeciesDef = {
  id: 'dwarf',
  name: 'Dwarf',
  lineages: [],
  ...features({
    resources: [uses('species_stonecunning', 'Stonecunning', { max: PB })],
    actions: [
      limitedAction('species_stonecunning', 'Stonecunning', 'bonus', 'species_stonecunning', {
        note: 'Tremorsense 60 ft while standing on or touching stone.',
        effect: { name: 'Stonecunning (Tremorsense)', duration: '10 minutes' },
      }),
    ],
    passives: [
      passive('darkvision', 'Darkvision', '120 ft.'),
      passive('dwarven_resilience', 'Dwarven Resilience', 'Resistance to Poison damage. Advantage on saves to avoid or end the Poisoned condition.'),
      passive('dwarven_toughness', 'Dwarven Toughness', (b) => `Max HP +1 per level (+${b.level}). Include it in the Max HP you type in.`),
    ],
  }),
}

export const halfling: SpeciesDef = {
  id: 'halfling',
  name: 'Halfling',
  lineages: [],
  ...features({
    passives: [
      passive('brave', 'Brave', 'Advantage on saves to avoid or end the Frightened condition.'),
      passive('nimbleness', 'Halfling Nimbleness', "You can move through the space of any creature a size larger than you (but can't stop there)."),
      passive('luck', 'Luck', 'When you roll a 1 on the d20 of a D20 Test, reroll it and use the new roll.'),
      passive('naturally_stealthy', 'Naturally Stealthy', 'You can take the Hide action even when only obscured by a creature at least one size larger than you.'),
    ],
  }),
}

export const human: SpeciesDef = {
  id: 'human',
  name: 'Human',
  lineages: [],
  ...features({
    resources: [uses('species_heroic_inspiration', 'Heroic Inspiration')],
    actions: [
      limitedAction('species_heroic_inspiration', 'Heroic Inspiration', 'free', 'species_heroic_inspiration', {
        note: 'Reroll any die you just rolled and use the new roll. (Resourceful: you get it back on every long rest.)',
      }),
    ],
    passives: [
      passive('skillful', 'Skillful', 'Proficiency in one skill of your choice.'),
      passive('versatile', 'Versatile', 'You get an Origin feat of your choice.'),
    ],
  }),
}

export const orc: SpeciesDef = {
  id: 'orc',
  name: 'Orc',
  lineages: [],
  ...features({
    resources: [
      uses('species_adrenaline_rush', 'Adrenaline Rush', { max: PB, rest: 'short' }),
      uses('species_relentless_endurance', 'Relentless Endurance'),
    ],
    actions: [
      limitedAction('species_adrenaline_rush', 'Adrenaline Rush', 'bonus', 'species_adrenaline_rush', {
        note: (b) => `Take the Dash action and gain ${PB(b)} temp HP (applied for you).`,
        tempHp: PB,
      }),
      limitedAction('species_relentless_endurance', 'Relentless Endurance', 'free', 'species_relentless_endurance', {
        note: "When you drop to 0 HP but aren't killed outright, drop to 1 HP instead (applied for you).",
        heal: () => 1,
      }),
    ],
    passives: [passive('darkvision', 'Darkvision', '120 ft.')],
  }),
}
