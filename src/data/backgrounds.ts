// 2024 Player's Handbook backgrounds. The app only tracks the Origin feat each one gives;
// ability score increases, skills and equipment are part of what the player types in.

import type { BackgroundDef } from '../rules/types'

// TODO(rules): background → feat pairs are from memory of the 2024 book. Double check them.
export const ALL_BACKGROUNDS: BackgroundDef[] = [
  { id: 'acolyte', name: 'Acolyte', featId: 'magic_initiate', featNote: 'Cleric spells' },
  { id: 'artisan', name: 'Artisan', featId: 'crafter' },
  { id: 'charlatan', name: 'Charlatan', featId: 'skilled' },
  { id: 'criminal', name: 'Criminal', featId: 'alert' },
  { id: 'entertainer', name: 'Entertainer', featId: 'musician' },
  { id: 'farmer', name: 'Farmer', featId: 'tough' },
  { id: 'guard', name: 'Guard', featId: 'alert' },
  { id: 'guide', name: 'Guide', featId: 'magic_initiate', featNote: 'Druid spells' },
  { id: 'hermit', name: 'Hermit', featId: 'healer' },
  { id: 'merchant', name: 'Merchant', featId: 'lucky' },
  { id: 'noble', name: 'Noble', featId: 'skilled' },
  { id: 'sage', name: 'Sage', featId: 'magic_initiate', featNote: 'Wizard spells' },
  { id: 'sailor', name: 'Sailor', featId: 'tavern_brawler' },
  { id: 'scribe', name: 'Scribe', featId: 'skilled' },
  { id: 'soldier', name: 'Soldier', featId: 'savage_attacker' },
  { id: 'wayfarer', name: 'Wayfarer', featId: 'lucky' },
]
