import type { CastingTime, Spell } from '../rules/types'

/** Short way to write a spell. Only name and level are required. */
export function spell(
  name: string,
  level: number,
  opts: Partial<Omit<Spell, 'name' | 'level'>> & { castingTime?: CastingTime } = {},
): Spell {
  return {
    name,
    level,
    castingTime: opts.castingTime ?? 'action',
    concentration: opts.concentration ?? false,
    ritual: opts.ritual ?? false,
    upcast: opts.upcast ?? false,
    ...(opts.note !== undefined ? { note: opts.note } : {}),
  }
}
