// Species with a lineage / ancestry / legacy choice. Short summaries of the 2024 traits, not the book text.

import { abilityMod } from '../../rules/abilities'
import type { CharacterBuild, LineageDef, PassiveDef, Spell, SpeciesDef } from '../../rules/types'
import { PB, features, innateSpell, spell, limitedAction, uses } from '../helpers'

const passive = (id: string, name: string, text: PassiveDef['text'], minLevel = 1): PassiveDef => ({
  id: `species_${id}`,
  name,
  minLevel,
  text,
})

/**
 * The common pattern for spell lineages (Elf, Tiefling): a cantrip at level 1,
 * a spell at level 3 and one at level 5, each castable once per long rest without a slot.
 */
function spellLineage(
  id: string,
  name: string,
  cantrip: Spell,
  level3: Spell,
  level5: Spell,
  extraPassives: PassiveDef[] = [],
): LineageDef {
  return {
    id,
    name,
    ...features({
      resources: [
        uses('species_lineage_spell_3', `${level3.name} (free cast)`, { minLevel: 3 }),
        uses('species_lineage_spell_5', `${level5.name} (free cast)`, { minLevel: 5 }),
      ],
      grantedSpells: [
        innateSpell(cantrip, 1),
        innateSpell(level3, 3, 'species_lineage_spell_3'),
        innateSpell(level5, 5, 'species_lineage_spell_5'),
      ],
      passives: extraPassives,
    }),
  }
}

// ---------- Dragonborn ----------

const breathDice = (b: CharacterBuild) => (b.level >= 17 ? 4 : b.level >= 11 ? 3 : b.level >= 5 ? 2 : 1)
const conDc = (b: CharacterBuild) => 8 + abilityMod(b.abilities.con) + PB(b)

const DRAGONS: [string, string][] = [
  ['Black', 'Acid'],
  ['Blue', 'Lightning'],
  ['Brass', 'Fire'],
  ['Bronze', 'Lightning'],
  ['Copper', 'Acid'],
  ['Gold', 'Fire'],
  ['Green', 'Poison'],
  ['Red', 'Fire'],
  ['Silver', 'Cold'],
  ['White', 'Cold'],
]

export const dragonborn: SpeciesDef = {
  id: 'dragonborn',
  name: 'Dragonborn',
  lineageLabel: 'Draconic Ancestry',
  lineages: DRAGONS.map(([color, damage]) => ({
    id: color.toLowerCase(),
    name: `${color} (${damage})`,
    ...features({
      actions: [
        limitedAction('species_breath_weapon', 'Breath Weapon', 'free', 'species_breath_weapon', {
          note: (b) =>
            `Replaces one attack of your Attack action. 15 ft cone or 30 ft line (5 ft wide). DEX save DC ${conDc(b)}: ${breathDice(b)}d10 ${damage.toLowerCase()} damage, half on a success.`,
        }),
      ],
      passives: [passive('damage_resistance', 'Damage Resistance', `Resistance to ${damage} damage.`)],
    }),
  })),
  ...features({
    resources: [
      uses('species_breath_weapon', 'Breath Weapon', { max: PB }),
      uses('species_draconic_flight', 'Draconic Flight', { minLevel: 5 }),
    ],
    actions: [
      limitedAction('species_draconic_flight', 'Draconic Flight', 'bonus', 'species_draconic_flight', {
        minLevel: 5,
        note: 'Spectral wings: Fly Speed equal to your Speed.',
        effect: { name: 'Draconic Flight', duration: '10 minutes' },
      }),
    ],
    passives: [passive('darkvision', 'Darkvision', '60 ft.')],
  }),
}

// ---------- Elf ----------

// TODO(rules): check concentration / ritual / upcast flags on the species spells.
export const elf: SpeciesDef = {
  id: 'elf',
  name: 'Elf',
  lineageLabel: 'Elven Lineage',
  lineages: [
    spellLineage(
      'drow',
      'Drow',
      spell('Dancing Lights', 0, { range: '120 ft', concentration: true }),
      spell('Faerie Fire', 1, { range: '60 ft', concentration: true }),
      spell('Darkness', 2, { range: '60 ft', concentration: true }),
      [passive('drow_darkvision', 'Superior Darkvision', 'Your Darkvision is 120 ft.')],
    ),
    spellLineage(
      'high_elf',
      'High Elf',
      spell('Prestidigitation', 0, { range: '10 ft', note: 'You can swap this cantrip for another Wizard cantrip after a long rest.' }),
      spell('Detect Magic', 1, { range: 'Self', concentration: true, ritual: true }),
      spell('Misty Step', 2, { range: 'Self', castingTime: 'bonus' }),
    ),
    spellLineage(
      'wood_elf',
      'Wood Elf',
      spell('Druidcraft', 0, { range: '30 ft' }),
      spell('Longstrider', 1, { range: 'Touch', upcast: true }),
      spell('Pass without Trace', 2, { range: 'Self', concentration: true }),
      [passive('wood_elf_speed', 'Fleet of Foot', 'Your Speed is 35 ft.')],
    ),
  ],
  ...features({
    passives: [
      passive('darkvision', 'Darkvision', '60 ft.'),
      passive('fey_ancestry', 'Fey Ancestry', 'Advantage on saves to avoid or end the Charmed condition.'),
      passive('keen_senses', 'Keen Senses', 'Proficiency in Insight, Perception or Survival (pick one).'),
      passive('trance', 'Trance', "You don't need sleep; a long rest can be 4 hours of meditation."),
    ],
  }),
}

// ---------- Gnome ----------

export const gnome: SpeciesDef = {
  id: 'gnome',
  name: 'Gnome',
  lineageLabel: 'Gnomish Lineage',
  lineages: [
    {
      id: 'forest',
      name: 'Forest Gnome',
      ...features({
        resources: [uses('species_speak_with_animals', 'Speak with Animals (free casts)', { max: PB })],
        grantedSpells: [
          innateSpell(spell('Minor Illusion', 0, { range: '30 ft' }), 1),
          innateSpell(
            spell('Speak with Animals', 1, { range: 'Self', ritual: true }),
            1,
            'species_speak_with_animals',
            'Free (Forest Gnome)',
          ),
        ],
      }),
    },
    {
      id: 'rock',
      name: 'Rock Gnome',
      ...features({
        grantedSpells: [
          innateSpell(spell('Mending', 0, { range: 'Touch', castingTime: 'other' }), 1),
          innateSpell(spell('Prestidigitation', 0, { range: '10 ft' }), 1),
        ],
        passives: [
          passive(
            'tinker',
            'Clockwork Devices',
            'Spend 10 minutes to build a Tiny clockwork device (AC 5, 1 HP) with a simple effect, like a toy, a lighter or a music box. You can keep up to three.',
          ),
        ],
      }),
    },
  ],
  ...features({
    passives: [
      passive('darkvision', 'Darkvision', '60 ft.'),
      passive('gnomish_cunning', 'Gnomish Cunning', 'Advantage on INT, WIS and CHA saving throws.'),
    ],
  }),
}

// ---------- Goliath ----------

type GiantBoon = { id: string; giant: string; name: string; economy: 'bonus' | 'reaction' | 'free'; text: string }

const GIANT_BOONS: GiantBoon[] = [
  {
    id: 'cloud',
    giant: 'Cloud',
    name: "Cloud's Jaunt",
    economy: 'bonus',
    text: 'Teleport up to 30 ft to an unoccupied space you can see.',
  },
  {
    id: 'fire',
    giant: 'Fire',
    name: "Fire's Burn",
    economy: 'free',
    text: 'When you hit with an attack roll, deal an extra 1d10 fire damage.',
  },
  {
    id: 'frost',
    giant: 'Frost',
    name: "Frost's Chill",
    economy: 'free',
    text: "When you hit with an attack roll, deal an extra 1d6 cold damage and reduce the target's Speed by 10 ft until the start of your next turn.",
  },
  {
    id: 'hill',
    giant: 'Hill',
    name: "Hill's Tumble",
    economy: 'free',
    text: 'When you hit a Large or smaller creature with an attack roll, knock it Prone.',
  },
  {
    id: 'stone',
    giant: 'Stone',
    name: "Stone's Endurance",
    economy: 'reaction',
    text: 'When you take damage, roll 1d12 + your CON modifier and reduce the damage by that much.',
  },
  {
    id: 'storm',
    giant: 'Storm',
    name: "Storm's Thunder",
    economy: 'reaction',
    text: 'When a creature within 60 ft damages you, deal 1d8 thunder damage to it.',
  },
]

export const goliath: SpeciesDef = {
  id: 'goliath',
  name: 'Goliath',
  lineageLabel: 'Giant Ancestry',
  lineages: GIANT_BOONS.map((g) => ({
    id: g.id,
    name: `${g.giant} Giant (${g.name})`,
    ...features({
      actions: [
        limitedAction(`species_${g.id}_boon`, g.name, g.economy, 'species_giant_boon', {
          note: g.id === 'stone' ? (b) => `${g.text} (1d12 + ${abilityMod(b.abilities.con)})` : g.text,
        }),
      ],
    }),
  })),
  ...features({
    resources: [
      uses('species_giant_boon', 'Giant Ancestry', { max: PB }),
      uses('species_large_form', 'Large Form', { minLevel: 5 }),
    ],
    actions: [
      limitedAction('species_large_form', 'Large Form', 'bonus', 'species_large_form', {
        minLevel: 5,
        note: 'Become Large (if there is room). Advantage on STR checks and your Speed increases by 10 ft.',
        effect: { name: 'Large Form', duration: '10 minutes' },
      }),
    ],
    passives: [
      passive(
        'powerful_build',
        'Powerful Build',
        'Advantage on checks to end the Grappled condition. You count as one size larger for carrying capacity.',
      ),
    ],
  }),
}

// ---------- Tiefling ----------

// TODO(rules): check concentration / upcast flags on the legacy spells.
export const tiefling: SpeciesDef = {
  id: 'tiefling',
  name: 'Tiefling',
  lineageLabel: 'Fiendish Legacy',
  lineages: [
    spellLineage(
      'abyssal',
      'Abyssal',
      spell('Poison Spray', 0, { range: '30 ft' }),
      spell('Ray of Sickness', 1, { range: '60 ft', upcast: true }),
      spell('Hold Person', 2, { range: '60 ft', concentration: true, upcast: true }),
      [passive('legacy_resistance', 'Resistance', 'Resistance to Poison damage.')],
    ),
    spellLineage(
      'chthonic',
      'Chthonic',
      spell('Chill Touch', 0, { range: 'Touch' }),
      spell('False Life', 1, { range: 'Self', upcast: true }),
      spell('Ray of Enfeeblement', 2, { range: '60 ft', concentration: true }),
      [passive('legacy_resistance', 'Resistance', 'Resistance to Necrotic damage.')],
    ),
    spellLineage(
      'infernal',
      'Infernal',
      spell('Fire Bolt', 0, { range: '120 ft' }),
      spell('Hellish Rebuke', 1, { range: '60 ft', castingTime: 'reaction', upcast: true }),
      spell('Darkness', 2, { range: '60 ft', concentration: true }),
      [passive('legacy_resistance', 'Resistance', 'Resistance to Fire damage.')],
    ),
  ],
  ...features({
    grantedSpells: [innateSpell(spell('Thaumaturgy', 0, { range: '30 ft' }), 1)],
    passives: [passive('darkvision', 'Darkvision', '60 ft.')],
  }),
}
