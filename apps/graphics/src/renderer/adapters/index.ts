import type { GraphicsKind } from '../../shared/kinds'
import type { GraphicsPageApi } from '../frame/page-api'
import { createIllustAdapter } from './illust'
import type { GraphicsAdapter } from './types'

export type { DocInfo, GraphicsAdapter } from './types'

/** The adapter for a tab's app. The photo one comes with the pinned PhotoCraft build (plan B Task 10). */
export function createAdapter(kind: GraphicsKind, api: GraphicsPageApi): GraphicsAdapter {
  if (kind === 'illust') return createIllustAdapter(api)
  throw new Error('photo adapter not connected yet')
}
