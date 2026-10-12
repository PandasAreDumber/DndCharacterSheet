import { useState, type ReactNode } from 'react'
import { useCharacterStore } from '../store/characterStore'
import type { CharacterView } from '../store/selectors'

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal modal-open modal-bottom sm:modal-middle" role="dialog" aria-modal="true">
      <div className="modal-box">
        <h3 className="text-lg font-bold">{title}</h3>
        {children}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  )
}

export function RestButtons({ character }: { character: CharacterView }) {
  const shortRest = useCharacterStore((s) => s.shortRest)
  const longRest = useCharacterStore((s) => s.longRest)
  const [open, setOpen] = useState<'short' | 'long' | null>(null)
  const [dice, setDice] = useState(0)
  const [healing, setHealing] = useState('')

  const { hitDice } = character
  const healingNum = Number.parseInt(healing, 10)
  const shortValid = dice === 0 || (Number.isInteger(healingNum) && healingNum >= 0)
  const mod = hitDice.conMod >= 0 ? `+${hitDice.conMod}` : `${hitDice.conMod}`

  const close = () => {
    setOpen(null)
    setDice(0)
    setHealing('')
  }

  return (
    <section className="grid grid-cols-2 gap-2">
      <button className="btn btn-outline" onClick={() => setOpen('short')}>
        Short Rest
      </button>
      <button className="btn btn-outline" onClick={() => setOpen('long')}>
        Long Rest
      </button>

      {open === 'short' && (
        <Modal title="Short Rest" onClose={close}>
          <p className="py-2 text-sm opacity-70">
            Spend hit point dice to heal. You have {hitDice.current} of {hitDice.max} (d{hitDice.die}).
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm">Dice to spend</span>
            <div className="join">
              <button className="btn btn-sm join-item" onClick={() => setDice((d) => Math.max(0, d - 1))}>
                −
              </button>
              <span className="btn btn-sm join-item pointer-events-none w-10 tabular-nums">{dice}</span>
              <button
                className="btn btn-sm join-item"
                onClick={() => setDice((d) => Math.min(hitDice.current, d + 1))}
              >
                +
              </button>
            </div>
          </div>
          {dice > 0 && (
            <label className="mt-3 flex flex-col gap-1 text-sm">
              Roll {dice}d{hitDice.die} and add {mod} per die. Total healing:
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="input"
                value={healing}
                onChange={(e) => setHealing(e.target.value)}
                autoFocus
              />
            </label>
          )}
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!shortValid}
              onClick={() => {
                if (shortRest(dice > 0 ? { count: dice, healing: healingNum } : undefined)) close()
              }}
            >
              Take Short Rest
            </button>
          </div>
        </Modal>
      )}

      {open === 'long' && (
        <Modal title="Long Rest" onClose={close}>
          <p className="py-2 text-sm opacity-70">Restores all HP, all hit point dice and every resource.</p>
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                longRest()
                close()
              }}
            >
              Take Long Rest
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
