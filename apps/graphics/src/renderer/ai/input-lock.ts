/**
 * While the AI (or a quick action) works on the document, the person's input
 * does not reach the app: the overlay over the frame takes the pointer, and
 * capture-phase listeners in the frame's window drop keys and the rest. So the
 * app's history during a run holds the run's edits only.
 */
const BLOCKED_EVENTS = [
  'keydown',
  'keyup',
  'keypress',
  'beforeinput',
  'paste',
  'drop',
  'dragover',
  'pointerdown',
  'mousedown',
  'wheel',
  'contextmenu',
  'touchstart',
] as const

export function lockFrameInput(frame: HTMLIFrameElement, overlay: HTMLElement): () => void {
  const win = frame.contentWindow
  const stop = (event: Event): void => {
    event.preventDefault()
    event.stopImmediatePropagation()
  }
  const options = { capture: true, passive: false } as const
  for (const type of BLOCKED_EVENTS) win?.addEventListener(type, stop, options)
  overlay.dataset.locked = 'true'
  // the focused control in the app (a text field) loses the keyboard too
  const active = frame.contentDocument?.activeElement as { blur?: () => void } | null | undefined
  active?.blur?.()
  let locked = true
  return () => {
    if (!locked) return
    locked = false
    for (const type of BLOCKED_EVENTS) win?.removeEventListener(type, stop, options)
    delete overlay.dataset.locked
  }
}
