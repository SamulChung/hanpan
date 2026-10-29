/**
 * Hanpan: "sync with linked documents". Lists, for every document made from
 * this map, what changed on which side since they last agreed: changes made in
 * the map go to the document, changes made in the document come to the map,
 * and a topic changed differently on both sides is the person's choice. Nothing
 * changes until "Apply"; the map's share is one step the person can undo.
 */
import { useEffect, useState } from 'react'
import {
  resolvePlan,
  type ConflictChoice,
  type LinkStatus,
  type PanOutline,
  type SyncChange,
} from '@genoffice/hanpan-core/renderer'
import { editMap, type MapAiHost } from '../ai/map-tools'
import { Modal } from '../components/dialogs'
import type { DocumentSession } from '../document/session'
import { useI18n, type StringKey } from '../i18n/locale'
import { sheetOutline } from './map-outline'

const KIND_LABEL: Record<SyncChange['kind'], StringKey> = {
  add: 'syncAdd',
  rename: 'syncRename',
  move: 'syncMove',
  remove: 'syncRemove',
  'retitle-root': 'syncRename',
}

function describe(change: SyncChange): string {
  switch (change.kind) {
    case 'rename':
    case 'retitle-root':
      return `${change.from} → ${change.title}`
    default:
      return change.title
  }
}

/** The map's share of a sync as edit_map operations; a topic added in the document gets a `ref` its children can name. */
export function editsFor(changes: readonly SyncChange[], rootKey: string): Record<string, unknown>[] {
  return changes.map((c) => {
    switch (c.kind) {
      case 'add':
        return { op: 'add', parentId: c.parent ?? rootKey, title: c.title, index: c.index, ...(c.key.startsWith('new:') ? { ref: c.key } : {}) }
      case 'rename':
        return { op: 'set_title', id: c.key, title: c.title }
      case 'retitle-root':
        return { op: 'set_title', id: rootKey, title: c.title }
      case 'move':
        return { op: 'move', id: c.key, parentId: c.parent ?? rootKey, index: c.index }
      case 'remove':
        return { op: 'delete', id: c.key }
    }
  })
}

/** New topic ids from edit_map's report lines (`#3 add ok (id …)`), by the edit's position. */
function addedIds(output: string): Map<number, string> {
  const ids = new Map<number, string>()
  for (const m of output.matchAll(/^#(\d+) add ok \(id ([^)]+)\)$/gm)) ids.set(Number(m[1]), m[2]!)
  return ids
}

type Phase = { kind: 'checking' } | { kind: 'ready'; links: LinkStatus[] } | { kind: 'error'; text: string }

export function SyncDialog(p: { session: DocumentSession; host: MapAiHost; mapPath: string | null; flush(): void; onClose(): void }) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<Phase>({ kind: 'checking' })
  const [choices, setChoices] = useState<Record<string, Record<string, ConflictChoice>>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, string>>({})

  const outlines = async (): Promise<{ sheetId: string; outline: PanOutline; key: string; position: number }[]> => {
    p.flush()
    return Promise.all(
      p.session.tabs().map(async (tab, i) => ({ ...(await sheetOutline(p.session, tab.key)), key: tab.key, position: i + 1 })),
    )
  }

  useEffect(() => {
    let live = true
    void (async () => {
      const sheets = await outlines()
      const result = await window.mindmapApi.syncCheck?.({ mapPath: p.mapPath, sheets: sheets.map(({ sheetId, outline }) => ({ sheetId, outline })) })
      if (!live) return
      setPhase({ kind: 'ready', links: result?.links ?? [] })
    })().catch((error: unknown) => live && setPhase({ kind: 'error', text: error instanceof Error ? error.message : String(error) }))
    return () => {
      live = false
    }
    // runs once when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apply = async (link: LinkStatus) => {
    if (!link.plan) return
    setBusy(link.linkId)
    try {
      const picked = new Map(Object.entries(choices[link.linkId] ?? {}))
      const { toMap } = resolvePlan(link.plan, picked)
      const sheets = await outlines()
      const sheet = sheets.find((s) => s.sheetId === link.sheetId) ?? sheets[0]!
      const newIds: [string, string][] = []
      if (toMap.length) {
        const edits = editsFor(toMap, sheet.outline.rootKey)
        const result = await editMap(p.host, { sheet: sheet.position, edits }, null)
        for (const [index, id] of addedIds(result.output)) {
          const change = toMap[index]
          if (change?.kind === 'add' && change.key.startsWith('new:')) newIds.push([change.key, id])
        }
      }
      const after = (await outlines()).find((s) => s.sheetId === link.sheetId) ?? sheet
      const finish = await window.mindmapApi.syncFinish?.({ linkId: link.linkId, choices: [...picked], newIds, mapOutline: after.outline })
      setDone((d) => ({
        ...d,
        [link.linkId]: !finish
          ? t('sendFailed', { error: 'not available' })
          : finish.ok
            ? t(finish.delivered === 'tab' ? 'syncAppliedTab' : 'syncAppliedFile', { n: finish.applied + toMap.length })
            : t('sendFailed', { error: finish.error }),
      }))
    } catch (error) {
      setDone((d) => ({ ...d, [link.linkId]: t('sendFailed', { error: error instanceof Error ? error.message : String(error) }) }))
    } finally {
      setBusy(null)
    }
  }

  const list = (title: StringKey, changes: readonly SyncChange[]) =>
    changes.length > 0 && (
      <div className="hp-sync-group">
        <div className="hp-sync-heading">{t(title)}</div>
        <ul>
          {changes.map((c, i) => (
            <li key={i}>
              <span className="hp-sync-kind">{t(KIND_LABEL[c.kind])}</span> {describe(c)}
            </li>
          ))}
        </ul>
      </div>
    )

  return (
    <Modal title={t('sendSync')} kind="hanpan-sync" onCancel={p.onClose}>
      <div className="hp-sync">
        {phase.kind === 'checking' && <p className="mm-modal-hint">{t('syncChecking')}</p>}
        {phase.kind === 'error' && <p className="mm-modal-hint error">{t('syncProblem', { error: phase.text })}</p>}
        {phase.kind === 'ready' && phase.links.length === 0 && <p className="mm-modal-hint">{t('syncNone')}</p>}
        {phase.kind === 'ready' &&
          phase.links.map((link) => {
            const plan = link.plan
            const empty = plan && !plan.toDoc.length && !plan.toMap.length && !plan.conflicts.length
            return (
              <section key={link.linkId} className="hp-sync-link" data-link={link.linkId}>
                <h3 className="hp-sync-doc">
                  {link.documentName || link.target.toUpperCase()} <span className="hp-sync-target">{link.target.toUpperCase()}</span>
                </h3>
                {!link.supported && <p className="mm-modal-hint">{t('syncNotSupported')}</p>}
                {link.problem && <p className="mm-modal-hint error">{t('syncProblem', { error: link.problem })}</p>}
                {empty && <p className="mm-modal-hint">{t('syncNoChanges')}</p>}
                {plan && !empty && (
                  <>
                    {list('syncToDoc', plan.toDoc)}
                    {list('syncToMap', plan.toMap)}
                    {plan.conflicts.length > 0 && (
                      <div className="hp-sync-group">
                        <div className="hp-sync-heading">{t('syncConflicts')}</div>
                        <ul>
                          {plan.conflicts.map((c) => (
                            <li key={c.key} className="hp-sync-conflict">
                              <span>{c.title}</span>
                              <span className="hp-sync-sides">
                                {c.map && <em>{describe(c.map)}</em>}
                                {c.doc && <em>{describe(c.doc)}</em>}
                              </span>
                              <select
                                value={choices[link.linkId]?.[c.key] ?? 'later'}
                                onChange={(e) =>
                                  setChoices((all) => ({ ...all, [link.linkId]: { ...all[link.linkId], [c.key]: e.target.value as ConflictChoice } }))
                                }
                              >
                                <option value="map">{t('syncChooseMap')}</option>
                                <option value="doc">{t('syncChooseDoc')}</option>
                                <option value="later">{t('syncChooseLater')}</option>
                              </select>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {done[link.linkId] ? (
                      <p className="mm-modal-hint" role="status">
                        {done[link.linkId]}
                      </p>
                    ) : (
                      <div className="mm-modal-actions">
                        <button
                          type="button"
                          className="mm-btn primary"
                          data-action="sync-apply"
                          disabled={busy !== null}
                          onClick={() => void apply(link)}
                        >
                          {t('syncApply')}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            )
          })}
      </div>
      <div className="mm-modal-actions">
        <button type="button" className="mm-btn" data-action="sync-close" onClick={p.onClose}>
          {t('syncClose')}
        </button>
      </div>
    </Modal>
  )
}
