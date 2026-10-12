import type { SubclassDef } from '../../rules/types'
import { spell } from '../helpers'

// TODO(rules): verify concentration / upcast / casting time flags against the 2024 spell text
// (2024 Magic Weapon is a bonus action with no concentration, as far as I know).
export const oathOfGlory: SubclassDef = {
  id: 'oath_of_glory',
  classId: 'paladin',
  name: 'Oath of Glory',
  resources: [],
  actions: [
    {
      id: 'peerless_athlete',
      name: 'Peerless Athlete',
      economy: 'bonus',
      minLevel: 3,
      payments: [{ id: 'channel_divinity', label: '1 Channel Divinity', costs: [{ resource: 'channel_divinity', amount: 1 }] }],
      effect: { name: 'Peerless Athlete', duration: '1 hour' },
      // TODO(rules): check the jump distance bonus against the 2024 text.
      note: 'For 1 hour: Advantage on STR (Athletics) and DEX (Acrobatics) checks, and your jumps go 10 ft farther.',
    },
    {
      id: 'inspiring_smite',
      name: 'Inspiring Smite',
      economy: 'free',
      minLevel: 3,
      after: 'spell:divine-smite',
      payments: [{ id: 'channel_divinity', label: '1 Channel Divinity', costs: [{ resource: 'channel_divinity', amount: 1 }] }],
      note: (b) => `Hand out 2d8 + ${b.level} temp HP to creatures you choose within 30 ft (you included).`,
    },
  ],
  passives: [
    {
      id: 'aura_of_alacrity',
      name: 'Aura of Alacrity',
      minLevel: 7,
      text: 'Your Speed +10 ft. Allies who enter or start their turn in your aura get +10 ft Speed until the end of their next turn.',
    },
  ],
  grantedSpells: [
    { spell: spell('Guiding Bolt', 1, { upcast: true }), minLevel: 3 },
    { spell: spell('Heroism', 1, { concentration: true, upcast: true }), minLevel: 3 },
    { spell: spell('Enhance Ability', 2, { concentration: true, upcast: true }), minLevel: 5 },
    { spell: spell('Magic Weapon', 2, { castingTime: 'bonus', upcast: true }), minLevel: 5 },
    { spell: spell('Haste', 3, { concentration: true }), minLevel: 9 },
    { spell: spell('Protection from Energy', 3, { concentration: true }), minLevel: 9 },
  ],
  spellModifiers: [],
}
