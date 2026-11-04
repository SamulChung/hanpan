import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang, type Lang } from '@genoffice/i18n'
import App from './App'
import { LocaleProvider } from './i18n/locale'
import type { UiTheme } from '../shared/ipc'
import { applyKoreanDocFeatures, installScreenTips } from '@genoffice/ui'
import '@genoffice/ui/tokens.css'
import '@genoffice/ui/screentip.css'
import '@genoffice/ui/dropdown.css'
import 'mind-elixir/style.css'
import './styles.css'
import './map.css'

installScreenTips()

function applyTheme(theme: UiTheme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

void (async () => {
  const [lang, theme, koreanDocs] = await Promise.all([
    window.mindmapApi.getLanguage().catch(() => 'zh' as const),
    window.mindmapApi.getTheme().catch(() => 'system' as const),
    window.mindmapApi.getKoreanDocFeatures?.().catch(() => null) ?? null,
  ])
  document.documentElement.lang = htmlLang(lang as Lang)
  document.documentElement.dir = htmlDir(lang)
  applyTheme(theme)
  window.mindmapApi.onThemeChanged(applyTheme)
  // Hanpan: the Korean export targets follow the shell's switch (decision 0091)
  applyKoreanDocFeatures(koreanDocs)
  window.mindmapApi.onKoreanDocFeaturesChanged?.(applyKoreanDocFeatures)
  createRoot(document.getElementById('root')!).render(
    <LocaleProvider initial={lang}>
      <App />
    </LocaleProvider>,
  )
})()
