/**
 * The find bar over the top end of the map (Ctrl+F), with a replace row
 * (Ctrl+H).
 *
 * Typing only counts the matches; nothing on the map moves until the user
 * steps to one (Enter, the arrows), because showing a match in a folded
 * branch unfolds it, and that is a change of the map.
 */
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/locale'
import type { FindMatch, FindOptions } from '../map/find'
import { IconClose } from './icons'

export interface FindBarProps {
  withReplace: boolean
  matches: readonly FindMatch[]
  /** the match shown now, or -1 before the first step */
  index: number
  /** what the last replace-all did, shown under the fields */
  message: string | null
  onQuery(query: string, options: FindOptions): void
  onStep(direction: 1 | -1): void
  onReplace(replacement: string): void
  onReplaceAll(replacement: string): void
  onShowReplace(): void
  onClose(): void
}

export function FindBar(p: FindBarProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [options, setOptions] = useState<FindOptions>({ matchCase: false, inNotes: false })
  const queryField = useRef<HTMLInputElement>(null)
  const replaceField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    queryField.current?.focus()
    queryField.current?.select()
  }, [])
  useEffect(() => {
    if (p.withReplace) replaceField.current?.focus()
  }, [p.withReplace])

  const search = (next: string, nextOptions: FindOptions): void => {
    setQuery(next)
    setOptions(nextOptions)
    p.onQuery(next, nextOptions)
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      p.onClose()
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      if (event.currentTarget === replaceField.current && !event.shiftKey) p.onReplace(replacement)
      else p.onStep(event.shiftKey ? -1 : 1)
    }
  }

  const current = p.index >= 0 ? p.matches[p.index] : undefined
  // the hint is about the match the next step shows: the one shown is unfolded already
  const upcoming = p.matches.length > 0 ? p.matches[(p.index + 1) % p.matches.length] : undefined
  const count =
    query === ''
      ? ''
      : p.matches.length === 0
        ? t('findNone')
        : t('findCount', { i: p.index + 1, n: p.matches.length })
  const none = p.matches.length === 0

  return (
    <div className="mm-find" data-hanpan="mm-find" role="search">
      <div className="mm-find-row">
        <input
          ref={queryField}
          className="mm-find-input"
          data-find="query"
          value={query}
          placeholder={t('findPlaceholder')}
          aria-label={t('findPlaceholder')}
          onChange={(e) => search(e.target.value, options)}
          onKeyDown={onKeyDown}
        />
        <span className="mm-find-count" data-find="count" aria-live="polite">
          {count}
        </span>
        <button
          type="button"
          className="mm-find-btn"
          data-action="find-prev"
          data-tip={t('findPrev')}
          aria-label={t('findPrev')}
          disabled={none}
          onClick={() => p.onStep(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="mm-find-btn"
          data-action="find-next"
          data-tip={t('findNext')}
          aria-label={t('findNext')}
          disabled={none}
          onClick={() => p.onStep(1)}
        >
          ↓
        </button>
        {!p.withReplace && (
          <button
            type="button"
            className="mm-find-btn mm-find-text"
            data-action="find-show-replace"
            onClick={p.onShowReplace}
          >
            {t('replaceOne')}
          </button>
        )}
        <button
          type="button"
          className="mm-find-btn"
          data-action="find-close"
          data-tip={t('findClose')}
          aria-label={t('findClose')}
          onClick={p.onClose}
        >
          <IconClose />
        </button>
      </div>
      {p.withReplace && (
        <div className="mm-find-row">
          <input
            ref={replaceField}
            className="mm-find-input"
            data-find="replace"
            value={replacement}
            placeholder={t('replacePlaceholder')}
            aria-label={t('replacePlaceholder')}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            className="mm-find-btn mm-find-text"
            data-action="replace-one"
            disabled={current?.where !== 'title'}
            onClick={() => p.onReplace(replacement)}
          >
            {t('replaceOne')}
          </button>
          <button
            type="button"
            className="mm-find-btn mm-find-text"
            data-action="replace-all"
            disabled={none}
            onClick={() => p.onReplaceAll(replacement)}
          >
            {t('replaceAll')}
          </button>
        </div>
      )}
      <div className="mm-find-row mm-find-options">
        <label>
          <input
            type="checkbox"
            checked={options.matchCase}
            onChange={(e) => search(query, { ...options, matchCase: e.target.checked })}
          />
          {t('findMatchCase')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.inNotes}
            onChange={(e) => search(query, { ...options, inNotes: e.target.checked })}
          />
          {t('findInNotes')}
        </label>
      </div>
      {upcoming?.folded && (
        <p className="mm-find-note" data-find="folded">
          {t('findFolded')}
        </p>
      )}
      {p.message && (
        <p className="mm-find-note" data-find="message">
          {p.message}
        </p>
      )}
    </div>
  )
}
