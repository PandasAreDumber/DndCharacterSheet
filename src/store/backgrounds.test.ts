import { describe, expect, it } from 'vitest'
import { ALL_BACKGROUNDS } from '../data/backgrounds'
import { FEATS } from '../data/registry'
import { spell } from '../data/helpers'
import { swapBackgroundFeat } from './selectors'

describe('backgrounds', () => {
  it('every background gives a real Origin feat', () => {
    expect(ALL_BACKGROUNDS).toHaveLength(16)
    for (const b of ALL_BACKGROUNDS) expect(FEATS[b.featId]?.category, b.name).toBe('origin')
  })

  it('picking a background adds its feat, and keeps feats the player picked', () => {
    expect(swapBackgroundFeat([{ id: 'war_caster' }], null, 'merchant')).toEqual([{ id: 'war_caster' }, { id: 'lucky' }])
  })

  it('changing background swaps the feat', () => {
    expect(swapBackgroundFeat([{ id: 'lucky' }, { id: 'war_caster' }], 'merchant', 'farmer')).toEqual([
      { id: 'war_caster' },
      { id: 'tough' },
    ])
  })

  it('clearing the background removes its feat', () => {
    expect(swapBackgroundFeat([{ id: 'lucky' }], 'merchant', null)).toEqual([])
  })

  it('switching between backgrounds with the same feat keeps the chosen spells', () => {
    const feats = [{ id: 'magic_initiate', spells: [spell('Guidance', 0)] }]
    expect(swapBackgroundFeat(feats, 'acolyte', 'sage')).toBe(feats)
  })

  it("doesn't add the feat twice if the player already had it", () => {
    expect(swapBackgroundFeat([{ id: 'alert' }], null, 'guard')).toEqual([{ id: 'alert' }])
  })
})
