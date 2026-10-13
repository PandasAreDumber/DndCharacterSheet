import { describe, expect, it } from 'vitest'
import { SRD_SPELLS } from '../data/srdSpells'
import { getActions } from '../rules/character'
import { currentState, dispatch, newTracker } from '../rules/engine'
import type { CharacterBuild, GameEvent } from '../rules/types'
import { searchSpells, toSpell } from './spellSearch'

const find = (name: string) => {
  const s = SRD_SPELLS.find((x) => x.name === name)
  if (!s) throw new Error(`${name} missing from the SRD list`)
  return s
}

describe('SRD spell list', () => {
  it('has every cantrip to level 3 spell from the SRD, and nothing higher', () => {
    const byLevel = [0, 1, 2, 3].map((l) => SRD_SPELLS.filter((s) => s.level === l).length)
    expect(byLevel).toEqual([27, 57, 57, 42])
    expect(SRD_SPELLS).toHaveLength(183)
  })

  it('ids and names are unique', () => {
    expect(new Set(SRD_SPELLS.map((s) => s.srdId)).size).toBe(SRD_SPELLS.length)
    expect(new Set(SRD_SPELLS.map((s) => s.name.toLowerCase())).size).toBe(SRD_SPELLS.length)
  })

  it('every spell has clean, filled-in fields', () => {
    for (const s of SRD_SPELLS) {
      expect(['action', 'bonus', 'reaction', 'other'], s.name).toContain(s.castingTime)
      expect(s.range, s.name).toMatch(/^(Self|Touch|Unlimited|\d+ (ft|mile))/)
      expect(s.range, s.name).not.toMatch(/Component|feet/)
      expect(s.duration, s.name).toBeTruthy()
      if (s.concentration) expect(s.duration, s.name).not.toMatch(/up to|concentration/i)
      if (s.level === 0) expect(s.upcast, s.name).toBe(false)
      expect(s.note, s.name).toBeTruthy()
      expect(s.classes.length, s.name).toBeGreaterThan(0)
    }
  })

  it('spot checks against the book', () => {
    expect(find('Fireball')).toMatchObject({ level: 3, castingTime: 'action', range: '150 ft', upcast: true, note: '8d6 Fire · DEX save' })
    expect(find('Shield')).toMatchObject({ castingTime: 'reaction', duration: '1 round', upcast: false })
    expect(find('Counterspell')).toMatchObject({ level: 3, castingTime: 'reaction' })
    expect(find('Healing Word')).toMatchObject({ castingTime: 'bonus', note: 'Heals 2d4 + mod' })
    expect(find('Cure Wounds')).toMatchObject({ upcast: true, note: 'Heals 2d8 + mod' })
    expect(find('Bless')).toMatchObject({ concentration: true, duration: '1 minute' })
    expect(find('Detect Magic')).toMatchObject({ ritual: true, concentration: true, duration: '10 minutes' })
    // The source data has this one's concentration flag off, but its duration says Concentration.
    expect(find('Protection from Evil and Good')).toMatchObject({ concentration: true, duration: '10 minutes' })
    expect(find('Divine Smite')).toMatchObject({ castingTime: 'bonus', range: 'Self' })
  })
})

describe('spell search', () => {
  it('finds names that start with the query first', () => {
    const names = searchSpells(SRD_SPELLS, 'fire').map((s) => s.name)
    expect(names.slice(0, 2)).toEqual(['Fire Bolt', 'Fireball'])
    expect(names).toContain('Faerie Fire')
  })

  it('ignores case and spaces, and an empty query finds nothing', () => {
    expect(searchSpells(SRD_SPELLS, '  MISTY ').map((s) => s.name)).toEqual(['Misty Step'])
    expect(searchSpells(SRD_SPELLS, '   ')).toEqual([])
  })

  it('can be limited to one level, for a feat that gives a level 1 spell', () => {
    expect(searchSpells(SRD_SPELLS, 'heal', { level: 1 }).every((s) => s.level === 1)).toBe(true)
    expect(searchSpells(SRD_SPELLS, 'heal', { level: 1 }).map((s) => s.name)).toContain('Healing Word')
  })

  it('is not limited by class', () => {
    // Paladin-only and Warlock-only spells both show up for anyone.
    expect(searchSpells(SRD_SPELLS, 'divine smite')).toHaveLength(1)
    expect(searchSpells(SRD_SPELLS, 'hex')).toHaveLength(1)
  })

  it('a picked spell keeps its SRD id but drops the search-only fields', () => {
    const spell = toSpell(find('Fireball'))
    expect(spell).toMatchObject({ srdId: 'fireball', name: 'Fireball' })
    expect(spell).not.toHaveProperty('classes')
    expect(spell).not.toHaveProperty('school')
  })

  it('a picked spell works in the tracker: Fireball at 4th level spends one 4th level slot', () => {
    const b: CharacterBuild = {
      name: 'Sorc',
      classId: 'sorcerer',
      subclassId: null,
      speciesId: null,
      lineageId: null,
      level: 7,
      abilities: { str: 10, dex: 14, con: 14, int: 10, wis: 10, cha: 16 },
      maxHp: 40,
      ac: 14,
      spells: [toSpell(find('Fireball'))],
      spellModifiers: [],
    }
    const action = getActions(b).find((a) => a.id === 'spell:fireball')
    expect(action?.note).toBe('8d6 Fire · DEX save')
    const r = dispatch(b, newTracker(b), { type: 'PERFORM_ACTION', actionId: 'spell:fireball', paymentId: 'slot_4' } as GameEvent)
    expect(r.ok).toBe(true)
    expect(r.ok && currentState(b, r.tracker).expended).toEqual({ slot_4: 1 })
  })
})
