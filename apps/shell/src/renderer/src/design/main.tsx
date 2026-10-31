import React from 'react'
import { createRoot } from 'react-dom/client'
import { htmlLang } from '@genoffice/i18n'
import '@genoffice/ui/tokens.css'
import '@genoffice/ui/ai-model-picker.css'
import './design.css'
import { DesignBoard, type DesignApi } from './DesignBoard'
import { registerBundledFonts } from './fonts'

type Theme = 'light' | 'dark' | 'system'

declare global {
  interface Window {
    hanpanDesign: DesignApi & {
      getInit(): Promise<{ lang: string; theme: Theme; outline?: string }>
      onThemeChanged(handler: (theme: Theme) => void): () => void
    }
  }
}

function applyTheme(theme: Theme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

registerBundledFonts()
const api = window.hanpanDesign
void api.getInit().then(({ lang, theme, outline }) => {
  applyTheme(theme)
  api.onThemeChanged(applyTheme)
  document.documentElement.lang = htmlLang(lang as never)
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <DesignBoard lang={lang} api={api} outline={outline} />
    </React.StrictMode>,
  )
})
