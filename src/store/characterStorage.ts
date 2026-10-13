import { abilityMod } from '../rules/abilities'
import type { CharacterBuild, Tracker } from '../rules/types'

export type CharacterData = { build: CharacterBuild | null; tracker: Tracker | null }
export type LocalCharacter = { data: CharacterData; dirty: boolean }
export type CharacterRoster = Record<string, LocalCharacter>

export const GUEST_KEY = 'dnd-combat-tracker'
export const userKey = (uid: string) => `dnd-combat-tracker-user-${uid}`
export const emptyCharacter = (): CharacterData => ({ build: null, tracker: null })
export const hasCharacter = (data: CharacterData) => !!data.build && !!data.tracker

/** Shared by legacy browser saves and Firestore documents. Null pairs are deletion markers. */
export function decodeCharacter(value: unknown, version: number): CharacterData {
  if (!value || typeof value !== 'object' || !('build' in value) || !('tracker' in value)) {
    throw new Error('Character data is incomplete.')
  }
  const data = value as CharacterData
  if (data.build === null && data.tracker === null) return emptyCharacter()
  if (!data.build || !data.tracker || !data.build.abilities || !Array.isArray(data.tracker.log)) {
    throw new Error('Character data is incomplete.')
  }
  let build = data.build
  if (version < 2) build = { ...build, speciesId: null, lineageId: null }
  if (version < 3) build = { ...build, ac: 10 + abilityMod(build.abilities.dex) }
  return { build, tracker: data.tracker }
}

export function readLocalRoster(key: string): CharacterRoster {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const saved = JSON.parse(raw)
    if (saved.version === 4 && saved.characters && typeof saved.characters === 'object') {
      return Object.fromEntries(Object.entries(saved.characters).map(([id, entry]) => {
        const character = entry as LocalCharacter
        return [id, { data: decodeCharacter(character.data, 4), dirty: !!character.dirty }]
      }))
    }
    // Keep the original ID so the existing cloud document and offline edits still match.
    const data = decodeCharacter(saved.data ?? saved.state, saved.version ?? 0)
    return hasCharacter(data) || saved.dirty ? { main: { data, dirty: !!saved.dirty } } : {}
  } catch {
    return {}
  }
}

export function writeLocalRoster(key: string, characters: CharacterRoster): void {
  try {
    localStorage.setItem(key, JSON.stringify({ version: 4, characters }))
  } catch {
    // Firestore can still save signed-in data when browser storage is unavailable.
  }
}

/** Offline changes win only for their own character; other remote characters stay intact. */
export function mergeCharacters(local: CharacterRoster, remote: CharacterRoster): CharacterRoster {
  const merged = { ...remote }
  for (const [id, saved] of Object.entries(local)) {
    if (saved.dirty || !Object.hasOwn(remote, id)) {
      merged[id] = { ...saved, dirty: true }
    }
  }
  return merged
}
