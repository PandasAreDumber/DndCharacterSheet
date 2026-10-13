import type { BackgroundDef, ClassDef, FeatDef, SpeciesDef, SubclassDef } from '../rules/types'
import { aberrantSorcery } from './classes/aberrantSorcery'
import { oathOfGlory } from './classes/oathOfGlory'
import { paladin } from './classes/paladin'
import { sorcerer } from './classes/sorcerer'
import { ALL_BACKGROUNDS } from './backgrounds'
import { ALL_FEATS } from './feats'
import { ALL_SPECIES } from './species'

// Adding a class = write its data file and list it here.
export const CLASSES: Record<string, ClassDef> = {
  [sorcerer.id]: sorcerer,
  [paladin.id]: paladin,
}

export const SUBCLASSES: Record<string, SubclassDef> = {
  [aberrantSorcery.id]: aberrantSorcery,
  [oathOfGlory.id]: oathOfGlory,
}

export const SPECIES: Record<string, SpeciesDef> = Object.fromEntries(ALL_SPECIES.map((s) => [s.id, s]))

export const FEATS: Record<string, FeatDef> = Object.fromEntries(ALL_FEATS.map((f) => [f.id, f]))

export const BACKGROUNDS: Record<string, BackgroundDef> = Object.fromEntries(ALL_BACKGROUNDS.map((b) => [b.id, b]))
