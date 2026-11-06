/**
 * 0.17 위젯 및 인터페이스 사용자화: how the person arranged Home — which
 * widgets show and in what order, which app cards show and in what order, the
 * apps pinned to the favorites widget and the quick memo. Stored in
 * userData/app-settings.json under `homeLayout`; anything unreadable falls back
 * to the defaults one field at a time, so a damaged value never blanks Home.
 */

export const HOME_LAYOUT_SETTING_KEY = 'homeLayout'

/** the widgets Home can show; none of them reaches the network */
export const HOME_WIDGET_IDS = ['favorites', 'memo', 'recent'] as const
export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number]

/** the quick memo is a short note, not a document */
export const HOME_MEMO_MAX = 2000

/** app card keys are the `data-new` keys of Home's cards */
const CARD_KEY = /^[a-z0-9][a-z0-9-]{0,31}$/
const MAX_KEYS = 64

export interface HomeLayout {
  /** every widget exactly once, in display order */
  widgetOrder: HomeWidgetId[]
  hiddenWidgets: HomeWidgetId[]
  /** app card keys in the order the person put them; cards not listed keep their default place after */
  cardOrder: string[]
  hiddenCards: string[]
  /** app cards pinned to the favorites widget */
  pinnedApps: string[]
  memo: string
}

/** the recent documents widget starts hidden: the full recents list sits right below it */
export const DEFAULT_HOME_LAYOUT: HomeLayout = Object.freeze({
  widgetOrder: [...HOME_WIDGET_IDS],
  hiddenWidgets: ['recent'],
  cardOrder: [],
  hiddenCards: [],
  pinnedApps: [],
  memo: '',
}) as HomeLayout

function isWidgetId(value: unknown): value is HomeWidgetId {
  return HOME_WIDGET_IDS.includes(value as HomeWidgetId)
}

function widgetList(raw: unknown): HomeWidgetId[] | null {
  if (!Array.isArray(raw)) return null
  return [...new Set(raw.filter(isWidgetId))]
}

function keyList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const keys = raw.filter((key): key is string => typeof key === 'string' && CARD_KEY.test(key))
  return [...new Set(keys)].slice(0, MAX_KEYS)
}

export function normalizeHomeLayout(raw: unknown): HomeLayout {
  const value =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const order = widgetList(value.widgetOrder) ?? []
  const hidden = widgetList(value.hiddenWidgets)
  return {
    widgetOrder: [...order, ...HOME_WIDGET_IDS.filter((id) => !order.includes(id))],
    hiddenWidgets: hidden ?? [...DEFAULT_HOME_LAYOUT.hiddenWidgets],
    cardOrder: keyList(value.cardOrder),
    hiddenCards: keyList(value.hiddenCards),
    pinnedApps: keyList(value.pinnedApps),
    memo: typeof value.memo === 'string' ? value.memo.slice(0, HOME_MEMO_MAX) : '',
  }
}

/** `keys` in the stored `order`; keys the order does not name follow in their own order */
export function arrangeKeys<K extends string>(keys: readonly K[], order: readonly string[]): K[] {
  const rank = (key: K) => {
    const at = order.indexOf(key)
    return at === -1 ? order.length + keys.indexOf(key) : at
  }
  return [...keys].sort((a, b) => rank(a) - rank(b))
}

/**
 * Move `key` one place up (-1) or down (1) among `keys` as currently arranged;
 * returns the new stored order, keeping keys of other groups after.
 */
export function moveKey<K extends string>(
  keys: readonly K[],
  order: readonly string[],
  key: K,
  delta: -1 | 1,
): string[] {
  const arranged: string[] = arrangeKeys(keys, order)
  const rest = order.filter((k) => !arranged.includes(k))
  const at = arranged.indexOf(key)
  const to = at + delta
  if (at !== -1 && to >= 0 && to < arranged.length) {
    arranged[at] = arranged[to]!
    arranged[to] = key
  }
  return [...arranged, ...rest]
}

export function toggleKey<K extends string>(list: readonly K[], key: K): K[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
}

/** "기본값으로 되돌리기": the arrangement goes back, the memo text is the person's and stays */
export function resetHomeLayout(layout: HomeLayout): HomeLayout {
  return normalizeHomeLayout({ memo: layout.memo })
}
