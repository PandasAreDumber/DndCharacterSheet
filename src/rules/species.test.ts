import { describe, expect, it } from 'vitest'
import { ALL_SPECIES } from '../data/species'
import { proficiencyBonus } from './abilities'
import { currentOf, getActions, getPassives, getResources, maxOf, resolveText } from './character'
import { currentState, dispatch, newTracker } from './engine'
import type { CharacterBuild, GameEvent, Tracker } from './types'

function build(speciesId: string, lineageId: string | null, level = 5, classId = 'paladin'): CharacterBuild {
  return {
    name: 'Test',
    classId,
    subclassId: classId === 'paladin' ? 'oath_of_glory' : 'aberrant_sorcery',
    speciesId,
    lineageId,
    level,
    abilities: { str: 16, dex: 10, con: 14, int: 8, wis: 12, cha: 16 },
    maxHp: 50,
    ac: 14,
    spells: [],
    spellModifiers: [],
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

const use = (actionId: string, paymentId = 'use'): GameEvent => ({ type: 'PERFORM_ACTION', actionId, paymentId })

describe('species data', () => {
  it('has all 10 species from the 2024 handbook', () => {
    expect(ALL_SPECIES.map((s) => s.name)).toEqual([
      'Aasimar',
      'Dragonborn',
      'Dwarf',
      'Elf',
      'Gnome',
      'Goliath',
      'Halfling',
      'Human',
      'Orc',
      'Tiefling',
    ])
    const lineages = Object.fromEntries(ALL_SPECIES.map((s) => [s.id, s.lineages.length]))
    expect(lineages).toMatchObject({ dragonborn: 10, elf: 3, gnome: 2, goliath: 6, tiefling: 3 })
  })

  it('every species and lineage works with both classes at every level, with unique ids', () => {
    for (const s of ALL_SPECIES) {
      for (const lineageId of s.lineages.length ? s.lineages.map((l) => l.id) : [null]) {
        for (const classId of ['paladin', 'sorcerer']) {
          for (let level = 1; level <= 10; level++) {
            const b = build(s.id, lineageId, level, classId)
            const resourceIds = getResources(b).map((r) => r.id)
            const actionIds = getActions(b).map((a) => a.id)
            expect(new Set(resourceIds).size).toBe(resourceIds.length)
            expect(new Set(actionIds).size).toBe(actionIds.length)
            for (const a of getActions(b)) if (a.note) resolveText(a.note, b)
            for (const p of getPassives(b)) resolveText(p.text, b)
          }
        }
      }
    }
  })
})

describe('proficiency bonus', () => {
  it('goes up every 4 levels', () => {
    expect([1, 4, 5, 8, 9, 10].map(proficiencyBonus)).toEqual([2, 2, 3, 3, 4, 4])
  })
})

describe('species features', () => {
  it('Orc Adrenaline Rush: PB uses, gives PB temp HP, recharges on a short rest', () => {
    const b = build('orc', null, 5) // PB 3
    expect(maxOf(b, 'species_adrenaline_rush')).toBe(3)
    let t = run(b, [use('species_adrenaline_rush')])
    let s = currentState(b, t)
    expect(s.hp.temp).toBe(3)
    expect(s.turn.bonus).toBe(true)
    t = run(b, [{ type: 'SHORT_REST' }], t)
    s = currentState(b, t)
    expect(currentOf(b, s, 'species_adrenaline_rush')).toBe(3)
  })

  it('temp HP from an action never lowers higher temp HP you already have', () => {
    const b = build('orc', null, 5)
    const s = currentState(b, run(b, [{ type: 'SET_TEMP_HP', amount: 10 }, use('species_adrenaline_rush')]))
    expect(s.hp.temp).toBe(10)
  })

  it('Orc Relentless Endurance brings you back to 1 HP, once per long rest', () => {
    const b = build('orc', null, 5)
    const t = run(b, [{ type: 'DAMAGE', amount: 999 }, use('species_relentless_endurance')])
    expect(currentState(b, t).hp.current).toBe(1)
    expect(dispatch(b, t, use('species_relentless_endurance')).ok).toBe(false)
  })

  it('Dragonborn breath weapon uses the ancestry damage type, scales with level, and has PB uses', () => {
    const b = build('dragonborn', 'red', 5)
    const breath = getActions(b).find((a) => a.id === 'species_breath_weapon')!
    expect(resolveText(breath.note!, b)).toContain('DC 13: 2d10 fire damage')
    expect(maxOf(b, 'species_breath_weapon')).toBe(3)
    expect(getPassives(b).map((p) => p.text)).toContain('Resistance to Fire damage.')
    expect(getActions(build('dragonborn', 'red', 4)).some((a) => a.id === 'species_draconic_flight')).toBe(false)
    expect(getActions(b).some((a) => a.id === 'species_draconic_flight')).toBe(true)
  })

  it('Tiefling legacy spells: the free cast does not use up the slot for the turn', () => {
    const b = build('tiefling', 'infernal', 5)
    const rebuke = getActions(b).find((a) => a.id === 'spell:hellish-rebuke')!
    expect(rebuke.economy).toBe('reaction')
    expect(rebuke.payments.map((p) => p.id)).toEqual(['slot_1', 'slot_2', 'free_use'])
    // Free Darkness (L2) and then a slotted Divine Smite in the same turn.
    const t = run(b, [use('spell:darkness', 'free_use'), use('spell:divine-smite', 'slot_1')])
    expect(currentState(b, t).expended).toEqual({ species_lineage_spell_5: 1, slot_1: 1 })
  })

  it('Elf lineage spells unlock at levels 3 and 5', () => {
    const ids = (level: number) => getActions(build('elf', 'high_elf', level)).map((a) => a.id)
    expect(ids(2)).toContain('spell:prestidigitation')
    expect(ids(2)).not.toContain('spell:detect-magic')
    expect(ids(3)).toContain('spell:detect-magic')
    expect(ids(3)).not.toContain('spell:misty-step')
    expect(ids(5)).toContain('spell:misty-step')
  })

  it('Goliath boons share one PB pool, and only your ancestry boon shows up', () => {
    const b = build('goliath', 'stone', 5)
    const actions = getActions(b).map((a) => a.id)
    expect(actions).toContain('species_stone_boon')
    expect(actions).not.toContain('species_fire_boon')
    const t = run(b, [use('species_stone_boon')])
    expect(currentOf(b, currentState(b, t), 'species_giant_boon')).toBe(2)
    expect(currentState(b, t).turn.reaction).toBe(true)
  })

  it('Human Heroic Inspiration comes back on a long rest', () => {
    const b = build('human', null, 1)
    let t = run(b, [use('species_heroic_inspiration')])
    expect(currentOf(b, currentState(b, t), 'species_heroic_inspiration')).toBe(0)
    t = run(b, [{ type: 'LONG_REST' }], t)
    expect(currentOf(b, currentState(b, t), 'species_heroic_inspiration')).toBe(1)
  })

  it('no species means no species features', () => {
    const b = { ...build('orc', null), speciesId: null }
    expect(getActions(b).some((a) => a.id.startsWith('species_'))).toBe(false)
  })
})

describe('feature sources and descriptions', () => {
  const find = (b: CharacterBuild, id: string) => getActions(b).find((a) => a.id === id)

  it('tags each feature with the class, subclass or species it comes from', () => {
    const b: CharacterBuild = {
      ...build('dragonborn', 'red', 5),
      spells: [{ name: 'Bless', level: 1, castingTime: 'action', concentration: true, ritual: false, upcast: true }],
    }
    expect(find(b, 'lay_on_hands')?.source).toEqual({ kind: 'class', name: 'Paladin' })
    expect(find(b, 'spell:divine-smite')?.source).toEqual({ kind: 'class', name: 'Paladin' })
    expect(find(b, 'peerless_athlete')?.source).toEqual({ kind: 'subclass', name: 'Oath of Glory' })
    expect(find(b, 'spell:guiding-bolt')?.source).toEqual({ kind: 'subclass', name: 'Oath of Glory' })
    // Lineage features show the species name.
    expect(find(b, 'species_breath_weapon')?.source).toEqual({ kind: 'species', name: 'Dragonborn' })
    expect(getPassives(b).find((p) => p.id === 'species_damage_resistance')?.source?.name).toBe('Dragonborn')
    // Basic actions and spells the player added have no source.
    expect(find(b, 'basic_dash')?.source).toBeUndefined()
    expect(find(b, 'spell:bless')?.source).toBeUndefined()
  })

  it('every class, subclass and species action has a description', () => {
    const combos: [string, string | null][] = ALL_SPECIES.flatMap((sp) =>
      sp.lineages.length ? sp.lineages.map((l): [string, string | null] => [sp.id, l.id]) : [[sp.id, null]],
    )
    for (const [speciesId, lineageId] of combos) {
      for (const classId of ['paladin', 'sorcerer']) {
        const b = build(speciesId, lineageId, 10, classId)
        const missing = getActions(b).filter((a) => a.source && !a.note).map((a) => a.name)
        expect(missing, `${classId} / ${speciesId}`).toEqual([])
      }
    }
  })

  it('every spell from a class, subclass or species has a range', () => {
    for (const sp of ALL_SPECIES) {
      for (const lineageId of sp.lineages.length ? sp.lineages.map((l) => l.id) : [null]) {
        for (const classId of ['paladin', 'sorcerer']) {
          const b = build(sp.id, lineageId, 10, classId)
          const missing = getActions(b).filter((a) => a.source && a.spell && !a.spell.range).map((a) => a.name)
          expect(missing, `${classId} / ${sp.id}`).toEqual([])
        }
      }
    }
  })
})
