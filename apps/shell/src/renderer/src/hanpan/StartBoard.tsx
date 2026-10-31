import { useState, type FormEvent } from 'react'

/**
 * Hanpan's start board at the top of Home: the place every document begins.
 * A topic typed here opens a new mind map with it as the central topic; the
 * small map beside it shows where that map goes next (HWP report, slides, Word,
 * card news). The user guide is one click away from the top of the board.
 * Drawn in Hanpan's board green so Home reads as Hanpan's own.
 */
/** the help topic that walks through Hanpan (i18n/help/help-registry.ts) */
const HANPAN_HELP_TOPIC = 'hanpan'

export function StartBoard({ greeting, t }: { greeting: string; t: (key: string) => string }) {
  const [topic, setTopic] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const examples = [t('hpExample1'), t('hpExample2'), t('hpExample3')]
  const branches = [t('hpFlowHwp'), t('hpFlowPpt'), t('hpFlowDocx'), t('hpFlowCard')]

  const start = async (value: string) => {
    const text = value.trim()
    if (!text || busy) return
    setBusy(true)
    setFailed(false)
    try {
      const result = await window.hanpanApi?.newMap?.(text)
      if (result?.ok) setTopic('')
      else setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    // an empty box: the button points at it rather than doing nothing
    if (!topic.trim()) (event.currentTarget as HTMLFormElement).querySelector('input')?.focus()
    else void start(topic)
  }

  return (
    <section className="hp-board" data-hanpan="start-board">
      <div className="hp-board-main">
        <div className="hp-board-head">
          <p className="hp-board-greeting">{greeting}</p>
          <button
            type="button"
            className="hp-guide"
            data-hanpan="start-guide"
            data-tip={t('hpManualTip')}
            onClick={() => void window.aiOffice?.openHelp?.(HANPAN_HELP_TOPIC)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
            </svg>
            {t('hpManual')}
          </button>
        </div>
        <h1 className="hp-board-title">{t('hpHeroLine')}</h1>
        <form className="hp-start" onSubmit={submit}>
          <input
            className="hp-start-input"
            data-hanpan="start-topic"
            value={topic}
            maxLength={120}
            placeholder={t('hpStartPlaceholder')}
            aria-label={t('hpStartHint')}
            onChange={(e) => setTopic(e.target.value)}
          />
          <button type="submit" className="hp-start-go" data-hanpan="start-go" disabled={busy}>
            {t('hpStartButton')}
          </button>
        </form>
        <div className="hp-start-examples">
          {examples.map((example) => (
            <button key={example} type="button" className="hp-example" onClick={() => void start(example)} disabled={busy}>
              {example}
            </button>
          ))}
        </div>
        <p className={failed ? 'hp-start-note hp-start-failed' : 'hp-start-note'} role={failed ? 'alert' : undefined}>
          {failed ? t('hpStartFailed') : t('hpStartHint')}
        </p>
      </div>
      <figure className="hp-flow" aria-label={t('hpFlowLabel')}>
        <span className="hp-flow-root">{t('hpFlowMap')}</span>
        <svg className="hp-flow-lines" viewBox="0 0 64 166" preserveAspectRatio="none" aria-hidden="true">
          {branches.map((_, k) => (
            <path key={k} d={`M0 83 C 32 83, 32 ${19 + k * 43}, 64 ${19 + k * 43}`} />
          ))}
        </svg>
        <ul className="hp-flow-branches">
          {branches.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        <figcaption className="hp-flow-caption">{t('hpFlowLabel')}</figcaption>
      </figure>
    </section>
  )
}
