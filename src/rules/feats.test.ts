import { describe, expect, it } from 'vitest'
import { ALL_FEATS } from '../data/feats'
import { spell } from '../data/helpers'
import { currentOf, getActions, getPassives, maxOf } from './character'
import { currentState, dispatch, newTracker } from './engine'
import type { CharacterBuild, FeatPick, GameEvent, Tracker } from './types'

function sorcerer(level: number, feats: FeatPick[]): CharacterBuild {
  return {
    name: 'Sorc',
    classId: 'sorcerer',
    subclassId: 'aberrant_sorcery',
    speciesId: null,
    lineageId: null,
    level,
    abilities: { str: 10, dex: 14, con: 14, int: 10, wis: 10, cha: 16 },
    maxHp: 40,
    ac: 14,
    spells: [],
    spellModifiers: [],
    feats,
  }
}

function run(b: CharacterBuild, events: GameEvent[], tracker: Tracker = newTracker(b)): Tracker {
  for (const ev of events) {
    const r = dispatch(b, tracker, ev)
    if (!r.ok) throw new Error(`${ev.type} rejected: ${r.reason}`)
    tracker = r.tracker
  }
  return tracker
}

const use = (actionId: string, paymentId: string): GameEvent => ({ type: 'PERFORM_ACTION', actionId, paymentId }) as GameEvent

describe('feats', () => {
  it('feat ids are unique and every feat is in one of the three lists', () => {
    expect(new Set(ALL_FEATS.map((f) => f.id)).size).toBe(ALL_FEATS.length)
    expect(new Set(ALL_FEATS.map((f) => f.category))).toEqual(new Set(['origin', 'general', 'fightingStyle']))
  })

  it('every feat shows up somewhere and is tagged with the feat name', () => {
    for (const f of ALL_FEATS) {
      const b = sorcerer(5, [{ id: f.id }])
      const fromFeat = [...getActions(b), ...getPassives(b)].filter((x) => x.source?.kind === 'feat')
      // Magic Initiate has nothing until spells are chosen for it.
      if (f.id !== 'magic_initiate') expect(fromFeat.length, f.name).toBeGreaterThan(0)
      expect(fromFeat.every((x) => x.source?.name === f.name)).toBe(true)
    }
  })

  it('a character with no feats (an old save) still works', () => {
    const { feats: _feats, ...old } = sorcerer(5, [])
    expect(() => getActions(old)).not.toThrow()
  })

  it('several feats can be picked at once', () => {
    const b = sorcerer(5, [{ id: 'lucky' }, { id: 'war_caster' }, { id: 'archery' }])
    const featNames = new Set(
      [...getActions(b), ...getPassives(b)].flatMap((x) => (x.source?.kind === 'feat' ? [x.source.name] : [])),
    )
    expect([...featNames].sort()).toEqual(['Archery', 'Lucky', 'War Caster'])
  })

  it('Lucky gives Proficiency Bonus luck points that come back on a long rest', () => {
    const b = sorcerer(5, [{ id: 'lucky' }])
    expect(maxOf(b, 'feat_lucky')).toBe(3)
    let t = run(b, [use('feat_lucky', 'use'), use('feat_lucky', 'use')])
    expect(currentOf(b, currentState(b, t), 'feat_lucky')).toBe(1)
    t = run(b, [{ type: 'LONG_REST' }], t)
    expect(currentOf(b, currentState(b, t), 'feat_lucky')).toBe(3)
  })

  it("Magic Initiate's level 1 spell is free once per long rest, and its cantrips are granted", () => {
    const b = sorcerer(5, [
      { id: 'magic_initiate', spells: [spell('Guidance', 0), spell('Light', 0), spell('Healing Word', 1, { castingTime: 'bonus' })] },
    ])
    const ids = getActions(b).map((a) => a.id)
    expect(ids).toEqual(expect.arrayContaining(['spell:guidance', 'spell:light', 'spell:healing-word']))

    const free = 'free_feat_magic_initiate_healing-word'
    let t = run(b, [use('spell:healing-word', free)])
    let s = currentState(b, t)
    expect(currentOf(b, s, 'slot_1')).toBe(4) // no slot spent
    expect(dispatch(b, run(b, [{ type: 'NEW_TURN' }], t), use('spell:healing-word', free)).ok).toBe(false)
    t = run(b, [{ type: 'LONG_REST' }], t)
    s = currentState(b, t)
    expect(currentOf(b, s, 'feat_magic_initiate_healing-word')).toBe(1)
  })

  it("Fey Touched's free Misty Step doesn't use up the turn's one spell slot", () => {
    const b = sorcerer(5, [{ id: 'fey_touched' }])
    const t = run(b, [use('spell:misty-step', 'free_feat_fey_touched_misty_step')])
    expect(currentOf(b, currentState(b, t), 'slot_2')).toBe(3)
    // A slotted spell is still allowed this turn.
    expect(dispatch(b, t, use('spell:mind-sliver', 'cantrip')).ok).toBe(true)
  })

  it('a spell granted by a feat and a subclass is one card with both ways to pay', () => {
    const b = sorcerer(6, [{ id: 'telepathic' }])
    const cards = getActions(b).filter((a) => a.id === 'spell:detect-thoughts')
    expect(cards).toHaveLength(1)
    const payments = cards[0]!.payments.map((p) => p.id)
    expect(payments).toEqual(expect.arrayContaining(['slot_2', 'psionic_sorcery', 'free_feat_telepathic_detect_thoughts']))
  })

  it('Durable spends a Hit Point Die as a Bonus Action', () => {
    const b = sorcerer(5, [{ id: 'durable' }])
    const t = run(b, [use('feat_durable_speedy_recovery', 'use')])
    const s = currentState(b, t)
    expect(currentOf(b, s, 'hit_dice')).toBe(4)
    expect(s.turn.bonus).toBe(true)
  })

  it("Mage Slayer's Guarded Mind comes back on a short rest", () => {
    const b = sorcerer(5, [{ id: 'mage_slayer' }])
    let t = run(b, [use('feat_mage_slayer', 'use')])
    expect(currentOf(b, currentState(b, t), 'feat_mage_slayer')).toBe(0)
    t = run(b, [{ type: 'SHORT_REST' }], t)
    expect(currentOf(b, currentState(b, t), 'feat_mage_slayer')).toBe(1)
  })
})
