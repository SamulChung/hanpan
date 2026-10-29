/**
 * Hanpan: 글집's document tools in the HWP tab. Tidy an official letter (dates,
 * times, the closing 끝.), check it, change its tone for a generation, mark the
 * three-colour review, and build a 역관목조분 prompt for the AI panel. The tools
 * that change the document load the result in place: the tab shows unsaved
 * changes, so not saving takes them back.
 */
import { useEffect, useRef, useState } from 'react'
import { composePrompt, type TaskType } from '@genoffice/hanpan-core/renderer'
import type { HanpanToolRequest, HanpanToolResult } from '../../shared/ipc'
import { useI18n, type StringKey } from '../i18n/locale'

const FINDING_KEY: Record<string, StringKey> = {
  'no-recipient': 'hpFNoRecipient',
  'no-title': 'hpFNoTitle',
  'no-closing': 'hpFNoClosing',
  'date-format': 'hpFDateFormat',
  'time-format': 'hpFTimeFormat',
  'numbering-order': 'hpFNumberingOrder',
  'lone-item-numbered': 'hpFLoneItemNumbered',
  'mixed-endings': 'hpFMixedEndings',
}

const TASKS: [TaskType, string][] = [
  ['summarize', '요약'],
  ['organize', '정리'],
  ['analyze', '분석'],
  ['generate', '생성'],
  ['explain', '설명'],
]

export function HanpanTools() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string[] | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const [axes, setAxes] = useState<{ role: string; field: string; purpose: string; conditions: string; length: string; task: TaskType | ''; body: string }>({
    role: '',
    field: '',
    purpose: '',
    conditions: '',
    length: '',
    task: '',
    body: '',
  })
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  if (!window.hwpApi.hanpanTool) return null

  const run = async (request: HanpanToolRequest) => {
    setBusy(true)
    setResult(null)
    const answer: HanpanToolResult = await window.hwpApi.hanpanTool!(request).catch((e: unknown) => ({ ok: false as const, error: String(e) }))
    setBusy(false)
    if (!answer.ok) {
      setResult([t('hpFailed', { error: answer.error })])
      return
    }
    if (answer.findings) {
      setResult(
        answer.findings.length
          ? answer.findings.map((f) => `${t(FINDING_KEY[f.code] ?? 'hpFailed', { error: f.code })}${f.sample ? ` — ${f.sample}` : ''}`)
          : [t('hpCheckOk')],
      )
    } else if (answer.counts) {
      setResult([t('hpReviewDone', answer.counts)])
    } else {
      setResult([answer.changed ? t('hpChanged', { n: answer.changed }) : t('hpNoChange')])
    }
  }

  const prompt = composePrompt({ ...axes, task: axes.task || undefined })

  return (
    <div className="hp-tools" ref={wrap}>
      <button type="button" className={`hp-tools-btn${open ? ' on' : ''}`} aria-expanded={open} data-action="hanpan-tools" onClick={() => setOpen((o) => !o)}>
        {t('hpTools')}
      </button>
      {open && (
        <div className="hp-tools-pop" role="menu">
          <button type="button" disabled={busy} data-tool="tidy" onClick={() => void run({ tool: 'tidy' })}>
            {t('hpTidy')}
          </button>
          <button type="button" disabled={busy} data-tool="check" onClick={() => void run({ tool: 'check' })}>
            {t('hpCheck')}
          </button>
          <div className="hp-tools-row">
            <span>{t('hpTone')}</span>
            {(['60대', '40대', 'MZ'] as const).map((target) => (
              <button key={target} type="button" disabled={busy} data-tool={`tone-${target}`} onClick={() => void run({ tool: 'tone', target })}>
                {t(target === '60대' ? 'hpTone60' : target === '40대' ? 'hpTone40' : 'hpToneMZ')}
              </button>
            ))}
          </div>
          <button type="button" disabled={busy} data-tool="review" onClick={() => void run({ tool: 'review' })}>
            {t('hpReview')}
          </button>
          <button type="button" data-tool="prompt" onClick={() => setPromptOpen((o) => !o)}>
            {t('hpPrompt')}
          </button>
          {promptOpen && (
            <div className="hp-prompt">
              <label>
                <span>{t('hpTask')}</span>
                <select value={axes.task} onChange={(e) => setAxes({ ...axes, task: e.target.value as TaskType | '' })}>
                  <option value="">—</option>
                  {TASKS.map(([id, ko]) => (
                    <option key={id} value={id}>
                      {ko}
                    </option>
                  ))}
                </select>
              </label>
              {(['role', 'field', 'purpose', 'conditions', 'length'] as const).map((key) => (
                <label key={key}>
                  <span>{t(({ role: 'hpRole', field: 'hpField', purpose: 'hpPurpose', conditions: 'hpConditions', length: 'hpLength' } as const)[key])}</span>
                  <input value={axes[key]} onChange={(e) => setAxes({ ...axes, [key]: e.target.value })} />
                </label>
              ))}
              <label>
                <span>{t('hpRequest')}</span>
                <textarea rows={3} value={axes.body} onChange={(e) => setAxes({ ...axes, body: e.target.value })} />
              </label>
              <pre className="hp-prompt-preview">{prompt}</pre>
              <button
                type="button"
                disabled={!prompt}
                onClick={() => void navigator.clipboard.writeText(prompt).then(() => setResult([t('hpCopied')]))}
              >
                {t('hpCopy')}
              </button>
            </div>
          )}
          {result && (
            <ul className="hp-tools-result" role="status">
              {result.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
