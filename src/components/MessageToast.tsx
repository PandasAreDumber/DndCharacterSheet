import { useEffect } from 'react'
import { useCharacterStore } from '../store/characterStore'

/** Shows why something was blocked, or a warning (e.g. concentration). Disappears on its own. */
export function MessageToast() {
  const message = useCharacterStore((s) => s.message)
  const clear = useCharacterStore((s) => s.clearMessage)

  useEffect(() => {
    if (!message) return
    const t = setTimeout(clear, 4000)
    return () => clearTimeout(t)
  }, [message, clear])

  if (!message) return null
  return (
    <div className="toast toast-center toast-bottom z-20 w-full max-w-md">
      <div
        role="alert"
        className={`alert ${message.kind === 'error' ? 'alert-error' : 'alert-warning'}`}
        onClick={clear}
      >
        <span>{message.text}</span>
      </div>
    </div>
  )
}
