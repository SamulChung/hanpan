import { createRoot } from 'react-dom/client'
import { htmlDir, htmlLang, type Lang } from '@genoffice/i18n'
import { installScreenTips } from '@genoffice/ui'
import App from './App'
import { LocaleProvider } from './i18n/locale'
import { APP_GLOBAL, GRAPHICS_KINDS, type GraphicsKind } from '../shared/kinds'
import type { UiTheme } from '../shared/ipc'
import '@genoffice/ui/tokens.css'
import '@genoffice/ui/screentip.css'
import './styles.css'
import { graphicsApi, takeGraphicsApi } from './bridge'

installScreenTips()

// before the app's frame exists: the frame's own take then gets nothing
if (!takeGraphicsApi()) throw new Error('the graphics bridge is missing or was already taken')

function applyTheme(theme: UiTheme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

const requested = new URLSearchParams(location.search).get('kind')
const kind: GraphicsKind = GRAPHICS_KINDS.find((k) => k === requested) ?? 'illust'

/** The web build is there when its page is the app's own (a dev server answers unknown paths with this page). */
async function probeWeb(): Promise<boolean> {
  const response = await fetch(`./web/${kind}/index.html`)
  return response.ok && (await response.text()).includes(`${APP_GLOBAL[kind]}_`)
}

void (async () => {
  const [lang, theme] = await Promise.all([
    graphicsApi()
      .getLanguage()
      .catch(() => 'en' as Lang),
    graphicsApi()
      .getTheme()
      .catch(() => 'system' as const),
  ])
  document.documentElement.lang = htmlLang(lang)
  document.documentElement.dir = htmlDir(lang)
  applyTheme(theme)
  graphicsApi().onThemeChanged(applyTheme)
  createRoot(document.getElementById('root')!).render(
    <LocaleProvider initial={lang}>
      <App kind={kind} lang={lang} probeWeb={probeWeb} />
    </LocaleProvider>,
  )
})()
