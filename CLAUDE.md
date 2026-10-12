# D&D 2024 Combat Tracker

## What this is

A web app that works as a live character sheet tracker for D&D 2024 (5.5e). It's for two friends who keep losing track of their actions, bonus actions, reactions and resources during combat.

This is a **tracker, not a character builder**. The player types in their level, ability scores, max HP and spells. The app handles everything that happens at the table: spending resources, tracking the turn, rests, HP.

## Tech stack

* Vite + React + TypeScript (strict mode)
* Daisy Ui + Tailwind css
* Zustand for state, using its `persist` middleware for localStorage
* Vitest for tests
* Supabase (auth + Postgres) added LATER, in phase 4. Do not add it before then.
* Keep dependencies minimal. Ask before adding anything beyond the above.

## Architecture (React flavored MVVM)

```
src/
  rules/        # MODEL. Pure TypeScript, no React imports. Engine + types.
  data/         # Class, subclass and spell data. Plain objects, no logic beyond small formulas.
  store/        # VIEWMODEL. Zustand store + hooks (useCharacter). Calls into rules/.
  components/   # VIEW. Dumb components that render and call store actions.
```

Rules:

1. Everything in `rules/` is a pure function and has tests. No React, no Supabase, no side effects.
2. Components never do rules math. They call store actions like `castSpell(spellId, payment)` or `shortRest()`.
3. Every state change goes through an event (`{ type: "CAST_SPELL", ... }`) that gets appended to a log. This is how undo works. Undo should be one click because people misclick at the table constantly.

## Core data model

Everything is either a **Resource** or an **Action**. Adding a class should mean adding data, not adding engine logic. If a feature seems to need class specific code in the engine, stop and find the general pattern instead.

### Resources

Anything with a current and a max: spell slots (one resource per slot level), sorcery points, Lay on Hands pool, Channel Divinity, hit point dice, limited use features.

* **Max is computed, never stored.** It's a function of the character (level, ability mods).
* **What gets stored is the amount used**, e.g. `expended: { slot_3: 1, sorcery_points: 4 }`.
* Recharge is a rule per rest type, not just a flag. Examples: "all on long rest", "one use on short rest", "up to half level, once per long rest".
* Max HP is the one exception and IS stored, since players type it in.

### Actions

Every action has:

* `economy`: `"action" | "bonus" | "reaction" | "free"`
* `payment`: a list of **payment options** the user picks from. Each option is a list of costs. Example: a psionic spell can be paid with a slot of level N OR with N sorcery points.
* Optional **variable cost** where the user picks the amount (Lay on Hands).
* Optional **follow ups**: actions that only show up right after this one resolves (Inspiring Smite after Divine Smite).
* Optional **effect** with a duration that shows up in an "Active effects" list (Innate Sorcery, Peerless Athlete, concentration spells).

### Patterns the engine must support

1. **Costs**: an action spends resources.
2. **Payment options**: pick between ways to pay (slot, sorcery points, a free use).
3. **Variable costs**: user picks the amount.
4. **Conversions**: spend X to gain Y (Font of Magic).
5. **Partial recharges**: rests restore a set amount instead of everything.
6. **Follow ups**: actions unlocked by another action.
7. **Modifiers**: a feature changes another rule (e.g. a formula for max or recharge).
8. **Active effects**: things running with a duration, including concentration.

### Spells

* Do NOT hard code a full spell list. Players add their own spells.
* Adding a spell has to be quick. Only `name` and `level` are required. `castingTime` defaults to `"action"`.
* Later we'll add a search box backed by an SRD 5.2 spell JSON file (CC BY 4.0) that autofills fields. The custom form stays as a fallback for spells not in the SRD.

```ts
type Spell = {
  name: string
  level: number              // 0 = cantrip
  castingTime: "action" | "bonus" | "reaction" | "other"
  concentration: boolean
  ritual: boolean
  upcast: boolean
  note?: string
}
```

`castingTime` decides which list (Action / Bonus / Reaction) the spell shows up in. Casting a spell shows only the slot levels at or above the spell's level that still have slots left. Picking one spends it right away on screen.

## Turn tracker

This is the main problem we're solving, so it should be the most visible part of the UI.

* Action, Bonus Action and Reaction indicators that get used up as the player acts.
* A **New Turn** button that resets action and bonus action. Reaction resets at the start of the player's turn too.
* **2024 rule: only one spell slot can be spent on spells per turn.** Enforce it. Spells paid with sorcery points (Psionic Sorcery) or free uses don't spend a slot, so they aren't blocked.
* Once something is used, related options gray out. Example: after a Paladin casts Divine Smite (a bonus action spell that uses a slot), other bonus actions AND other slotted spells gray out for that turn.
* Warn when casting a concentration spell while already concentrating.

## Rests and HP

* Track current HP, max HP, temp HP.
* Hit point dice: count by class die. Short rest lets you spend them. Long rest restores all HP and **all** hit point dice (2024 rule).
* Short rest and long rest buttons apply every resource's recharge rule.

## Classes in scope

Only these two for now. Support levels 1 through 10. Level is entered by the player.

**If you are not sure about a rule, do not guess.** Put a `// TODO(rules): ...` comment and mention it in your summary so I can check it.

### Sorcerer (Aberrant Sorcery subclass)

* Hit die d6. Full caster.
* **Innate Sorcery** (L1): bonus action, lasts 1 minute, 2 uses per long rest.
* **Font of Magic** (L2): sorcery points = sorcerer level, all back on long rest.
  * Slot to SP: spend a slot, gain SP equal to its level. No action.
  * SP to slot: bonus action. Costs: L1 = 2, L2 = 3, L3 = 5, L4 = 6, L5 = 7. Max level 5. Created slots vanish on a long rest.
* **Metamagic** (L2): pick 2 options, more at L10. Each costs SP and modifies a spell cast. Quickened (2 SP) makes an action spell a bonus action. Heightened is 2 SP, most others are 1. Mark costs as TODO(rules) if unsure.
* **Sorcerous Restoration** (L5): on a short rest, regain SP up to half sorcerer level (rounded down). Once per long rest.
* **Sorcery Incarnate** (L7): if out of Innate Sorcery uses, spend 2 SP to activate it.
* **Aberrant, Psionic Spells** (L3): always prepared. L3: Arms of Hadar, Calm Emotions, Detect Thoughts, Dissonant Whispers, Mind Sliver. L5: Hunger of Hadar, Sending. L7: Evard's Black Tentacles, Summon Aberration. L9: Rary's Telepathic Bond, Telekinesis.
* **Aberrant, Telepathic Speech** (L3): bonus action.
* **Aberrant, Psionic Sorcery** (L6): psionic spells of level 1+ can be paid with a slot OR with SP equal to the spell's level. Paying with SP doesn't spend a slot.
* **Aberrant, Psychic Defenses** (L6): passive, just display it.

### Paladin (Oath of Glory subclass)

* Hit die d10. Half caster.
* **Lay on Hands** (L1): bonus action. Pool = 5 x paladin level, all back on long rest. Variable cost. Spending 5 can remove the Poisoned condition instead of healing.
* **Paladin's Smite** (L2): Divine Smite is always prepared, and can be cast once per long rest without a slot.
* **Divine Smite**: bonus action spell, level 1, cast right after hitting with a melee weapon or unarmed strike. 2d8 radiant +1d8 per slot level above 1st. Upcastable.
* **Channel Divinity** (L3): 2 uses. Regain ONE on a short rest, all on a long rest. Divine Sense is a bonus action option.
* **Faithful Steed** (L5): Find Steed always prepared, one free cast per long rest.
* **Extra Attack** (L5), **Aura of Protection** (L6): display only.
* **Abjure Foes** (L9): Channel Divinity option, action.
* **Glory, Oath Spells**: L3: Guiding Bolt, Heroism. L5: Enhance Ability, Magic Weapon. L9: Haste, Protection from Energy.
* **Glory, Peerless Athlete** (L3): bonus action, costs 1 Channel Divinity, lasts 1 hour.
* **Glory, Inspiring Smite** (L3): follow up right after casting Divine Smite. Costs 1 Channel Divinity. Hands out temp HP (2d8 + paladin level).
* **Glory, Aura of Alacrity** (L7): display only.

### Spell slot tables (levels 1 to 10)

Full caster (Sorcerer):

| Lvl | 1st | 2nd | 3rd | 4th | 5th |
|---|---|---|---|---|---|
| 1 | 2 | | | | |
| 2 | 3 | | | | |
| 3 | 4 | 2 | | | |
| 4 | 4 | 3 | | | |
| 5 | 4 | 3 | 2 | | |
| 6 | 4 | 3 | 3 | | |
| 7 | 4 | 3 | 3 | 1 | |
| 8 | 4 | 3 | 3 | 2 | |
| 9 | 4 | 3 | 3 | 3 | 1 |
| 10 | 4 | 3 | 3 | 3 | 2 |

Half caster (Paladin, 2024 gets slots at level 1):

| Lvl | 1st | 2nd | 3rd |
|---|---|---|---|
| 1 | 2 | | |
| 2 | 2 | | |
| 3 | 3 | | |
| 4 | 3 | | |
| 5 | 4 | 2 | |
| 6 | 4 | 2 | |
| 7 | 4 | 3 | |
| 8 | 4 | 3 | |
| 9 | 4 | 3 | 2 |
| 10 | 4 | 3 | 2 |

## Build phases

Do one phase at a time. Stop at the end of each phase, summarize what you did, and list any TODO(rules) items.

1. **Rules engine, no UI.** Types, the engine, data for both classes, slot tables. Tests for at least:
   * Casting Fireball at 4th level spends one 4th level slot and nothing else.
   * Can't spend two slots on spells in the same turn.
   * A psionic spell paid with SP doesn't count against the one slot rule.
   * Font of Magic conversions both ways.
   * Short rest restores one Channel Divinity, long rest restores both.
   * Inspiring Smite only becomes available right after Divine Smite.
   * Long rest restores all hit point dice.
   * Undo reverses the last event.
2. **Basic UI on local state.** Character setup form, resource trackers, HP, Action / Bonus / Reaction lists, turn tracker, rest buttons, undo. Persist to localStorage. Mobile friendly, since people will use it on their phones at the table.
3. **Polish.** Quick add spell form, active effects list, concentration warning, follow up prompts.
4. **Supabase.** Auth (magic link email), one `characters` table with `build jsonb` and `state jsonb`, row level security so users only see their own characters. **localStorage stays the main copy** and syncs to Supabase in the background, so the app still works if the database is paused or wifi is bad.
5. **Keep alive.** GitHub Actions cron that does a tiny read against Supabase every 3 days. Free projects pause after 7 days of no activity and we only play every couple weeks.

## Working style

* Explain decisions briefly. I'm learning this stack, so tell me when something I'm asking for is a bad idea instead of just doing it.
* Run the tests before saying a phase is done.
* Don't add features that aren't in this file without asking first.
