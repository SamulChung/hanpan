import type { zh } from './zh'

export const en = {
  loading: 'Loading the app…',
  failed: 'The app could not start.',
  retry: 'Try again',
  notInstalled: 'This installation does not include this app.',
  saveFailed: 'Could not save. The document stays marked as unsaved.',
  layeredSaveNotice: 'Saving as PSD to keep the layers and editing data.',
  openFailed: 'Could not open the file. Open it again from the app.',
} satisfies Record<keyof typeof zh, string>
