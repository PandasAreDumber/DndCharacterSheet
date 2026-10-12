import type { GrantedSpell, Spell, SubclassDef } from '../../rules/types'
import { abilityMod } from '../../rules/abilities'
import { spell } from '../helpers'

/** Psionic Sorcery (L6): level 1+ psionic spells can be paid with SP equal to the spell's level. */
function psionic(s: Spell, minLevel: number): GrantedSpell {
  return {
    spell: s,
    minLevel,
    extraPayments:
      s.level > 0
        ? [
            {
              id: 'psionic_sorcery',
              label: `${s.level} SP (Psionic Sorcery)`,
              costs: [{ resource: 'sorcery_points', amount: s.level }],
              castLevel: s.level,
              minLevel: 6,
            },
          ]
        : [],
  }
}

// TODO(rules): verify concentration / upcast flags against the 2024 spell text.
export const aberrantSorcery: SubclassDef = {
  id: 'aberrant_sorcery',
  classId: 'sorcerer',
  name: 'Aberrant Sorcery',
  resources: [],
  actions: [
    {
      id: 'telepathic_speech',
      name: 'Telepathic Speech',
      economy: 'bonus',
      minLevel: 3,
      payments: [{ id: 'free', label: 'Free', costs: [] }],
      effect: { name: 'Telepathic Speech', duration: (b) => `${b.level} minutes` },
      note: (b) =>
        `Pick a creature you can see within 30 ft. You and it can speak telepathically while within ${Math.max(1, abilityMod(b.abilities.cha))} mile(s) of each other, for ${b.level} minutes. You both need to know a language.`,
    },
  ],
  passives: [
    {
      id: 'psychic_defenses',
      name: 'Psychic Defenses',
      minLevel: 6,
      text: 'Resistance to Psychic damage. Advantage on saves to avoid or end the Charmed or Frightened condition.',
    },
  ],
  grantedSpells: [
    psionic(spell('Arms of Hadar', 1, { range: 'Self', upcast: true }), 3),
    psionic(spell('Calm Emotions', 2, { range: '60 ft', concentration: true }), 3),
    psionic(spell('Detect Thoughts', 2, { range: 'Self', concentration: true }), 3),
    psionic(spell('Dissonant Whispers', 1, { range: '60 ft', upcast: true }), 3),
    psionic(spell('Mind Sliver', 0, { range: '60 ft' }), 3),
    psionic(spell('Hunger of Hadar', 3, { range: '150 ft', concentration: true, upcast: true }), 5),
    psionic(spell('Sending', 3, { range: 'Unlimited' }), 5),
    psionic(spell("Evard's Black Tentacles", 4, { range: '90 ft', concentration: true }), 7),
    psionic(spell('Summon Aberration', 4, { range: '90 ft', concentration: true, upcast: true }), 7),
    psionic(spell("Rary's Telepathic Bond", 5, { range: '30 ft', ritual: true }), 9),
    psionic(spell('Telekinesis', 5, { range: '60 ft', concentration: true }), 9),
  ],
  spellModifiers: [],
}
