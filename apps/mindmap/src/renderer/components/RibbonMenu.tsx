/**
 * A big ribbon button that opens a menu: the fold levels and the parts the
 * map shows. The menu is the app's shared popover (`gs-dd-pop`), like the
 * export menu. Items with `checked` are toggles and leave the menu open, so
 * several can be switched in a row.
 */
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useDismissablePopover } from '@genoffice/ui'

export interface RibbonMenuItem {
  key: string
  label: string
  /** a toggle: shown with a check mark, and picking it keeps the menu open */
  checked?: boolean
  onPick(): void
}

export function RibbonMenu(p: {
  action: string
  label: string
  icon: ReactNode
  disabled: boolean
  items: readonly RibbonMenuItem[]
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLSpanElement>(null)
  useDismissablePopover(open, () => setOpen(false), { inside: () => [wrap.current] })
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])
  return (
    <span ref={wrap} className="gs-dd mm-ribbon-menu">
      <button
        type="button"
        className={`rb-big mm-big${open ? ' active' : ''}`}
        data-action={p.action}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={p.disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((was) => !was)}
      >
        <span className="rb-big-icon">{p.icon}</span>
        <span>{p.label} ▾</span>
      </button>
      {open && (
        <div className="gs-dd-pop" role="menu" aria-label={p.label}>
          {p.items.map((item) => (
            <button
              key={item.key}
              type="button"
              role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
              aria-checked={item.checked}
              className="gs-dd-item mm-menu-item"
              data-menu-item={item.key}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (item.checked === undefined) setOpen(false)
                item.onPick()
              }}
            >
              {item.checked !== undefined && (
                <span className="mm-menu-check" aria-hidden="true">
                  {item.checked ? '✓' : ''}
                </span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
