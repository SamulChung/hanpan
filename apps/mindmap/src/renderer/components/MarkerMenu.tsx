/**
 * The small menu a marker on the map opens: the other markers of its family,
 * and "remove". It stands under the glyph that was pressed, in the app's
 * shared popover (`gs-dd-pop`). A marker of no family the panel offers only
 * gets "remove".
 */
import { useEffect, useRef } from 'react'
import { useDismissablePopover } from '@genoffice/ui'
import { useI18n } from '../i18n/locale'
import { mapStrings } from '../i18n/map-strings'
import { markerName } from '../map/decorate'
import { MARKER_GROUPS, markerFamily } from '../map/marker-families'
import { Glyph } from './IconPanel'

export interface MarkerMenuRequest {
  topicId: string
  /** where the marker stands in the topic's list */
  index: number
  id: string
  /** the pressed glyph, in the window's coordinates */
  left: number
  top: number
}

export function MarkerMenu(p: {
  request: MarkerMenuRequest
  onPick(id: string): void
  onRemove(): void
  onClose(): void
}) {
  const { lang, t } = useI18n()
  const names = mapStrings(lang).decoration
  const pop = useRef<HTMLDivElement>(null)
  useDismissablePopover(true, p.onClose, { inside: () => [pop.current] })
  const onClose = p.onClose
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])
  const family = markerFamily(p.request.id)
  const options = MARKER_GROUPS.find((group) => group.family === family)?.ids ?? []
  return (
    <div
      ref={pop}
      className="gs-dd-pop mm-marker-menu"
      role="menu"
      aria-label={markerName(names, p.request.id)}
      style={{ left: p.request.left, top: p.request.top }}
    >
      {options.length > 0 && (
        <div className="mm-marker-menu-row">
          {options.map((id) => (
            <button
              key={id}
              type="button"
              role="menuitemradio"
              aria-checked={id === p.request.id}
              aria-label={markerName(names, id)}
              data-tip={markerName(names, id)}
              className={`mm-icon-option${id === p.request.id ? ' on' : ''}`}
              data-marker-pick={id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => p.onPick(id)}
            >
              <Glyph id={id} />
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        role="menuitem"
        className="gs-dd-item mm-menu-item"
        data-marker-remove=""
        onMouseDown={(e) => e.preventDefault()}
        onClick={p.onRemove}
      >
        {t('iconsRemove')}
      </button>
    </div>
  )
}
