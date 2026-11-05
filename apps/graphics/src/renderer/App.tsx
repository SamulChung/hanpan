/**
 * The host page of a graphics tab: the web app in a same-origin frame, and
 * Hanpan's side of it (opening, saving, the unsaved mark, menu commands).
 */
import { useEffect, useRef, useState } from 'react'
import type { Lang } from '@genoffice/i18n'
import { createAdapter, type GraphicsAdapter } from './adapters'
import { GraphicsAiDock } from './ai/AiDock'
import { lockFrameInput } from './ai/input-lock'
import { watchCaptures, type CaptureWatch } from './doc/capture-watch'
import { createDirtyState, type DirtyState } from './doc/dirty-state'
import { watchDoc, type DocWatch } from './doc/doc-watch'
import { openPending } from './doc/open-flow'
import { runSave, type SaveNoticeKey } from './doc/save-flow'
import { singleFlight } from './doc/single-flight'
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
  /** the app's adapter once it is up: the AI panel works through it */
  const [aiAdapter, setAiAdapter] = useState<GraphicsAdapter | null>(null)
  const lockRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const adapterRef = useRef<GraphicsAdapter | null>(null)
  const dirtyRef = useRef<DirtyState>(
    createDirtyState((dirty) => window.graphicsApi.setDirty(dirty)),
  )
  const capturesRef = useRef<CaptureWatch | null>(null)
  const docWatchRef = useRef<DocWatch | null>(null)
  const titleRef = useRef<string | null>(null)
  const hostOps = useRef(0)
  const aiBusy = useRef(false)

  const notify = (key: SaveNoticeKey | StringKey): void => {
    setNotice(key)
    window.setTimeout(() => setNotice((current) => (current === key ? null : current)), 6000)
  }

  // one save at a time: a second request while one runs gets that run's outcome
  const saveRef = useRef(
    singleFlight(async (mode: SaveMode): Promise<boolean> => runSaveOnce(mode)),
  )
  const save = (mode: SaveMode): Promise<boolean> => saveRef.current(mode)

  const runSaveOnce = async (mode: SaveMode): Promise<boolean> => {
    const adapter = adapterRef.current
    if (!adapter) return false
    let savedName: string | null = null
    const ok = await runSave(mode, {
      adapter,
      api: window.graphicsApi,
      dirty: dirtyRef.current,
      notify,
      hostOp: {
        begin: () => (hostOps.current += 1),
        end: () => (hostOps.current -= 1),
      },
      savedAs: (name) => {
        savedName = name
      },
    })
    if (savedName !== null) await capturesRef.current?.noteHostSave(savedName)
    // the save set the tab's mark; the app's own mark may have moved on meanwhile
    docWatchRef.current?.resync()
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

  // the frame stands while the app loads and runs; a change between the two must not unwire it
  const frameOn = status === 'loading' || status === 'ready'

  // the app's API is up: wire it
  useEffect(() => {
    if (!frameOn || !frameRef.current) return
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
        setAiAdapter(adapter)
        const opened = await openPending(
          adapter,
          () => window.graphicsApi.consumeOpen(),
          (path) => window.graphicsApi.confirmOpened(path),
        )
        if (!live) return
        if (opened === 'failed') notify('openFailed')
        const captures = watchCaptures({
          adapter,
          intervalMs: pollMs,
          busy: () => hostOps.current > 0 || aiBusy.current,
          hostSaving: () => hostOps.current > 0,
          // the app's own save wrote nothing to disk: Hanpan's save does, or the mark stays
          onAppSave: () =>
            void save('save').then((ok) => {
              if (!ok) dirtyRef.current.saveFailed()
            }),
          onUnexpectedClean: () => dirtyRef.current.saveFailed(),
          onAppExport: (path) =>
            void (async () => {
              const format = extOf(path)
              if (format !== 'png' && format !== 'jpg' && format !== 'svg') return
              await exportBytes(copyBytes(await api.readFile(path)), path, format)
            })(),
        })
        capturesRef.current = captures
        stops.push(() => captures.stop())
        const docWatch = watchDoc(
          adapter,
          (info) => {
            titleRef.current = info.title
            dirtyRef.current.fromApp(info.hasDocument && info.dirty)
            captures.noteDoc(info)
          },
          pollMs,
        )
        docWatchRef.current = docWatch
        stops.push(() => docWatch.stop())
        setStatus('ready')
      } catch {
        if (live) setStatus('failed')
      }
    })()
    return () => {
      live = false
      for (const stop of stops) stop()
      setAiAdapter(null)
    }
    // save/exportBytes read refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameOn, kind, pollMs, attempt])

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

  return (
    <div className="gx-app" data-kind={kind} data-status={status}>
      <div className="gx-body">
        <div className="gx-stage">
          {frameOn && (
            <iframe
              ref={frameRef}
              className="gx-frame"
              title={kind}
              src={appFrameUrl(kind, lang)}
              allow="clipboard-read; clipboard-write"
            />
          )}
          {/* takes the pointer while the AI works: the person's edits stay out of its undo step */}
          <div className="gx-lock" ref={lockRef} aria-hidden />
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
        {status === 'ready' && (
          <GraphicsAiDock
            kind={kind}
            adapter={aiAdapter}
            lockFrame={() =>
              frameRef.current && lockRef.current
                ? lockFrameInput(frameRef.current, lockRef.current)
                : () => {}
            }
            onBusyChange={(running) => {
              aiBusy.current = running
            }}
          />
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
