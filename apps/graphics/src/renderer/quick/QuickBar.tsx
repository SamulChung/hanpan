/** The quick-action buttons above the app (design 6-5): off while the AI or another action runs. */
import type { ReactElement } from 'react'
import type { GraphicsKind } from '../../shared/kinds'
import { useI18n, type StringKey } from '../i18n/locale'
import { QUICK_ACTIONS, type QuickActionId } from './quick-actions'

const LABELS: Record<QuickActionId, StringKey> = {
  removeBackground: 'quickRemoveBackground',
  autoTone: 'quickAutoTone',
  exportAtSize: 'quickExportAtSize',
  traceImage: 'quickTraceImage',
  centerOnArtboard: 'quickCenter',
  exportPngSvg: 'quickExportPngSvg',
}

export function QuickBar({
  kind,
  disabled,
  onRun,
}: {
  kind: GraphicsKind
  disabled: boolean
  onRun: (id: QuickActionId) => void
}): ReactElement {
  const { t } = useI18n()
  return (
    <div className="gx-quick" role="toolbar">
      {QUICK_ACTIONS[kind].map((id) => (
        <button
          key={id}
          type="button"
          className="gx-quick-btn"
          data-quick={id}
          disabled={disabled}
          onClick={() => onRun(id)}
        >
          {t(LABELS[id])}
        </button>
      ))}
    </div>
  )
}
