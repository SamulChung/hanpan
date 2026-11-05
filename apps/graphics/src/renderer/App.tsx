/**
 * The host page of a graphics tab: the web app in a same-origin frame, and
 * Hanpan's side of it (opening, saving, the unsaved mark, menu commands).
 */
import { useEffect, useRef, useState } from 'react'
import type { Lang } from '@genoffice/i18n'
import { createAdapter, type GraphicsAdapter } from './adapters'
import { watchCaptures, type CaptureWatch } from './doc/capture-watch'
import { createDirtyState, type DirtyState } from './doc/dirty-state'
import { watchDoc } from './doc/doc-watch'
import { openPending } from './doc/open-flow'
import { runSave, type SaveNoticeKey } from './doc/save-flow'
import { copyBytes } from './frame/bytes'
import { appFrameUrl, waitForPageApi } from './frame/page-api'
import { clearIllustRecovery, seedPhotoPreferences } from './frame/storage-prep'
import { useI18n, type StringKey } from './i18n/locale'
import { APP_GLOBAL, EXPORT_FORMATS, appLanguage, extOf } from '../shared/kinds'
import type { GraphicsKind } from '../shared/kinds'
import type { ExportFormat, SaveMode } from '../shared/ipc'

type Status = 'checking' | 'loading' | 'ready' | 'failed' | 'notInstalled'

export interface AppProps {
  kind: GraphicsKind
  lang: Lang
  /** Whether this install carries the app's web build. */
  probeWeb: () => Promise<boolean>
  /** How often the document state is asked for. */
  pollMs?: number
}

/** The base of a document title for an export's suggested name. */
function exportName(title: string | null, format: ExportFormat): string {
  const base = (title ?? 'export').replace(/\.[^.]+$/, '')
  return `${base}.${format}`
}

export default function App({ kind, lang, probeWeb, pollMs = 1000 }: AppProps) {
  const { t } = useI18n()
  const [status, setStatus] = useState<Status>('checking')
  const [notice, setNotice] = useState<StringKey | null>(null)
  const [attempt, setAttempt] = useState(0)
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const adapterRef = useRef<GraphicsAdapter | null>(null)
  const dirtyRef = useRef<DirtyState>(
    createDirtyState((dirty) => window.graphicsApi.setDirty(dirty)),
  )
  const capturesRef = useRef<CaptureWatch | null>(null)
  const titleRef = useRef<string | null>(null)
  const hostOps = useRef(0)
  const aiBusy = useRef(false)

  const notify = (key: SaveNoticeKey | StringKey): void => {
    setNotice(key)
    window.setTimeout(() => setNotice((current) => (current === key ? null : current)), 6000)
  }

  const save = async (mode: SaveMode): Promise<boolean> => {
    const adapter = adapterRef.current
    if (!adapter) return false
    const ok = await runSave(mode, {
      adapter,
      api: window.graphicsApi,
      dirty: dirtyRef.current,
      notify,
      hostOp: {
        begin: () => (hostOps.current += 1),
        end: () => (hostOps.current -= 1),
      },
    })
    await capturesRef.current?.noteHostSave()
    return ok
  }

  const exportBytes = async (bytes: Uint8Array, name: string, format: ExportFormat) => {
    const result = await window.graphicsApi.exportFile({ bytes, defaultName: name, format })
    if (!result.ok) notify('saveFailed')
  }

  // the web build is there, the app's storage is prepared, then the frame
  useEffect(() => {
    let live = true
    void (async () => {
      const present = await probeWeb().catch(() => false)
      if (!live) return
      if (!present) {
        setStatus('notInstalled')
        return
      }
      if (kind === 'photo') seedPhotoPreferences(localStorage, appLanguage(kind, lang))
      else clearIllustRecovery(localStorage)
      setStatus('loading')
    })()
    return () => {
      live = false
    }
    // the language is read once: the app takes it at start-up
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, probeWeb, attempt])

  // the app's API is up: wire it
  useEffect(() => {
    if (status !== 'loading' || !frameRef.current) return
    let live = true
    const stops: (() => void)[] = []
    void (async () => {
      try {
        const api = await waitForPageApi(frameRef.current!, APP_GLOBAL[kind])
        if (!live) return
        let adapter: GraphicsAdapter
        try {
          adapter = createAdapter(kind, api)
        } catch {
          setStatus('notInstalled')
          return
        }
        await adapter.afterReady()
        adapterRef.current = adapter
        await openPending(adapter, () => window.graphicsApi.consumeOpen())
        if (!live) return
        const captures = watchCaptures({
          adapter,
          intervalMs: pollMs,
          busy: () => hostOps.current > 0 || aiBusy.current,
          onAppSave: () => void save('save'),
          onAppExport: (path) =>
            void (async () => {
              const format = extOf(path)
              if (format !== 'png' && format !== 'jpg' && format !== 'svg') return
              await exportBytes(copyBytes(await api.readFile(path)), path, format)
            })(),
        })
        capturesRef.current = captures
        stops.push(() => captures.stop())
        stops.push(
          watchDoc(
            adapter,
            (info) => {
              titleRef.current = info.title
              dirtyRef.current.fromApp(info.hasDocument && info.dirty)
              captures.noteDoc(info)
            },
            pollMs,
          ),
        )
        setStatus('ready')
      } catch {
        if (live) setStatus('failed')
      }
    })()
    return () => {
      live = false
      for (const stop of stops) stop()
    }
    // save/exportBytes read refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status === 'loading', kind, pollMs])

  // Hanpan's menus and the close question
  useEffect(() => {
    const api = window.graphicsApi
    const offs = [
      api.onSaveRequest((mode) => {
        void save(mode).then((ok) => api.sendSaveRequestAck(ok))
      }),
      api.onCloseSaveRequest(() => {
        void (async () =>
          api.sendCloseSaveResult(dirtyRef.current.current() ? await save('save') : true))()
      }),
      api.onMenuCommand((command) => {
        const adapter = adapterRef.current
        if (!adapter) return
        if (command === 'undo' || command === 'redo') {
          void adapter.api
            .execute(command === 'undo' ? 'edit.undo' : 'edit.redo', {})
            .catch(() => {})
          return
        }
        void (async () => {
          const format = EXPORT_FORMATS[kind][0]!
          try {
            await exportBytes(
              await adapter.exportBytes(format),
              exportName(titleRef.current, format),
              format,
            )
          } catch {
            notify('saveFailed')
          }
        })()
      }),
    ]
    return () => {
      for (const off of offs) off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  const showFrame = status === 'loading' || status === 'ready'
  return (
    <div className="gx-app" data-kind={kind} data-status={status}>
      <div className="gx-stage">
        {showFrame && (
          <iframe
            ref={frameRef}
            className="gx-frame"
            title={kind}
            src={appFrameUrl(kind, lang)}
            allow="clipboard-read; clipboard-write"
          />
        )}
        {(status === 'checking' || status === 'loading') && (
          <div className="gx-cover" role="status">
            {t('loading')}
          </div>
        )}
        {status === 'failed' && (
          <div className="gx-cover" role="alert">
            <p>{t('failed')}</p>
            <button type="button" onClick={() => setAttempt((n) => n + 1)}>
              {t('retry')}
            </button>
          </div>
        )}
        {status === 'notInstalled' && (
          <div className="gx-cover" role="alert">
            {t('notInstalled')}
          </div>
        )}
      </div>
      {notice && (
        <div className="gx-notice" role="status">
          {t(notice)}
        </div>
      )}
    </div>
  )
}
