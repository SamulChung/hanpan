import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { Lang } from '@genoffice/i18n'
import type { RecentEntry, UiTheme } from '../../shared/home-api'
import {
  DEFAULT_HOME_LAYOUT,
  HOME_MEMO_MAX,
  arrangeKeys,
  moveKey,
  normalizeHomeLayout,
  resetHomeLayout,
  toggleKey,
  type HomeLayout,
  type HomeWidgetId,
} from '../../shared/home-layout'
import { homeCustomText, type HomeCustomStringKey } from './i18n/strings-home-custom'
import './home-widgets.css'

/**
 * 0.17 위젯 및 인터페이스 사용자화: Home's widget row (favorites, a quick memo,
 * recent documents) and the "홈 꾸미기" panel. Everything stays on this
 * computer: the layout and the memo go to userData/app-settings.json, the file
 * lists come from the recents/starred lists Home already keeps.
 */

/** one app card as the panel and the favorites widget see it */
export interface HomeAppCard {
  key: string
  title: string
  icon: ReactElement
  action: () => unknown
}

/** how many files the favorites and recent widgets list */
const WIDGET_FILES = 5
/** the memo is written out this long after the last keystroke (and on leaving the box) */
const MEMO_SAVE_DELAY_MS = 800

/** Home's layout: read once, changed through `update`, stored after every change */
export function useHomeLayout(): [HomeLayout, (change: (prev: HomeLayout) => HomeLayout) => void] {
  const [layout, setLayout] = useState<HomeLayout>(DEFAULT_HOME_LAYOUT)
  const current = useRef(layout)
  const changed = useRef(false)
  useEffect(() => {
    let alive = true
    Promise.resolve(window.aiOffice.getHomeLayout?.())
      .then((stored) => {
        // a change made before the stored layout arrived wins over it
        if (!alive || changed.current) return
        current.current = normalizeHomeLayout(stored)
        setLayout(current.current)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])
  const update = useCallback((change: (prev: HomeLayout) => HomeLayout) => {
    changed.current = true
    const next = normalizeHomeLayout(change(current.current))
    current.current = next
    setLayout(next)
    // a failed write keeps the change for this session; the next launch shows the stored one
    void Promise.resolve(window.aiOffice.setHomeLayout?.(next)).catch(() => undefined)
  }, [])
  return [layout, update]
}

/** `cards` as the person arranged them, hidden ones dropped unless `withHidden` */
export function arrangeCards<T extends { key: string }>(
  cards: readonly T[],
  layout: HomeLayout,
  withHidden = false,
): T[] {
  const byKey = new Map(cards.map((card) => [card.key, card]))
  return arrangeKeys(
    cards.map((card) => card.key),
    layout.cardOrder,
  )
    .filter((key) => withHidden || !layout.hiddenCards.includes(key))
    .map((key) => byKey.get(key)!)
}

/** the first files of a list; `reloadKey` null means the widget is hidden and nothing is asked */
function useFileList(kind: 'recents' | 'starred', reloadKey: unknown): RecentEntry[] {
  const [entries, setEntries] = useState<RecentEntry[]>([])
  useEffect(() => {
    if (reloadKey === null) return
    let alive = true
    Promise.resolve(window.aiOffice[kind]?.({ limit: WIDGET_FILES }))
      .then((page) => {
        if (alive)
          setEntries(Array.isArray(page?.entries) ? page.entries.slice(0, WIDGET_FILES) : [])
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [kind, reloadKey])
  return entries
}

function FileList({
  entries,
  empty,
  attr,
}: {
  entries: RecentEntry[]
  empty: string
  attr: 'data-fav-file' | 'data-recent-file'
}) {
  if (entries.length === 0) return <p className="hw-empty">{empty}</p>
  return (
    <ul className="hw-files">
      {entries.map((entry) => (
        <li key={entry.path}>
          <button
            type="button"
            className="hw-file"
            {...{ [attr]: entry.path }}
            title={entry.path}
            disabled={entry.missing}
            onClick={() => void window.aiOffice.openPath(entry.path)}
          >
            <span className="hw-ext">{entry.ext.toUpperCase()}</span>
            <span className="hw-name">{entry.name}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function MemoWidget({
  memo,
  placeholder,
  onSave,
}: {
  memo: string
  placeholder: string
  onSave: (text: string) => void
}) {
  const [text, setText] = useState(memo)
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // the stored memo arrives after the first paint; take it unless the person is typing
  useEffect(() => {
    if (!dirty.current) setText(memo)
  }, [memo])
  const flush = (value: string) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (!dirty.current) return
    dirty.current = false
    onSave(value)
  }
  const flushRef = useRef(flush)
  flushRef.current = flush
  const textRef = useRef(text)
  textRef.current = text
  useEffect(() => () => flushRef.current(textRef.current), [])
  return (
    <textarea
      className="hw-memo"
      value={text}
      maxLength={HOME_MEMO_MAX}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(event) => {
        const value = event.target.value
        setText(value)
        dirty.current = true
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => flushRef.current(value), MEMO_SAVE_DELAY_MS)
      }}
      onBlur={(event) => flush(event.target.value)}
    />
  )
}

export function HomeWidgets({
  layout,
  update,
  cards,
  lang,
  reloadKey,
}: {
  layout: HomeLayout
  update: (change: (prev: HomeLayout) => HomeLayout) => void
  /** every app card Home offers, for the apps pinned to favorites */
  cards: readonly HomeAppCard[]
  lang: Lang
  /** changes when the recents or starred lists change */
  reloadKey: unknown
}) {
  const text = (key: HomeCustomStringKey) => homeCustomText(lang, key)
  const visible = layout.widgetOrder.filter((id) => !layout.hiddenWidgets.includes(id))
  const starred = useFileList('starred', visible.includes('favorites') ? reloadKey : null)
  const recents = useFileList('recents', visible.includes('recent') ? reloadKey : null)
  if (visible.length === 0) return null
  const pinned = layout.pinnedApps
    .map((key) => cards.find((card) => card.key === key))
    .filter((card): card is HomeAppCard => !!card)

  const body = (id: HomeWidgetId): ReactElement => {
    switch (id) {
      case 'favorites':
        return (
          <>
            {pinned.length > 0 && (
              <div className="hw-apps">
                {pinned.map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    className="hw-app"
                    data-fav-app={card.key}
                    onClick={() => void card.action()}
                  >
                    {card.icon}
                    <span className="hw-name">{card.title}</span>
                  </button>
                ))}
              </div>
            )}
            {starred.length > 0 || pinned.length === 0 ? (
              <FileList entries={starred} empty={text('favoritesEmpty')} attr="data-fav-file" />
            ) : null}
          </>
        )
      case 'memo':
        return (
          <MemoWidget
            memo={layout.memo}
            placeholder={text('memoPlaceholder')}
            onSave={(memo) => update((prev) => ({ ...prev, memo }))}
          />
        )
      case 'recent':
        return <FileList entries={recents} empty={text('recentEmpty')} attr="data-recent-file" />
    }
  }
  const title: Record<HomeWidgetId, HomeCustomStringKey> = {
    favorites: 'widgetFavorites',
    memo: 'widgetMemo',
    recent: 'widgetRecent',
  }
  return (
    <section className="home-widgets" aria-label={text('widgets')}>
      {visible.map((id) => (
        <div key={id} className="hw-card" data-widget={id}>
          <h2 className="hw-title">{text(title[id])}</h2>
          {body(id)}
        </div>
      ))}
    </section>
  )
}

function MoveButtons({
  text,
  onMove,
}: {
  text: (key: HomeCustomStringKey) => string
  onMove: (delta: -1 | 1) => void
}) {
  return (
    <span className="hc-move">
      <button
        type="button"
        data-move="up"
        aria-label={text('moveUp')}
        title={text('moveUp')}
        onClick={() => onMove(-1)}
      >
        ↑
      </button>
      <button
        type="button"
        data-move="down"
        aria-label={text('moveDown')}
        title={text('moveDown')}
        onClick={() => onMove(1)}
      >
        ↓
      </button>
    </span>
  )
}

export function HomeCustomizePanel({
  layout,
  update,
  groups,
  lang,
  themeLabels,
  onClose,
}: {
  layout: HomeLayout
  update: (change: (prev: HomeLayout) => HomeLayout) => void
  /** the app card groups as Home shows them (each reorders within itself) */
  groups: ReadonlyArray<{ label: string; cards: readonly HomeAppCard[] }>
  lang: Lang
  /** the theme labels Settings uses, so both places say the same */
  themeLabels: { title: string } & Record<UiTheme, string>
  onClose: () => void
}) {
  const text = (key: HomeCustomStringKey) => homeCustomText(lang, key)
  const [theme, setThemeState] = useState<UiTheme>('system')
  useEffect(() => {
    let alive = true
    Promise.resolve(window.aiOffice.getTheme?.())
      .then((saved) => {
        if (alive && (saved === 'light' || saved === 'dark' || saved === 'system'))
          setThemeState(saved)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])
  const chooseTheme = (next: UiTheme) => {
    setThemeState(next)
    void Promise.resolve(window.aiOffice.setTheme?.(next)).catch(() => undefined)
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const widgetTitle: Record<HomeWidgetId, HomeCustomStringKey> = {
    favorites: 'widgetFavorites',
    memo: 'widgetMemo',
    recent: 'widgetRecent',
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal home-custom"
        role="dialog"
        aria-modal="true"
        aria-label={text('customize')}
        data-home-custom="panel"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{text('customize')}</h3>
        <div className="hc-body">
          <fieldset className="hc-group">
            <legend>{text('widgets')}</legend>
            <ul className="hc-list">
              {layout.widgetOrder.map((id) => (
                <li key={id} data-custom-widget={id}>
                  <label className="hc-check">
                    <input
                      type="checkbox"
                      checked={!layout.hiddenWidgets.includes(id)}
                      onChange={() =>
                        update((prev) => ({
                          ...prev,
                          hiddenWidgets: toggleKey(prev.hiddenWidgets, id),
                        }))
                      }
                    />
                    {text(widgetTitle[id])}
                  </label>
                  <MoveButtons
                    text={text}
                    onMove={(delta) =>
                      update((prev) => ({
                        ...prev,
                        widgetOrder: moveKey(prev.widgetOrder, [], id, delta) as HomeWidgetId[],
                      }))
                    }
                  />
                </li>
              ))}
            </ul>
          </fieldset>
          <fieldset className="hc-group">
            <legend>{text('appCards')}</legend>
            {groups.map((group) => {
              const keys = group.cards.map((card) => card.key)
              return (
                <div key={group.label} className="hc-subgroup">
                  <p className="hc-sublabel">{group.label}</p>
                  <ul className="hc-list">
                    {arrangeCards(group.cards, layout, true).map((card) => {
                      const pinned = layout.pinnedApps.includes(card.key)
                      return (
                        <li key={card.key} data-custom-card={card.key}>
                          <label className="hc-check">
                            <input
                              type="checkbox"
                              checked={!layout.hiddenCards.includes(card.key)}
                              onChange={() =>
                                update((prev) => ({
                                  ...prev,
                                  hiddenCards: toggleKey(prev.hiddenCards, card.key),
                                }))
                              }
                            />
                            {card.title}
                          </label>
                          <button
                            type="button"
                            className={pinned ? 'hc-pin is-pinned' : 'hc-pin'}
                            data-pin={pinned ? 'on' : 'off'}
                            aria-pressed={pinned}
                            aria-label={text(pinned ? 'unpin' : 'pin')}
                            title={text(pinned ? 'unpin' : 'pin')}
                            onClick={() =>
                              update((prev) => ({
                                ...prev,
                                pinnedApps: toggleKey(prev.pinnedApps, card.key),
                              }))
                            }
                          >
                            {pinned ? '★' : '☆'}
                          </button>
                          <MoveButtons
                            text={text}
                            onMove={(delta) =>
                              update((prev) => ({
                                ...prev,
                                cardOrder: moveKey(keys, prev.cardOrder, card.key, delta),
                              }))
                            }
                          />
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </fieldset>
          <fieldset className="hc-group">
            <legend>{themeLabels.title}</legend>
            <div className="hc-radios">
              {(['light', 'dark', 'system'] as const).map((value) => (
                <label key={value} className="hc-check">
                  <input
                    type="radio"
                    name="home-theme"
                    value={value}
                    checked={theme === value}
                    onChange={() => chooseTheme(value)}
                  />
                  {themeLabels[value]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="hc-actions">
          <button
            type="button"
            className="btn btn-secondary"
            data-home-custom="reset"
            onClick={() => {
              update(resetHomeLayout)
              chooseTheme('system')
            }}
          >
            {text('reset')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            data-home-custom="close"
            onClick={onClose}
          >
            {text('close')}
          </button>
        </div>
      </div>
    </div>
  )
}
