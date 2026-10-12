import { useState } from 'react'
import { useCharacterStore } from '../store/characterStore'
import type { CharacterView } from '../store/selectors'

export function HpPanel({ character }: { character: CharacterView }) {
  const damage = useCharacterStore((s) => s.damage)
  const heal = useCharacterStore((s) => s.heal)
  const setTempHp = useCharacterStore((s) => s.setTempHp)
  const [input, setInput] = useState('')

  const { current, temp } = character.state.hp
  const max = character.build.maxHp
  const amount = Number.parseInt(input, 10)
  const valid = Number.isInteger(amount) && amount >= 0

  const apply = (fn: (n: number) => boolean) => {
    if (valid && fn(amount)) setInput('')
  }

  const pct = max > 0 ? (current / max) * 100 : 0
  const barColor = pct > 50 ? 'progress-success' : pct > 25 ? 'progress-warning' : 'progress-error'

  return (
    <section className="card bg-base-200">
      <div className="card-body gap-3 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="card-title">Hit Points</h2>
          <div className="text-right">
            <span className="text-3xl font-bold tabular-nums">{current}</span>
            <span className="opacity-60"> / {max}</span>
            {temp > 0 && <span className="badge badge-info ml-2">+{temp} temp</span>}
          </div>
        </div>
        <progress className={`progress ${barColor}`} value={current} max={max} />
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className="input w-20"
            placeholder="0"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Amount"
          />
          <button className="btn btn-error flex-1" disabled={!valid} onClick={() => apply(damage)}>
            Damage
          </button>
          <button className="btn btn-success flex-1" disabled={!valid} onClick={() => apply(heal)}>
            Heal
          </button>
          <button
            className="btn btn-info flex-1"
            disabled={!valid}
            onClick={() => apply(setTempHp)}
            title="Temp HP doesn't stack. This replaces your current temp HP."
          >
            Temp
          </button>
        </div>
      </div>
    </section>
  )
}
