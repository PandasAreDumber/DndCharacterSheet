// Short summaries of the spells that classes, subclasses and species grant, keyed by lowercase name.
// Used as the spell's description when it doesn't have its own note. Short summaries, not the book text.
// Not a full spell list: players still add their own spells (and their own notes).

// TODO(rules): these are summaries of the 2024 versions from memory. Double check numbers against the book.
export const SPELL_SUMMARIES: Record<string, string> = {
  // ---------- Aberrant Sorcery: psionic spells ----------
  'arms of hadar':
    'Dark tendrils lash every creature within 10 ft of you. STR save: 2d6 necrotic and no Reactions until its next turn on a fail, half damage on a success. +1d6 per slot level above 1st.',
  'calm emotions':
    'Humanoids in a 20-ft-radius sphere within 60 ft make a CHA save. On a fail, you either end the Charmed or Frightened condition on them, or make them indifferent to creatures you choose. Concentration, 1 minute.',
  'detect thoughts':
    'Sense creatures with minds within 30 ft and read the surface thoughts of one you can see. You can probe deeper (WIS save). Concentration, 1 minute.',
  'dissonant whispers':
    'One creature within 60 ft hears a discordant melody. WIS save: 3d6 psychic and it must use its Reaction to move away from you on a fail, half damage on a success. +1d6 per slot level above 1st.',
  'mind sliver':
    'One creature within 60 ft makes an INT save. On a fail it takes 1d6 psychic and subtracts 1d4 from its next saving throw before the end of your next turn. More damage at levels 5, 11 and 17.',
  'hunger of hadar':
    'A 20-ft-radius sphere of freezing darkness within 150 ft. It is Difficult Terrain; creatures starting their turn inside take 2d6 cold, and those ending their turn inside make a DEX save or take 2d6 acid. Concentration, 1 minute.',
  sending:
    "Send a message of up to 25 words to a creature you're familiar with, anywhere on the same plane. It can reply right away.",
  "evard's black tentacles":
    'Tentacles fill a 20-ft square within 90 ft, making it Difficult Terrain. A creature that enters or starts its turn there makes a STR save or takes 3d6 bludgeoning and is Restrained. Concentration, 1 minute.',
  'summon aberration':
    'Summon an Aberrant Spirit (Beholderkin, Mind Flayer or Slaad) that obeys your commands and acts right after you. Stronger with higher slots. Concentration, 1 hour.',
  "rary's telepathic bond":
    'Link up to eight willing creatures telepathically for 1 hour, at any distance on the same plane. Can be cast as a ritual.',
  telekinesis:
    'Move a creature or object within 60 ft with your mind each turn (creatures get a STR save). Concentration, 10 minutes.',

  // ---------- Paladin and Oath of Glory ----------
  'find steed':
    'Summon an otherworldly steed (Celestial, Fey or Fiend) that serves as your mount and fights alongside you. Stronger with higher slots.',
  'guiding bolt':
    'Ranged spell attack, 120 ft: 4d6 radiant, and the next attack roll against the target before the end of your next turn has Advantage. +1d6 per slot level above 1st.',
  heroism:
    'Touch a willing creature: it is immune to Frightened and gains temp HP equal to your spellcasting modifier at the start of each of its turns. +1 target per slot level above 1st. Concentration, 1 minute.',
  'enhance ability':
    'Touch a creature and pick an ability: it has Advantage on ability checks with it. +1 target per slot level above 2nd. Concentration, 1 hour.',
  'magic weapon':
    'Touch a nonmagical weapon: it becomes a +1 magic weapon (better with higher slots). 1 hour.',
  haste:
    'A willing creature within 30 ft gets double Speed, +2 AC, Advantage on DEX saves and an extra limited action each turn. When it ends, the target loses its next turn. Concentration, 1 minute.',
  'protection from energy':
    'Touch a willing creature: Resistance to Acid, Cold, Fire, Lightning or Thunder damage (pick one). Concentration, 1 hour.',

  // ---------- Species spells ----------
  light: 'Touch an object: it sheds bright light in a 20-ft radius and dim light 20 ft beyond for 1 hour.',
  thaumaturgy:
    'A minor wonder within 30 ft: a booming voice, flickering flames, harmless tremors, a sound, a door flung open or changed eyes.',
  'dancing lights':
    'Create up to four torch-sized lights within 120 ft. Move them up to 60 ft as a Bonus Action. Concentration, 1 minute.',
  'faerie fire':
    "Creatures in a 20-ft cube within 60 ft make a DEX save or are outlined in light: attacks against them have Advantage and they can't be Invisible. Concentration, 1 minute.",
  darkness:
    "Magical darkness fills a 15-ft-radius sphere within 60 ft. Darkvision can't see through it. Concentration, 10 minutes.",
  'detect magic':
    'Sense magic within 30 ft and see a faint aura around magic creatures and objects. Can be cast as a ritual. Concentration, 10 minutes.',
  'misty step': 'Teleport up to 30 ft to an unoccupied space you can see.',
  druidcraft:
    'A small nature effect within 30 ft: predict the weather, make a flower bloom, a harmless sensory effect, or light or snuff a small flame.',
  longstrider: "Touch a creature: its Speed increases by 10 ft for 1 hour. +1 target per slot level above 1st.",
  'pass without trace':
    "You and creatures you choose within 30 ft get +10 to DEX (Stealth) checks and can't be tracked by nonmagical means. Concentration, 1 hour.",
  'minor illusion': 'Create a sound or an image of an object within 30 ft for 1 minute.',
  'speak with animals': 'Understand and talk with Beasts for 10 minutes. Can be cast as a ritual.',
  mending: 'Repair a single break or tear in an object you touch. Takes 1 minute to cast.',
  prestidigitation:
    'A minor magical trick within 10 ft: a harmless sensory effect, light or snuff a small flame, clean or soil an object, chill, warm or flavor material, or make a small mark or trinket.',
  'poison spray': 'Ranged spell attack, 30 ft: 1d12 poison. More damage at levels 5, 11 and 17.',
  'ray of sickness':
    'Ranged spell attack, 60 ft: 2d8 poison and the target is Poisoned until the end of your next turn. +1d8 per slot level above 1st.',
  'hold person':
    'A Humanoid within 60 ft makes a WIS save or is Paralyzed. It repeats the save at the end of each of its turns. +1 target per slot level above 2nd. Concentration, 1 minute.',
  'chill touch':
    "Melee spell attack: 1d10 necrotic, and the target can't regain HP until the end of your next turn. More damage at levels 5, 11 and 17.",
  'false life': 'You gain 2d4 + 4 temp HP. More temp HP with higher slots.',
  'ray of enfeeblement':
    'A creature within 60 ft makes a CON save. On a fail it has Disadvantage on STR tests and deals less damage. Concentration, 1 minute.',
  'fire bolt': 'Ranged spell attack, 120 ft: 1d10 fire. More damage at levels 5, 11 and 17.',
  'hellish rebuke':
    'When a creature within 60 ft damages you, it makes a DEX save: 2d10 fire on a fail, half on a success. +1d10 per slot level above 1st.',
}
