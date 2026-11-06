/**
 * The export dialog of a graphics tab: the format, and for a picture the size
 * (the picture's own to start with, the ratio kept). Where the file goes is
 * asked next, by the system's save dialog.
 */
import { useState } from 'react'
import type { ReactElement } from 'react'
import { EXPORT_FORMATS, type GraphicsKind } from '../../shared/kinds'
import { useI18n } from '../i18n/locale'
import type { ExportChoice, ExportFormatChoice } from './quick-actions'
import { keepRatio, type PixelSize } from './resize'

export function ExportDialog({
  kind,
  size,
  onDone,
}: {
  kind: GraphicsKind
  size: PixelSize
  onDone: (choice: ExportChoice | null) => void
}): ReactElement {
  const { t } = useI18n()
  const formats = EXPORT_FORMATS[kind] as readonly ExportFormatChoice[]
  const [format, setFormat] = useState<ExportFormatChoice>(formats[0]!)
  const [dims, setDims] = useState<PixelSize>(size)
  const sized = format !== 'svg'

  const confirm = () =>
    onDone(sized ? { format, width: dims.width, height: dims.height } : { format })

  return (
    <div className="gx-dialog-backdrop" role="presentation">
      <form
        className="gx-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('exportDialogTitle')}
        onSubmit={(e) => {
          e.preventDefault()
          confirm()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onDone(null)
        }}
      >
        <h2 className="gx-dialog-title">{t('exportDialogTitle')}</h2>
        <label className="gx-dialog-row">
          <span>{t('exportFormat')}</span>
          <select
            name="format"
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormatChoice)}
          >
            {formats.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        {sized && (
          <>
            <label className="gx-dialog-row">
              <span>{t('exportWidth')}</span>
              <input
                name="width"
                type="number"
                min={1}
                value={dims.width}
                onChange={(e) => {
                  const width = Number(e.target.value)
                  if (width > 0) setDims(keepRatio(size, { width }))
                }}
              />
            </label>
            <label className="gx-dialog-row">
              <span>{t('exportHeight')}</span>
              <input
                name="height"
                type="number"
                min={1}
                value={dims.height}
                onChange={(e) => {
                  const height = Number(e.target.value)
                  if (height > 0) setDims(keepRatio(size, { height }))
                }}
              />
            </label>
          </>
        )}
        <div className="gx-dialog-actions">
          <button type="button" data-action="export-cancel" onClick={() => onDone(null)}>
            {t('exportCancel')}
          </button>
          <button type="submit" className="primary" data-action="export-ok">
            {t('exportConfirm')}
          </button>
        </div>
      </form>
    </div>
  )
}
