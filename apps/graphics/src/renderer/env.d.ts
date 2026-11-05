/// <reference types="vite/client" />

import type { SplitPaneBridge } from '@genoffice/ui'
import type { GraphicsApi } from '../shared/ipc'

declare global {
  interface Window {
    graphicsApi: GraphicsApi
    /** the shell's split panes; read through @genoffice/ui's split-pane-role helpers */
    aiOfficeSplit?: SplitPaneBridge
  }
}

export {}
