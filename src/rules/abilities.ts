export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** +2 at levels 1-4, +3 at 5-8, +4 at 9-12, ... */
export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4)
}
