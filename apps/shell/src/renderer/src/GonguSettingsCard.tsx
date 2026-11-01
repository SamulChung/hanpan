import { useEffect, useState } from 'react'
import type { GonguKeyCheck } from '../../shared/home-api'
import { gonguUiText, type GonguStringKey } from './i18n/strings-gongu'
import { useI18n } from './locale'
import { changeAiSettings, gonguApiKey, readAiSettings, withGonguApiKey } from './settings-ai'

type GonguFailure = Extract<GonguKeyCheck, { ok: false }>['error']

const FAILURE_KEYS: Record<GonguFailure, GonguStringKey> = {
  'no-key': 'gonguErrNoKey',
  'bad-key': 'gonguErrBadKey',
  'expired-key': 'gonguErrExpired',
  quota: 'gonguErrQuota',
  rate: 'gonguErrRate',
  blocked: 'gonguErrBlocked',
  network: 'gonguErrNetwork',
  service: 'gonguErrService',
}

/**
 * Settings → Integrations: the user's own Public Data Portal key for Gongu
 * picture search (docs/plans/gongu-images.md). The app ships no key: the
 * portal issues one per account with a daily quota. Check sends one short
 * search with the key in the box, saved or not.
 */
export function GonguSettingsCard() {
  const { lang } = useI18n()
  const t = (key: GonguStringKey) => gonguUiText(lang, key)
  const [saved, setSaved] = useState('')
  const [draft, setDraft] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<GonguStringKey | null>(null)

  useEffect(() => {
    let alive = true
    const load = () => {
      void readAiSettings().then((settings) => {
        if (!alive || !settings) return
        const key = gonguApiKey(settings)
        setSaved(key)
        setDraft(key)
      })
    }
    load()
    const off = window.aiOffice.onAiSettingsChanged?.(load)
    return () => {
      alive = false
      off?.()
    }
  }, [])

  const save = (key: string) => {
    setResult(null)
    void changeAiSettings((current) => withGonguApiKey(current, key)).then((next) => {
      if (next) setSaved(gonguApiKey(next))
    })
  }

  const check = async () => {
    const api = window.aiOffice.testGonguKey
    if (!api) return
    setChecking(true)
    setResult(null)
    const answer = await api(draft.trim()).catch((): GonguKeyCheck => ({
      ok: false,
      error: 'network',
    }))
    setChecking(false)
    setResult(answer.ok ? 'gonguOk' : FAILURE_KEYS[answer.error])
  }

  const next = draft.trim()
  return (
    <section className="set-intg-part set-gongu" data-testid="gongu-settings">
      <h4 className="set-pane-subtitle">{t('gonguTitle')}</h4>
      <div className="set-field-desc set-intg-lead">{t('gonguDesc')}</div>
      <div className="set-field-desc">{t('gonguHowTo')}</div>
      <div className="set-field">
        <div className="set-field-text">
          <div className="set-field-stack">
            <label className="set-field-label" htmlFor="set-gongu-key">
              {t('gonguKey')}
            </label>
            <div className="set-field-desc">{saved ? t('gonguKeySaved') : t('gonguNoKey')}</div>
          </div>
        </div>
        <input
          id="set-gongu-key"
          className="set-input"
          type="password"
          value={draft}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            setDraft(e.target.value)
            setResult(null)
          }}
        />
      </div>
      <div className="set-btn-row">
        <button className="set-btn primary" disabled={next === saved} onClick={() => save(next)}>
          {t('gonguSave')}
        </button>
        <button className="set-btn" disabled={!next || checking} onClick={() => void check()}>
          {checking ? t('gonguChecking') : t('gonguCheck')}
        </button>
        <button
          className="set-btn"
          disabled={!saved && !draft}
          onClick={() => {
            setDraft('')
            save('')
          }}
        >
          {t('gonguClear')}
        </button>
      </div>
      {result && (
        <div className="set-field-desc" role="status">
          {t(result)}
        </div>
      )}
      <div className="set-field-desc">{t('gonguPrivacy')}</div>
    </section>
  )
}
