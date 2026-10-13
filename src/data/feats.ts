// 2024 feats: Origin, General and Fighting Style. Epic Boons are left out for now.
// Short summaries in our own words, not the book text. Most feats are display only; the ones that
// matter in combat get resources and actions so they can be tracked.

// TODO(rules): these are summaries of the 2024 feats from memory. Double check the numbers against the book.

import { abilityMod } from '../rules/abilities'
import type { ActionDef, CharacterBuild, Economy, FeatCategory, FeatDef, FeatureSet, PassiveDef } from '../rules/types'
import { PB, features, freeSpell, limitedAction, spell, uses } from './helpers'

const passive = (featId: string, name: string, text: PassiveDef['text']): PassiveDef => ({
  id: `feat_${featId}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  name,
  minLevel: 1,
  text,
})

/** An action with no cost (it only uses the turn's action, bonus action or reaction). */
const freeAction = (id: string, name: string, economy: Economy, note: ActionDef['note'], extra: Partial<ActionDef> = {}): ActionDef => ({
  id: `feat_${id}`,
  name,
  economy,
  payments: [{ id: 'use', label: 'Use', costs: [] }],
  note,
  ...extra,
})

/** Best of INT, WIS and CHA. Feats like Telekinetic use whichever one you raised; most casters raise their best. */
const mentalMod = (b: CharacterBuild) => Math.max(abilityMod(b.abilities.int), abilityMod(b.abilities.wis), abilityMod(b.abilities.cha))
const mentalDc = (b: CharacterBuild) => 8 + PB(b) + mentalMod(b)

const ASI_PLUS_ONE = (abilities: string) => `Increase ${abilities} by 1 (max 20). Include it in the scores you type in.`

function feat(
  category: FeatCategory,
  id: string,
  name: string,
  summary: string,
  set: Partial<FeatureSet> & { prerequisite?: string; spellChoices?: FeatDef['spellChoices'] } = {},
): FeatDef {
  const { prerequisite, spellChoices, ...rest } = set
  return {
    id,
    name,
    category,
    summary,
    ...(prerequisite ? { prerequisite } : {}),
    ...(spellChoices ? { spellChoices } : {}),
    ...features(rest),
  }
}

/** Display-only feat: its summary shows up as one passive. */
function simple(category: FeatCategory, id: string, name: string, summary: string, prerequisite?: string): FeatDef {
  return feat(category, id, name, summary, { passives: [passive(id, name, summary)], ...(prerequisite ? { prerequisite } : {}) })
}

const general = (id: string, name: string, summary: string, prerequisite = 'Level 4+') =>
  simple('general', id, name, summary, prerequisite)

// ---------- Origin ----------

const ORIGIN: FeatDef[] = [
  simple('origin', 'alert', 'Alert', 'Add your Proficiency Bonus to Initiative rolls. Right after rolling Initiative, you can swap your result with a willing ally.'),
  simple('origin', 'crafter', 'Crafter', "Proficiency with three Artisan's Tools. 20% off nonmagical items you buy, and you can craft some gear during a long rest."),
  feat('origin', 'healer', 'Healer', 'Battle Medic: heal with a Healer\'s Kit and a Hit Point Die. Reroll 1s on healing dice.', {
    actions: [
      freeAction('healer_battle_medic', 'Battle Medic', 'action', (b) =>
        `Utilize action with a Healer's Kit: a creature within 5 ft spends one of its Hit Point Dice. You roll it and it regains that much + ${PB(b)} HP.`,
      ),
    ],
    passives: [passive('healer', 'Healing Rerolls', 'When you roll healing dice for a spell or this feat, reroll any 1s and use the new roll.')],
  }),
  feat('origin', 'lucky', 'Lucky', 'Luck Points equal to your Proficiency Bonus for advantage, or to give an attacker disadvantage.', {
    resources: [uses('feat_lucky', 'Luck Points', { max: PB })],
    actions: [
      limitedAction('feat_lucky', 'Spend Luck Point', 'free', 'feat_lucky', {
        note: 'Give yourself Advantage on a D20 Test, or give Disadvantage to an attack roll against you.',
      }),
    ],
  }),
  feat('origin', 'magic_initiate', 'Magic Initiate', 'Two cantrips and one level 1 spell from the Cleric, Druid or Wizard list. The level 1 spell is free once per long rest.', {
    spellChoices: [
      { level: 0, count: 2, hint: 'Two cantrips from the Cleric, Druid or Wizard list' },
      { level: 1, count: 1, hint: 'One level 1 spell from the same list', freeUse: true },
    ],
  }),
  simple('origin', 'musician', 'Musician', 'Proficiency with three Musical Instruments. When you finish a short or long rest, you can give Heroic Inspiration to allies (as many as your Proficiency Bonus).'),
  simple('origin', 'savage_attacker', 'Savage Attacker', "Once per turn when you hit with a weapon, roll the weapon's damage dice twice and use either roll."),
  simple('origin', 'skilled', 'Skilled', 'Proficiency in any three skills or tools.'),
  simple('origin', 'tavern_brawler', 'Tavern Brawler', 'Unarmed Strike deals 1d4 + STR and you reroll 1s on its damage. Proficient with improvised weapons. Once per turn, an Unarmed Strike hit during the Attack action can also push the target 5 ft.'),
  feat('origin', 'tough', 'Tough', 'Your Hit Point maximum goes up by 2 per level.', {
    passives: [passive('tough', 'Tough', (b) => `Max HP +2 per level (+${2 * b.level}). Include it in the Max HP you type in.`)],
  }),
]

// ---------- General (level 4+) ----------

const GENERAL: FeatDef[] = [
  general('ability_score_improvement', 'Ability Score Improvement', 'Increase one ability score by 2, or two by 1 (max 20). Include it in the scores you type in.'),
  general('actor', 'Actor', `${ASI_PLUS_ONE('CHA')} Advantage on Deception and Performance checks to pass as someone else, and you can mimic voices.`, 'Level 4+, CHA 13+'),
  general('athlete', 'Athlete', `${ASI_PLUS_ONE('STR or DEX')} Climb Speed equal to your Speed, standing up from Prone costs only 5 ft, and you can make running jumps after moving only 5 ft.`, 'Level 4+, STR or DEX 13+'),
  general('charger', 'Charger', `${ASI_PLUS_ONE('STR or DEX')} Dash gives +10 ft Speed. Once per turn, if you move 10 ft straight at a target and hit it with a melee attack during the Attack action, deal +1d8 damage or push it 10 ft.`, 'Level 4+, STR or DEX 13+'),
  feat('general', 'chef', 'Chef', 'Cook a meal on a short rest for extra healing, and bake treats that give Temporary HP.', {
    prerequisite: 'Level 4+',
    resources: [uses('feat_chef_treats', 'Bolstering Treats', { max: PB })],
    actions: [
      limitedAction('feat_chef_treats', 'Eat a Bolstering Treat', 'bonus', 'feat_chef_treats', {
        note: (b) => `A creature eats one of your treats and gains ${PB(b)} Temporary HP. Add it yourself with the Temp HP box if it was you. Treats are made after a long rest.`,
      }),
    ],
    passives: [
      passive('chef', 'Chef', `${ASI_PLUS_ONE('CON or WIS')} Proficiency with Cook's Utensils. Replenishing Meal: on a short rest, you can cook for up to 4 + your Proficiency Bonus creatures; each regains an extra 1d8 HP when it spends Hit Point Dice.`),
    ],
  }),
  general('crossbow_expert', 'Crossbow Expert', `${ASI_PLUS_ONE('DEX')} Ignore the Loading property of crossbows, no Disadvantage for firing within 5 ft of an enemy, and add your ability modifier to the extra Light-property attack with a crossbow.`, 'Level 4+, DEX 13+'),
  general('crusher', 'Crusher', `${ASI_PLUS_ONE('STR or CON')} Once per turn when you hit with Bludgeoning damage, push the target 5 ft. On a Bludgeoning critical hit, attacks against the target have Advantage until the start of your next turn.`, 'Level 4+, STR or CON 13+'),
  feat('general', 'defensive_duelist', 'Defensive Duelist', 'Reaction: add your Proficiency Bonus to AC against melee attacks while holding a Finesse weapon.', {
    prerequisite: 'Level 4+, DEX 13+',
    actions: [
      freeAction('defensive_duelist_parry', 'Parry', 'reaction', (b) =>
        `When a melee attack hits you while you hold a Finesse weapon: +${PB(b)} AC against melee attacks (possibly turning the hit into a miss) until the start of your next turn.`,
        { effect: { name: 'Parry', duration: 'Until your next turn', endsOnNewTurn: true } },
      ),
    ],
    passives: [passive('defensive_duelist', 'Defensive Duelist', ASI_PLUS_ONE('DEX'))],
  }),
  feat('general', 'dual_wielder', 'Dual Wielder', 'Make an extra attack as a Bonus Action with a second weapon, and draw two weapons at once.', {
    prerequisite: 'Level 4+, STR or DEX 13+',
    actions: [
      freeAction('dual_wielder_attack', 'Dual Wielder Attack', 'bonus', 'After you take the Attack action and attack with a Light weapon: attack with a different melee weapon in your other hand (it can\'t be Two-Handed). No ability modifier to its damage unless it\'s negative.'),
    ],
    passives: [passive('dual_wielder', 'Dual Wielder', `${ASI_PLUS_ONE('STR or DEX')} Quick Draw: draw or stow two weapons when you could draw or stow one.`)],
  }),
  feat('general', 'durable', 'Durable', 'Advantage on Death Saving Throws, and spend Hit Point Dice to heal as a Bonus Action.', {
    prerequisite: 'Level 4+',
    actions: [
      // TODO(rules): check whether Speedy Recovery adds your CON modifier to the roll.
      limitedAction('feat_durable_speedy_recovery', 'Speedy Recovery', 'bonus', 'hit_dice', {
        note: 'Spend one Hit Point Die, roll it and regain that many HP. Add it yourself with the Heal button.',
      }),
    ],
    passives: [passive('durable', 'Durable', `${ASI_PLUS_ONE('CON')} Advantage on Death Saving Throws.`)],
  }),
  general('elemental_adept', 'Elemental Adept', `${ASI_PLUS_ONE('INT, WIS or CHA')} Pick Acid, Cold, Fire, Lightning or Thunder: your spells ignore Resistance to it, and 1s on its damage dice count as 2s. Can be taken more than once.`, 'Level 4+, Spellcasting'),
  feat('general', 'fey_touched', 'Fey Touched', 'Misty Step and one level 1 Divination or Enchantment spell, each free once per long rest.', {
    prerequisite: 'Level 4+',
    resources: [uses('feat_fey_touched_misty_step', 'Fey Touched: Misty Step')],
    grantedSpells: [freeSpell(spell('Misty Step', 2, { castingTime: 'bonus', range: 'Self', duration: 'Instantaneous' }), 'feat_fey_touched_misty_step', 'Fey Touched')],
    passives: [passive('fey_touched', 'Fey Touched', ASI_PLUS_ONE('INT, WIS or CHA'))],
    spellChoices: [{ level: 1, count: 1, hint: 'One level 1 Divination or Enchantment spell', freeUse: true }],
  }),
  general('grappler', 'Grappler', `${ASI_PLUS_ONE('STR or DEX')} Once per turn, an Unarmed Strike hit during the Attack action can both deal damage and Grapple. Advantage on attacks against creatures you're grappling, and moving them costs no extra movement if they're your size or smaller.`, 'Level 4+, STR or DEX 13+'),
  feat('general', 'great_weapon_master', 'Great Weapon Master', 'Extra damage with Heavy weapons, and a Bonus Action attack after a critical hit or a kill.', {
    prerequisite: 'Level 4+, STR 13+',
    actions: [
      freeAction('great_weapon_master_hew', 'Hew', 'bonus', 'Right after you score a Critical Hit with a melee weapon or drop a creature to 0 HP with one: make one attack with the same weapon.'),
    ],
    passives: [
      passive('great_weapon_master', 'Heavy Weapon Mastery', (b) => `${ASI_PLUS_ONE('STR')} When you hit with a Heavy weapon during the Attack action, deal +${PB(b)} damage.`),
    ],
  }),
  general('heavily_armored', 'Heavily Armored', `${ASI_PLUS_ONE('STR or CON')} Training with Heavy armor.`, 'Level 4+, Medium armor training'),
  general('heavy_armor_master', 'Heavy Armor Master', `${ASI_PLUS_ONE('STR or CON')} While in Heavy armor, Bludgeoning, Piercing and Slashing damage you take is reduced by your Proficiency Bonus.`, 'Level 4+, Heavy armor training'),
  feat('general', 'inspiring_leader', 'Inspiring Leader', 'After a short or long rest, give up to six creatures Temporary HP.', {
    prerequisite: 'Level 4+, WIS or CHA 13+',
    passives: [
      passive('inspiring_leader', 'Bolstering Performance', (b) =>
        `${ASI_PLUS_ONE('WIS or CHA')} When you finish a short or long rest, up to six creatures (you included) gain ${b.level} + your WIS or CHA modifier (the one you raised) Temporary HP.`,
      ),
    ],
  }),
  feat('general', 'keen_mind', 'Keen Mind', 'Expertise in a knowledge skill, and the Study action as a Bonus Action.', {
    prerequisite: 'Level 4+, INT 13+',
    actions: [freeAction('keen_mind_quick_study', 'Quick Study', 'bonus', 'Take the Study action.')],
    passives: [passive('keen_mind', 'Keen Mind', `${ASI_PLUS_ONE('INT')} Proficiency (or Expertise) in Arcana, History, Investigation, Nature or Religion.`)],
  }),
  general('lightly_armored', 'Lightly Armored', `${ASI_PLUS_ONE('STR or DEX')} Training with Light armor and Shields.`),
  feat('general', 'mage_slayer', 'Mage Slayer', 'Your damage makes concentration harder, and you can turn a failed mental save into a success.', {
    prerequisite: 'Level 4+, STR or DEX 13+',
    resources: [uses('feat_mage_slayer', 'Guarded Mind', { rest: 'short' })],
    actions: [
      limitedAction('feat_mage_slayer', 'Guarded Mind', 'free', 'feat_mage_slayer', {
        note: 'When you fail an INT, WIS or CHA saving throw, succeed instead.',
      }),
    ],
    passives: [passive('mage_slayer', 'Concentration Breaker', `${ASI_PLUS_ONE('STR or DEX')} A creature you damage has Disadvantage on the save to keep its Concentration.`)],
  }),
  general('martial_weapon_training', 'Martial Weapon Training', `${ASI_PLUS_ONE('STR or DEX')} Proficiency with Martial weapons.`),
  general('medium_armor_master', 'Medium Armor Master', `${ASI_PLUS_ONE('STR or DEX')} In Medium armor you can add up to +3 DEX to AC instead of +2.`, 'Level 4+, Medium armor training'),
  general('moderately_armored', 'Moderately Armored', `${ASI_PLUS_ONE('STR or DEX')} Training with Medium armor.`, 'Level 4+, Light armor training'),
  general('mounted_combatant', 'Mounted Combatant', `${ASI_PLUS_ONE('STR, DEX or WIS')} While mounted: Advantage on attacks against unmounted creatures smaller than your mount, you can make an attack on your mount hit you instead, and your mount takes no damage on a successful DEX save (half on a fail).`),
  feat('general', 'observant', 'Observant', 'Expertise in a perception skill, and the Search action as a Bonus Action.', {
    prerequisite: 'Level 4+, INT or WIS 13+',
    actions: [freeAction('observant_quick_search', 'Quick Search', 'bonus', 'Take the Search action.')],
    passives: [passive('observant', 'Keen Observer', `${ASI_PLUS_ONE('INT or WIS')} Proficiency (or Expertise) in Insight, Investigation or Perception.`)],
  }),
  general('piercer', 'Piercer', `${ASI_PLUS_ONE('STR or DEX')} Once per turn when you hit with Piercing damage, reroll one damage die. Piercing critical hits roll one extra damage die.`),
  feat('general', 'poisoner', 'Poisoner', 'Brew poison and coat weapons with it as a Bonus Action. Your poison ignores Resistance.', {
    prerequisite: 'Level 4+',
    actions: [
      freeAction('poisoner_apply', 'Apply Poison', 'bonus', (b) =>
        `Coat a weapon or ammunition with a dose. The next creature hit makes a CON save (DC ${8 + PB(b) + Math.max(abilityMod(b.abilities.dex), abilityMod(b.abilities.int))}): 2d8 Poison damage and Poisoned until the end of your next turn on a fail.`,
      ),
    ],
    passives: [passive('poisoner', 'Poisoner', `${ASI_PLUS_ONE('DEX or INT')} Your poison damage ignores Resistance. With a Poisoner's Kit, spend 1 hour and 50 GP to brew doses equal to your Proficiency Bonus.`)],
  }),
  feat('general', 'polearm_master', 'Polearm Master', 'A Bonus Action attack with the butt of your polearm, and a Reaction attack when enemies come into reach.', {
    prerequisite: 'Level 4+, STR or DEX 13+',
    actions: [
      freeAction('polearm_master_pole_strike', 'Pole Strike', 'bonus', 'After you take the Attack action with a Quarterstaff, Spear, or Heavy weapon with Reach: attack with the other end for 1d4 Bludgeoning.'),
      freeAction('polearm_master_reactive_strike', 'Reactive Strike', 'reaction', 'When a creature enters the reach of your Quarterstaff, Spear, or Heavy weapon with Reach: make one melee attack against it.'),
    ],
    passives: [passive('polearm_master', 'Polearm Master', ASI_PLUS_ONE('STR or DEX'))],
  }),
  general('resilient', 'Resilient', 'Increase one ability score by 1 (max 20) and gain proficiency in its saving throws. Include it in the scores you type in. Can be taken more than once.'),
  feat('general', 'ritual_caster', 'Ritual Caster', 'Learn level 1 ritual spells, and cast one quickly without a slot once per long rest.', {
    prerequisite: 'Level 4+, INT, WIS or CHA 13+',
    resources: [uses('feat_ritual_caster', 'Quick Ritual')],
    actions: [
      limitedAction('feat_ritual_caster', 'Quick Ritual', 'free', 'feat_ritual_caster', {
        note: 'Cast a ritual spell you have prepared at its normal casting time without a spell slot. You still use the action it takes.',
      }),
    ],
    passives: [
      passive('ritual_caster', 'Ritual Spells', (b) =>
        `${ASI_PLUS_ONE('INT, WIS or CHA')} You always have ${PB(b)} level 1 Ritual spells prepared. Add them in Your spells with Ritual ticked.`,
      ),
    ],
  }),
  feat('general', 'sentinel', 'Sentinel', 'Reaction attacks that stop enemies in their tracks.', {
    prerequisite: 'Level 4+, STR or DEX 13+',
    actions: [
      freeAction('sentinel_guardian', 'Guardian', 'reaction', 'When a creature within 5 ft takes the Disengage action or hits someone other than you: make a melee attack against it.'),
    ],
    passives: [passive('sentinel', 'Halt', `${ASI_PLUS_ONE('STR or DEX')} When you hit a creature with an Opportunity Attack, its Speed becomes 0 for the rest of the turn.`)],
  }),
  feat('general', 'shadow_touched', 'Shadow Touched', 'Invisibility and one level 1 Illusion or Necromancy spell, each free once per long rest.', {
    prerequisite: 'Level 4+',
    resources: [uses('feat_shadow_touched_invisibility', 'Shadow Touched: Invisibility')],
    grantedSpells: [
      freeSpell(spell('Invisibility', 2, { concentration: true, upcast: true, range: 'Touch', duration: '1 hour' }), 'feat_shadow_touched_invisibility', 'Shadow Touched'),
    ],
    passives: [passive('shadow_touched', 'Shadow Touched', ASI_PLUS_ONE('INT, WIS or CHA'))],
    spellChoices: [{ level: 1, count: 1, hint: 'One level 1 Illusion or Necromancy spell', freeUse: true }],
  }),
  general('sharpshooter', 'Sharpshooter', `${ASI_PLUS_ONE('DEX')} Ranged weapon attacks ignore Half and Three-Quarters Cover, have no Disadvantage within 5 ft of an enemy, and none at long range.`, 'Level 4+, DEX 13+'),
  feat('general', 'shield_master', 'Shield Master', 'Bash with your shield during the Attack action, and use it to avoid area damage.', {
    prerequisite: 'Level 4+, STR 13+, Shield training',
    actions: [
      freeAction('shield_master_interpose', 'Interpose Shield', 'reaction', 'When an effect lets you make a DEX save for half damage and you succeed: take no damage instead. You must be holding a Shield.'),
    ],
    passives: [
      passive('shield_master', 'Shield Bash', (b) =>
        `${ASI_PLUS_ONE('STR')} Once per turn when you hit with a melee weapon during the Attack action, the target makes a STR save (DC ${8 + PB(b) + abilityMod(b.abilities.str)}) or is pushed 5 ft or knocked Prone (your choice).`,
      ),
    ],
  }),
  general('skill_expert', 'Skill Expert', 'Increase one ability score by 1 (max 20). Proficiency in one skill and Expertise in one skill. Include it in the scores you type in.'),
  general('slasher', 'Slasher', `${ASI_PLUS_ONE('STR or DEX')} Once per turn when you hit with Slashing damage, the target's Speed drops by 10 ft until the start of your next turn. On a Slashing critical hit, the target has Disadvantage on attacks until the start of your next turn.`),
  general('speedy', 'Speedy', `${ASI_PLUS_ONE('DEX or CON')} Speed +10 ft. Difficult Terrain costs no extra movement when you Dash, and Opportunity Attacks against you have Disadvantage.`, 'Level 4+, DEX or CON 13+'),
  general('spell_sniper', 'Spell Sniper', `${ASI_PLUS_ONE('INT, WIS or CHA')} Spell attacks ignore Half and Three-Quarters Cover and have no Disadvantage within 5 ft of an enemy. Spells with a range of 10 ft or more that need an attack roll get +60 ft range.`, 'Level 4+, Spellcasting'),
  feat('general', 'telekinetic', 'Telekinetic', 'An invisible Mage Hand, and a Bonus Action shove from 30 ft away.', {
    prerequisite: 'Level 4+',
    actions: [
      freeAction('telekinetic_shove', 'Telekinetic Shove', 'bonus', (b) =>
        `One creature you can see within 30 ft makes a STR save (DC ${mentalDc(b)}, using your best of INT, WIS or CHA) or is moved 5 ft toward or away from you.`,
      ),
    ],
    grantedSpells: [{ spell: spell('Mage Hand', 0, { range: '60 ft', duration: '1 minute' }), minLevel: 1, note: 'Telekinetic: the hand is invisible and its range is 30 ft longer.' }],
    passives: [passive('telekinetic', 'Telekinetic', ASI_PLUS_ONE('INT, WIS or CHA'))],
  }),
  feat('general', 'telepathic', 'Telepathic', 'Speak telepathically within 60 ft, and Detect Thoughts free once per long rest.', {
    prerequisite: 'Level 4+',
    resources: [uses('feat_telepathic_detect_thoughts', 'Telepathic: Detect Thoughts')],
    grantedSpells: [
      freeSpell(spell('Detect Thoughts', 2, { concentration: true, range: 'Self', duration: '1 minute' }), 'feat_telepathic_detect_thoughts', 'Telepathic'),
    ],
    passives: [
      passive('telepathic', 'Telepathic Utterance', `${ASI_PLUS_ONE('INT, WIS or CHA')} You can speak telepathically to a creature you can see within 60 ft. It understands you only if it knows a language you know.`),
    ],
  }),
  feat('general', 'war_caster', 'War Caster', 'Advantage on Concentration saves, and cast a spell as an Opportunity Attack.', {
    prerequisite: 'Level 4+, Spellcasting',
    actions: [
      freeAction('war_caster_reactive_spell', 'Reactive Spell', 'reaction', 'When a creature provokes an Opportunity Attack from you: cast a spell with a casting time of an action that targets only that creature, instead of attacking. It still spends a slot if it needs one.'),
    ],
    passives: [
      passive('war_caster', 'War Caster', `${ASI_PLUS_ONE('INT, WIS or CHA')} Advantage on CON saves to keep Concentration. You can do Somatic components with weapons or a Shield in your hands.`),
    ],
  }),
  general('weapon_master', 'Weapon Master', `${ASI_PLUS_ONE('STR or DEX')} Use the Mastery property of one kind of Simple or Martial weapon. You can switch it after a long rest.`),
]

// ---------- Fighting Style ----------

const style = (id: string, name: string, summary: string) =>
  simple('fightingStyle', id, name, summary, 'Fighting Style feature')

const FIGHTING_STYLES: FeatDef[] = [
  style('archery', 'Archery', '+2 to attack rolls with Ranged weapons.'),
  style('blind_fighting', 'Blind Fighting', 'Blindsight 10 ft.'),
  style('defense', 'Defense', '+1 AC while wearing Light, Medium or Heavy armor. Include it in the AC you type in.'),
  style('dueling', 'Dueling', '+2 damage with a melee weapon in one hand when you hold no other weapons.'),
  style('great_weapon_fighting', 'Great Weapon Fighting', 'With a Two-Handed or Versatile melee weapon held in two hands, treat 1s and 2s on its damage dice as 3s.'),
  feat('fightingStyle', 'interception', 'Interception', 'Reaction: reduce the damage an ally next to you takes.', {
    prerequisite: 'Fighting Style feature',
    actions: [
      freeAction('interception', 'Interception', 'reaction', (b) =>
        `When a creature you can see hits someone else within 5 ft of you: reduce the damage by 1d10 + ${PB(b)}. You must be holding a Shield or a Simple or Martial weapon.`,
      ),
    ],
  }),
  feat('fightingStyle', 'protection', 'Protection', 'Reaction: protect an ally next to you with your shield.', {
    prerequisite: 'Fighting Style feature',
    actions: [
      freeAction('protection', 'Protection', 'reaction', 'When a creature attacks someone else within 5 ft of you: give Disadvantage to that attack and to every attack against them until the start of your next turn. You must be holding a Shield.'),
    ],
  }),
  style('thrown_weapon_fighting', 'Thrown Weapon Fighting', 'Draw a Thrown weapon as part of the attack, and +2 damage on ranged attacks with Thrown weapons.'),
  style('two_weapon_fighting', 'Two-Weapon Fighting', 'Add your ability modifier to the damage of the extra attack from the Light property.'),
  style('unarmed_fighting', 'Unarmed Fighting', 'Unarmed Strike deals 1d6 + STR (1d8 with no weapons or Shield in hand). A creature you grapple takes 1d4 Bludgeoning at the start of each of your turns.'),
]

export const ALL_FEATS: FeatDef[] = [...ORIGIN, ...GENERAL, ...FIGHTING_STYLES]

export const FEAT_CATEGORIES: { id: FeatCategory; name: string; hint: string }[] = [
  { id: 'origin', name: 'Origin feats', hint: 'Usually one from your background at level 1.' },
  { id: 'general', name: 'General feats', hint: 'Taken instead of an Ability Score Improvement, from level 4.' },
  { id: 'fightingStyle', name: 'Fighting Style feats', hint: "For classes with the Fighting Style feature (like a level 2 Paladin)." },
]
