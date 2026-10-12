import { useState } from 'react'
import type { ActionDef } from '../rules/types'
import { useCharacterStore } from '../store/characterStore'
import type { CharacterView } from '../store/selectors'
import { useActionView } from '../store/useCharacter'
import { Modal } from './Modal'

export function ActionRow({ character, action }: { character: CharacterView; action: ActionDef }) {
  const perform = useCharacterStore((s) => s.perform)
  const [mods, setMods] = useState<string[]>([])
  const [amount, setAmount] = useState<number | undefined>(undefined)
  const [confirming, setConfirming] = useState<{ paymentId: string; warnings: string[] } | null>(null)
  const view = useActionView(character, action, mods, amount)

  const toggleMod = (id: string) => setMods((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))

  const pay = (paymentId: string) => {
    setConfirming(null)
    const done = perform(action.id, paymentId, {
      ...(view.variable ? { amount: amount ?? view.variable.min } : {}),
      ...(mods.length ? { spellModifiers: mods } : {}),
    })
    if (done) {
      setMods([])
      setAmount(undefined)
    }
  }

  const spell = view.spell
  const showMods = view.spellModifiers.length > 0 && view.payments.length > 0

  return (
    <li
      className={`rounded-box border p-3 ${view.isFollowUp ? 'border-accent bg-accent/10' : 'border-base-300'} ${
        view.available ? '' : 'opacity-50'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{view.name}</span>
        {view.isFollowUp && <span className="badge badge-accent badge-sm">Follow up</span>}
        {spell && (
          <span className="badge badge-ghost badge-sm">{spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}</span>
        )}
        {spell?.concentration && <span className="badge badge-outline badge-sm">Conc.</span>}
      </div>
      {view.note && <p className="mt-1 text-sm opacity-70">{view.note}</p>}

      {showMods && (
        <details className="mt-1 text-xs">
          <summary className="cursor-pointer opacity-70">
            {character.spellModifierName}
            {mods.length > 0 && <span className="badge badge-secondary badge-xs ml-1">{mods.length}</span>}
          </summary>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {view.spellModifiers.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-1">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={mods.includes(m.id)}
                  onChange={() => toggleMod(m.id)}
                />
                {m.label}
              </label>
            ))}
          </div>
        </details>
      )}

      {view.variable && view.payments.length > 0 && (
        <label className="mt-2 flex items-center gap-2 text-sm">
          Amount
          <input
            type="number"
            inputMode="numeric"
            className="input input-sm w-20"
            min={view.variable.min}
            max={view.variable.max}
            value={amount ?? view.variable.min}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10)
              setAmount(Number.isNaN(n) ? undefined : n)
            }}
          />
          <span className="opacity-60">of {view.variable.max}</span>
        </label>
      )}

      {view.payments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {view.payments.map((p) => (
            <button
              key={p.id}
              className="btn btn-sm btn-primary"
              disabled={!p.ok}
              title={p.reason}
              onClick={() => (p.warnings.length ? setConfirming({ paymentId: p.id, warnings: p.warnings }) : pay(p.id))}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      {view.reason && <p className="mt-1 text-xs italic text-warning">{view.reason}</p>}

      {confirming && (
        <Modal title={`Cast ${view.name}?`} onClose={() => setConfirming(null)}>
          {confirming.warnings.map((w) => (
            <p key={w} className="py-2">
              {w}
            </p>
          ))}
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={() => setConfirming(null)}>
              Cancel
            </button>
            <button className="btn btn-warning" onClick={() => pay(confirming.paymentId)}>
              Cast anyway
            </button>
          </div>
        </Modal>
      )}
    </li>
  )
}
