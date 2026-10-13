import { describe, expect, it } from 'vitest'
import { spell } from '../data/helpers'
import { currentOf, getActions, getPassives, getResources, maxOf } from './character'
import { changeBuild, checkEvent, compact, currentState, dispatch, newTracker, undo } from './engine'
import type { CharacterBuild, GameEvent, Spell, Tracker } from './types'

const abilities = { str: 10, dex: 14, con: 14, int: 10, wis: 10, cha: 16 }

function sorcerer(level: number, spells: Spell[] = [], spellModifiers: string[] = []): CharacterBuild {
  return {
    name: 'Sorc',
    classId: 'sorcerer',
    subclassId: 'aberrant_sorcery',
    speciesId: null,
    lineageId: null,
    level,
    abilities,
    maxHp: 40,
    ac: 14,
    spells,
    spellModifiers,
  }
}

function paladin(level: number): CharacterBuild {
  return {
    name: 'Pal',
    classId: 'paladin',
    subclassId: 'oath_of_glory',
    speciesId: null,
    lineageId: null,
    level,
    abilities,
    maxHp: 60,
    ac: 14,
    spells: [],
    spellModifiers: [],
  }
}

const fireball = spell('Fireball', 3, { upcast: true })
const mistyStep = spell('Misty Step', 2, { castingTime: 'bonus' })

/** Dispatches events in order and fails the test if any is rejected. */
function run(build: CharacterBuild, events: GameEvent[], tracker: Tracker = newTracker(build)): Tracker {
  for (const ev of events) {
    const r = dispatch(build, tracker, ev)
    if (!r.ok) throw new Error(`${ev.type} rejected: ${r.reason}`)
    tracker = r.tracker
  }
  return tracker
}

const cast = (actionId: string, paymentId: string, extra: Partial<GameEvent> = {}): GameEvent =>
  ({ type: 'PERFORM_ACTION', actionId, paymentId, ...extra }) as GameEvent

describe('spell slots', () => {
  it('slot tables match the class level', () => {
    const b = sorcerer(9)
    expect([1, 2, 3, 4, 5].map((l) => maxOf(b, `slot_${l}`))).toEqual([4, 3, 3, 3, 1])
    const p = paladin(5)
    expect([1, 2, 3].map((l) => maxOf(p, `slot_${l}`))).toEqual([4, 2, 0])
  })

  it('casting Fireball at 4th level spends one 4th level slot and nothing else', () => {
    const b = sorcerer(7, [fireball])
    const before = currentState(b, newTracker(b))
    const after = currentState(b, run(b, [cast('spell:fireball', 'slot_4')]))
    expect(after.expended).toEqual({ slot_4: 1 })
    for (const r of getResources(b)) {
      const diff = r.id === 'slot_4' ? 1 : 0
      expect(currentOf(b, after, r.id)).toBe(currentOf(b, before, r.id) - diff)
    }
  })

  it('only offers slot levels at or above the spell level', () => {
    const b = sorcerer(7, [fireball])
    const fb = getActions(b).find((a) => a.id === 'spell:fireball')!
    expect(fb.payments.map((p) => p.id)).toEqual(['slot_3', 'slot_4'])
  })

  it("can't spend two slots on spells in the same turn", () => {
    const b = sorcerer(7, [fireball, mistyStep])
    const t = run(b, [cast('spell:fireball', 'slot_3')])
    const r = dispatch(b, t, cast('spell:misty-step', 'slot_2'))
    expect(r.ok).toBe(false)
    // New turn lifts the block.
    expect(() => run(b, [{ type: 'NEW_TURN' }, cast('spell:misty-step', 'slot_2')], t)).not.toThrow()
  })

  it('cantrips are not blocked by the one slot rule', () => {
    const b = sorcerer(7, [mistyStep, spell('Fire Bolt', 0)])
    expect(() => run(b, [cast('spell:misty-step', 'slot_2'), cast('spell:fire-bolt', 'cantrip')])).not.toThrow()
  })
})

describe('psionic sorcery', () => {
  it('a psionic spell paid with SP does not count against the one slot rule', () => {
    const b = sorcerer(6, [mistyStep])
    const t = run(b, [
      cast('spell:misty-step', 'slot_2'), // bonus action, uses the slot for this turn
      cast('spell:dissonant-whispers', 'psionic_sorcery'), // action, paid with 1 SP
    ])
    const s = currentState(b, t)
    expect(s.expended).toEqual({ slot_2: 1, sorcery_points: 1 })
  })

  it('a psionic spell paid with SP still lets you spend a slot afterward', () => {
    const b = sorcerer(6, [mistyStep])
    expect(() =>
      run(b, [cast('spell:dissonant-whispers', 'psionic_sorcery'), cast('spell:misty-step', 'slot_2')]),
    ).not.toThrow()
  })

  it('the SP option only exists from level 6', () => {
    const dw = (lvl: number) => getActions(sorcerer(lvl)).find((a) => a.id === 'spell:dissonant-whispers')!
    expect(dw(5).payments.some((p) => p.id === 'psionic_sorcery')).toBe(false)
    expect(dw(6).payments.some((p) => p.id === 'psionic_sorcery')).toBe(true)
  })
})

describe('font of magic', () => {
  it('converts a slot into sorcery points', () => {
    const b = sorcerer(5)
    // Spend some SP first so the gain isn't capped by the max.
    const t = run(b, [
      cast('font_points_to_slot', 'slot_1'), // -2 SP, +1 L1 slot
      { type: 'NEW_TURN' },
      cast('font_slot_to_points', 'slot_2'), // -1 L2 slot, +2 SP
    ])
    const s = currentState(b, t)
    expect(currentOf(b, s, 'sorcery_points')).toBe(5)
    expect(currentOf(b, s, 'slot_2')).toBe(2)
    expect(currentOf(b, s, 'slot_1')).toBe(5) // 4 + 1 created
  })

  it('converts sorcery points into a slot, above max, and the slot vanishes on a long rest', () => {
    const b = sorcerer(5)
    const t = run(b, [cast('font_points_to_slot', 'slot_3')]) // 5 SP
    let s = currentState(b, t)
    expect(currentOf(b, s, 'sorcery_points')).toBe(0)
    expect(currentOf(b, s, 'slot_3')).toBe(3)
    expect(s.turn.bonus).toBe(true)

    s = currentState(b, run(b, [{ type: 'LONG_REST' }], t))
    expect(currentOf(b, s, 'slot_3')).toBe(2)
    expect(currentOf(b, s, 'sorcery_points')).toBe(5)
  })

  it("can't create a slot level you're too low for", () => {
    const b = sorcerer(5)
    const font = getActions(b).find((a) => a.id === 'font_points_to_slot')!
    expect(font.payments.map((p) => p.id)).toEqual(['slot_1', 'slot_2', 'slot_3'])
  })

  it('slot to SP gain is capped at the SP max', () => {
    const b = sorcerer(5)
    const s = currentState(b, run(b, [cast('font_slot_to_points', 'slot_3')]))
    expect(currentOf(b, s, 'sorcery_points')).toBe(5)
  })
})

describe('sorcerer features', () => {
  it('Sorcerous Restoration restores half level SP on a short rest, once per long rest', () => {
    const b = sorcerer(6)
    const spendFive: GameEvent[] = [
      cast('font_points_to_slot', 'slot_3'),
      { type: 'NEW_TURN' },
      cast('innate_sorcery', 'use'),
    ]
    let t = run(b, spendFive)
    expect(currentOf(b, currentState(b, t), 'sorcery_points')).toBe(1)
    t = run(b, [{ type: 'SHORT_REST' }], t)
    expect(currentOf(b, currentState(b, t), 'sorcery_points')).toBe(4)
    t = run(b, [cast('font_points_to_slot', 'slot_2'), { type: 'SHORT_REST' }], t)
    expect(currentOf(b, currentState(b, t), 'sorcery_points')).toBe(1) // no second restoration
  })

  it('Sorcery Incarnate: 2 SP for Innate Sorcery, only once out of uses (L7)', () => {
    const b = sorcerer(7)
    let t = newTracker(b)
    expect(dispatch(b, t, cast('innate_sorcery', 'sorcery_incarnate')).ok).toBe(false)
    t = run(b, [
      cast('innate_sorcery', 'use'),
      { type: 'NEW_TURN' },
      cast('innate_sorcery', 'use'),
      { type: 'NEW_TURN' },
      cast('innate_sorcery', 'sorcery_incarnate'),
    ])
    expect(currentOf(b, currentState(b, t), 'sorcery_points')).toBe(5)
  })

  it('Quickened Spell turns an action spell into a bonus action for 2 SP', () => {
    const b = sorcerer(5, [fireball], ['quickened', 'subtle'])
    const t = run(b, [cast('spell:fireball', 'slot_3', { spellModifiers: ['quickened'] })])
    const s = currentState(b, t)
    expect(s.turn).toMatchObject({ action: false, bonus: true })
    expect(currentOf(b, s, 'sorcery_points')).toBe(3)
    // Only one non-combinable metamagic per spell.
    const r = dispatch(b, newTracker(b), cast('spell:fireball', 'slot_3', { spellModifiers: ['quickened', 'subtle'] }))
    expect(r.ok).toBe(false)
  })

  it('metamagic the player did not pick is rejected', () => {
    const b = sorcerer(5, [fireball], ['subtle'])
    expect(dispatch(b, newTracker(b), cast('spell:fireball', 'slot_3', { spellModifiers: ['twinned'] })).ok).toBe(false)
  })

  it('Empowered and Seeking stack with another metamagic', () => {
    const b = sorcerer(5, [fireball], ['quickened', 'empowered', 'seeking'])
    const t = run(b, [
      cast('spell:fireball', 'slot_3', { spellModifiers: ['quickened', 'empowered'] }),
      { type: 'AFTER_CAST_MODIFIER', modifierId: 'seeking' },
    ])
    expect(currentOf(b, currentState(b, t), 'sorcery_points')).toBe(1)
  })

  it('Seeking Spell is offered right after a spell, not before, and only once', () => {
    const fireBolt = spell('Fire Bolt', 0)
    const b = sorcerer(5, [fireball, fireBolt], ['seeking'])
    const seek: GameEvent = { type: 'AFTER_CAST_MODIFIER', modifierId: 'seeking' }
    // Not ticked before the cast, and not without a spell just cast.
    expect(dispatch(b, newTracker(b), cast('spell:fire-bolt', 'cantrip', { spellModifiers: ['seeking'] })).ok).toBe(false)
    expect(dispatch(b, newTracker(b), seek).ok).toBe(false)
    // Right after a cantrip: costs 1 SP, then it's gone.
    const t = run(b, [cast('spell:fire-bolt', 'cantrip'), seek])
    expect(currentOf(b, currentState(b, t), 'sorcery_points')).toBe(4)
    expect(dispatch(b, t, seek).ok).toBe(false)
    // Skipping it spends nothing and also closes the chance.
    const skipped = run(b, [cast('spell:fire-bolt', 'cantrip'), { type: 'SKIP_AFTER_CAST' }])
    expect(currentOf(b, currentState(b, skipped), 'sorcery_points')).toBe(5)
    expect(dispatch(b, skipped, seek).ok).toBe(false)
    // Undo brings the prompt back.
    expect(dispatch(b, undo(skipped), seek).ok).toBe(true)
  })

  it('Seeking Spell is not offered after a non-spell action or when out of SP', () => {
    const b = sorcerer(2, [spell('Fire Bolt', 0)], ['seeking'])
    const seek: GameEvent = { type: 'AFTER_CAST_MODIFIER', modifierId: 'seeking' }
    expect(dispatch(b, run(b, [cast('innate_sorcery', 'use')]), seek).ok).toBe(false)
    const broke = run(b, [cast('font_slot_to_points', 'slot_1'), cast('font_points_to_slot', 'slot_1')])
    // 2 SP to make a slot leaves 0 at level 2 (SP capped at max), so Seeking can't be paid.
    expect(currentOf(b, currentState(b, broke), 'sorcery_points')).toBe(0)
    expect(dispatch(b, run(b, [cast('spell:fire-bolt', 'cantrip')], broke), seek).ok).toBe(false)
  })

  it('Quickened Spell blocks other level 1+ spells that turn, before or after', () => {
    const fireBolt = spell('Fire Bolt', 0)
    const b = sorcerer(6, [fireball, fireBolt, mistyStep], ['quickened'])
    // After a Quickened Fireball, the action is free for a cantrip but not for a level 1+ spell,
    // even one paid with SP that wouldn't hit the one-slot rule.
    let t = run(b, [cast('spell:fireball', 'slot_3', { spellModifiers: ['quickened'] })])
    expect(dispatch(b, t, cast('spell:fire-bolt', 'cantrip')).ok).toBe(true)
    expect(dispatch(b, t, cast('spell:dissonant-whispers', 'psionic_sorcery')).ok).toBe(false)
    // Already cast a level 1+ spell (even without a slot): can't Quicken anything.
    t = run(b, [cast('spell:dissonant-whispers', 'slot_1')])
    expect(dispatch(b, t, cast('spell:fire-bolt', 'cantrip', { spellModifiers: ['quickened'] })).ok).toBe(false)
    // New turn clears it.
    expect(() => run(b, [{ type: 'NEW_TURN' }, cast('spell:fire-bolt', 'cantrip', { spellModifiers: ['quickened'] })], t)).not.toThrow()
  })

  it('Twinned Spell only works on level 1+ spells that can be upcast', () => {
    const b = sorcerer(5, [fireball, spell('Fire Bolt', 0), spell('Shield', 1, { castingTime: 'reaction' })], ['twinned'])
    expect(dispatch(b, newTracker(b), cast('spell:fireball', 'slot_3', { spellModifiers: ['twinned'] })).ok).toBe(true)
    expect(dispatch(b, newTracker(b), cast('spell:fire-bolt', 'cantrip', { spellModifiers: ['twinned'] })).ok).toBe(false)
    expect(dispatch(b, newTracker(b), cast('spell:shield', 'slot_1', { spellModifiers: ['twinned'] })).ok).toBe(false)
  })

  it('metamagic on a psionic spell paid with SP costs both', () => {
    const b = sorcerer(6, [], ['subtle'])
    const t = run(b, [cast('spell:dissonant-whispers', 'psionic_sorcery', { spellModifiers: ['subtle'] })])
    expect(currentOf(b, currentState(b, t), 'sorcery_points')).toBe(4)
  })
})

describe('turn economy', () => {
  it('blocks a second bonus action and resets on a new turn', () => {
    const b = paladin(3)
    const t = run(b, [cast('lay_on_hands', 'pool', { amount: 3 })])
    const r = dispatch(b, t, cast('divine_sense', 'channel_divinity'))
    expect(r.ok).toBe(false)
    expect(() => run(b, [{ type: 'NEW_TURN' }, cast('divine_sense', 'channel_divinity')], t)).not.toThrow()
  })

  it('Divine Smite with a slot grays out other bonus actions and other slotted spells', () => {
    const b: CharacterBuild = { ...paladin(5), spells: [spell('Bless', 1, { concentration: true })] }
    const s = currentState(b, run(b, [cast('spell:divine-smite', 'slot_1')]))
    expect(checkEvent(b, s, cast('peerless_athlete', 'channel_divinity')).ok).toBe(false)
    expect(checkEvent(b, s, cast('spell:bless', 'slot_1')).ok).toBe(false)
  })

  it('marking an attack uses the action', () => {
    const b = paladin(5)
    const t = run(b, [{ type: 'USE_ECONOMY', economy: 'action' }])
    expect(dispatch(b, t, { type: 'USE_ECONOMY', economy: 'action' }).ok).toBe(false)
  })
})

describe('paladin features', () => {
  it('short rest restores one Channel Divinity, long rest restores both', () => {
    const b = paladin(3)
    let t = run(b, [
      cast('divine_sense', 'channel_divinity'),
      { type: 'NEW_TURN' },
      cast('peerless_athlete', 'channel_divinity'),
    ])
    expect(currentOf(b, currentState(b, t), 'channel_divinity')).toBe(0)
    t = run(b, [{ type: 'SHORT_REST' }], t)
    expect(currentOf(b, currentState(b, t), 'channel_divinity')).toBe(1)
    t = run(b, [{ type: 'NEW_TURN' }, cast('divine_sense', 'channel_divinity'), { type: 'LONG_REST' }], t)
    expect(currentOf(b, currentState(b, t), 'channel_divinity')).toBe(2)
  })

  it('Inspiring Smite only becomes available right after Divine Smite', () => {
    const b = paladin(3)
    const inspiring = cast('inspiring_smite', 'channel_divinity')
    expect(dispatch(b, newTracker(b), inspiring).ok).toBe(false)

    const afterSmite = run(b, [cast('spell:divine-smite', 'free_use')])
    expect(currentState(b, afterSmite).turn.followUps).toEqual(['inspiring_smite'])
    expect(dispatch(b, afterSmite, inspiring).ok).toBe(true)

    // Gone once something else happens.
    const afterOther = run(b, [{ type: 'USE_ECONOMY', economy: 'action' }], afterSmite)
    expect(dispatch(b, afterOther, inspiring).ok).toBe(false)
  })

  it('skipping a follow up removes it, and undo brings it back', () => {
    const b = paladin(3)
    const t = run(b, [cast('spell:divine-smite', 'free_use'), { type: 'DISMISS_FOLLOW_UPS' }])
    expect(currentState(b, t).turn.followUps).toEqual([])
    expect(currentState(b, undo(t)).turn.followUps).toEqual(['inspiring_smite'])
    expect(dispatch(b, t, { type: 'DISMISS_FOLLOW_UPS' }).ok).toBe(false)
  })

  it("free Divine Smite doesn't spend a slot, so a slotted spell is still allowed", () => {
    const b: CharacterBuild = { ...paladin(3), spells: [spell('Bless', 1, { concentration: true })] }
    const t = run(b, [cast('spell:divine-smite', 'free_use'), cast('spell:bless', 'slot_1')])
    expect(currentState(b, t).expended).toEqual({ paladins_smite: 1, slot_1: 1 })
  })

  it('Lay on Hands spends a chosen amount and refuses more than the pool', () => {
    const b = paladin(4) // pool 20
    const t = run(b, [cast('lay_on_hands', 'pool', { amount: 7 })])
    expect(currentOf(b, currentState(b, t), 'lay_on_hands')).toBe(13)
    const r = dispatch(b, run(b, [{ type: 'NEW_TURN' }], t), cast('lay_on_hands', 'pool', { amount: 14 }))
    expect(r.ok).toBe(false)
  })

  it('passives show up by level', () => {
    expect(getPassives(paladin(5)).map((p) => p.id)).toEqual(['extra_attack'])
    expect(getPassives(paladin(7)).map((p) => p.id)).toEqual(['extra_attack', 'aura_of_protection', 'aura_of_alacrity'])
  })
})

describe('rests and HP', () => {
  it("short rest can't spend more hit dice than you have, and undoes in one step", () => {
    const b = paladin(2)
    const t = run(b, [{ type: 'DAMAGE', amount: 20 }])
    expect(dispatch(b, t, { type: 'SHORT_REST', hitDice: { count: 3, healing: 10 } }).ok).toBe(false)
    const rested = run(b, [{ type: 'SHORT_REST', hitDice: { count: 2, healing: 12 } }], t)
    expect(currentState(b, rested).hp.current).toBe(52)
    expect(currentState(b, undo(rested)).hp.current).toBe(40)
  })

  it('long rest restores all hit point dice, HP, and clears temp HP', () => {
    const b = paladin(6)
    let t = run(b, [
      { type: 'DAMAGE', amount: 30 },
      { type: 'SHORT_REST', hitDice: { count: 4, healing: 25 } },
      { type: 'SET_TEMP_HP', amount: 5 },
    ])
    let s = currentState(b, t)
    expect(currentOf(b, s, 'hit_dice')).toBe(2)
    expect(s.hp).toEqual({ current: 55, temp: 5 })
    t = run(b, [{ type: 'LONG_REST' }], t)
    s = currentState(b, t)
    expect(currentOf(b, s, 'hit_dice')).toBe(6)
    expect(s.hp).toEqual({ current: 60, temp: 0 })
  })

  it('damage hits temp HP first and never goes below 0', () => {
    const b = paladin(1)
    const s = currentState(b, run(b, [{ type: 'SET_TEMP_HP', amount: 5 }, { type: 'DAMAGE', amount: 8 }]))
    expect(s.hp).toEqual({ current: 57, temp: 0 })
    const dead = currentState(b, run(b, [{ type: 'DAMAGE', amount: 999 }]))
    expect(dead.hp.current).toBe(0)
  })
})

describe('effects', () => {
  it('casting a concentration spell warns and replaces the old one', () => {
    const b: CharacterBuild = { ...paladin(3), spells: [spell('Bless', 1, { concentration: true })] }
    const t = run(b, [cast('spell:heroism', 'slot_1'), { type: 'NEW_TURN' }])
    const r = dispatch(b, t, cast('spell:bless', 'slot_1'))
    expect(r.ok && r.warnings.length).toBe(1)
    const s = currentState(b, r.ok ? r.tracker : t)
    expect(s.effects.filter((e) => e.concentration).map((e) => e.name)).toEqual(['Bless'])
  })

  it("a concentration spell's effect shows the spell's duration", () => {
    const b: CharacterBuild = { ...paladin(3), spells: [spell('Bless', 1, { concentration: true })] }
    const s = currentState(b, run(b, [cast('spell:heroism', 'slot_1'), { type: 'NEW_TURN' }, cast('spell:bless', 'slot_1')]))
    expect(s.effects.map((e) => e.duration)).toEqual(['Concentration']) // Bless has no duration typed in
    const h = currentState(b, run(b, [cast('spell:heroism', 'slot_1')]))
    expect(h.effects.map((e) => e.duration)).toEqual(['Concentration, 1 minute'])
  })

  it('spells that last longer than a round show up as effects, instant ones do not', () => {
    const b: CharacterBuild = {
      ...paladin(5),
      spells: [
        spell('Fire Bolt', 0, { duration: 'Instantaneous' }),
        spell('Blade Ward', 0, { duration: '1 round' }),
        spell('Shield of Faith', 1, { concentration: true, duration: '10 minutes' }),
      ],
    }
    const s = currentState(
      b,
      run(b, [
        cast('spell:shield-of-faith', 'slot_1'),
        { type: 'NEW_TURN' },
        cast('spell:magic-weapon', 'slot_2'),
        { type: 'NEW_TURN' },
        cast('spell:fire-bolt', 'cantrip'),
        { type: 'NEW_TURN' },
        cast('spell:blade-ward', 'cantrip'),
      ]),
    )
    // Magic Weapon (1 hour, no concentration) doesn't end concentration on Shield of Faith.
    expect(s.effects.map((e) => [e.name, e.duration, e.concentration])).toEqual([
      ['Shield of Faith', 'Concentration, 10 minutes', true],
      ['Magic Weapon', '1 hour', false],
    ])
  })

  it('effects get a resolved duration and can be ended', () => {
    const b = sorcerer(3)
    const t = run(b, [cast('telepathic_speech', 'free')])
    const s = currentState(b, t)
    expect(s.effects).toMatchObject([{ id: 1, name: 'Telepathic Speech', duration: '3 minutes' }])
    expect(currentState(b, run(b, [{ type: 'END_EFFECT', effectId: 1 }], t)).effects).toEqual([])
  })
})

describe('undo', () => {
  it('undo reverses the last event', () => {
    const b = sorcerer(7, [fireball])
    const t = run(b, [{ type: 'DAMAGE', amount: 5 }, cast('spell:fireball', 'slot_4')])
    const undone = undo(t)
    const s = currentState(b, undone)
    expect(s.expended).toEqual({})
    expect(s.turn.action).toBe(false)
    expect(s.hp.current).toBe(35) // the earlier event stays
  })

  it('compact keeps the state the same and limits how far back you can undo', () => {
    const b = sorcerer(7, [fireball])
    const t = run(b, [{ type: 'DAMAGE', amount: 5 }, cast('spell:fireball', 'slot_4')])
    const c = compact(b, t, 1)
    expect(c.log).toHaveLength(1)
    expect(currentState(b, c)).toEqual(currentState(b, t))
    expect(currentState(b, undo(c)).hp.current).toBe(35)
  })
})

describe('changing the build', () => {
  it('keeps spent resources, clamps HP, and starts fresh on a class change', () => {
    const b = sorcerer(5, [fireball])
    const t = run(b, [cast('spell:fireball', 'slot_3'), { type: 'DAMAGE', amount: 5 }])
    const leveled = changeBuild(b, { ...b, level: 6, maxHp: 30 }, t)
    const s = currentState({ ...b, level: 6, maxHp: 30 }, leveled)
    expect(s.expended).toEqual({ slot_3: 1 })
    expect(s.hp.current).toBe(30)
    expect(leveled.log).toEqual([])

    const p = paladin(5)
    expect(currentState(p, changeBuild(b, p, t)).expended).toEqual({})
  })
})

describe('basic actions', () => {
  it('every class gets the basic actions in the right economy', () => {
    for (const b of [sorcerer(1), paladin(1)]) {
      const basics = getActions(b).filter((a) => a.basic)
      expect(basics.filter((a) => a.economy === 'action').map((a) => a.name)).toEqual([
        'Attack',
        'Dash',
        'Disengage',
        'Dodge',
        'Help',
        'Hide',
        'Influence',
        'Magic',
        'Ready',
        'Search',
        'Study',
        'Utilize',
      ])
      expect(basics.filter((a) => a.economy === 'bonus')).toHaveLength(1)
      expect(basics.filter((a) => a.economy === 'reaction').map((a) => a.name)).toEqual([
        'Opportunity Attack',
        'Readied action',
      ])
    }
  })

  it('Attack uses the action, Opportunity Attack uses the reaction', () => {
    const b = paladin(5)
    const t = run(b, [cast('basic_attack', 'use'), cast('basic_opportunity_attack', 'use')])
    expect(currentState(b, t).turn).toMatchObject({ action: true, bonus: false, reaction: true })
    expect(dispatch(b, t, cast('basic_dash', 'use')).ok).toBe(false)
  })

  it('Dodge ends on a new turn, Hide does not', () => {
    const b = paladin(5)
    const t = run(b, [cast('basic_dodge', 'use'), { type: 'NEW_TURN' }, cast('basic_hide', 'use')])
    expect(currentState(b, t).effects.map((e) => e.name)).toEqual(['Hidden'])
    const t2 = run(b, [cast('basic_dodge', 'use')])
    expect(currentState(b, t2).effects.map((e) => e.name)).toEqual(['Dodging'])
    expect(currentState(b, run(b, [{ type: 'NEW_TURN' }], t2)).effects).toEqual([])
  })
})
