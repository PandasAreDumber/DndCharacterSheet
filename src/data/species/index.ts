import type { SpeciesDef } from '../../rules/types'
import { aasimar, dwarf, halfling, human, orc } from './simple'
import { dragonborn, elf, gnome, goliath, tiefling } from './withLineages'

// The 10 species in the 2024 Player's Handbook, in book order.
export const ALL_SPECIES: SpeciesDef[] = [aasimar, dragonborn, dwarf, elf, gnome, goliath, halfling, human, orc, tiefling]
