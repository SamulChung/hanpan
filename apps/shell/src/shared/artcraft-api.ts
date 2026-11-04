// Hanpan: the ArtCraft desktop apps the Windows install carries (decision 0090),
// opened from Home. Shared by the main module, the shell preload and Home.

export const ARTCRAFT_APPS = ['photocraft', 'vectorcraft'] as const
export type ArtcraftApp = (typeof ARTCRAFT_APPS)[number]

export const ARTCRAFT_CHANNELS = {
  /** invoke() → the apps whose program is there (ArtcraftApp[]) */
  available: 'hanpan:artcraft-available',
  /** invoke(app) → ArtcraftOpenResult; answered for the shell window only */
  open: 'hanpan:open-artcraft',
} as const

export type ArtcraftOpenResult = { ok: true } | { ok: false; error: string }
