import { useState } from 'react'
import type { ModifierView } from '../store/selectors'
import { Modal } from './Modal'

/** Small "i" button that opens a popup explaining one Metamagic option. */
export function ModifierInfo({ modifier }: { modifier: ModifierView }) {
  const [open, setOpen] = useState(false)
  if (!modifier.description) return null

  return (
    <>
      <button
        type="button"
        className="btn btn-circle btn-ghost btn-xs h-5 min-h-5 w-5 text-[10px] font-bold opacity-70"
        aria-label={`What does ${modifier.name} do?`}
        onClick={(e) => {
          // Keep the click from toggling a checkbox or <details> around it.
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        i
      </button>
      {open && (
        <Modal title={modifier.name} onClose={() => setOpen(false)}>
          <p className="text-sm opacity-60">
            {modifier.cost} sorcery point{modifier.cost === '1' ? '' : 's'}
          </p>
          <p className="py-3">{modifier.description}</p>
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              Got it
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
