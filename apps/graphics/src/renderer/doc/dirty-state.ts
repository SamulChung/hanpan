/**
 * The tab's "unsaved changes" mark: the app's own mark, or a save whose write
 * failed after the app had already marked the document clean.
 */
export interface DirtyState {
  fromApp(dirty: boolean): void
  saveFailed(): void
  /** A save was written; `stillChanged` when the document was edited again meanwhile. */
  saved(stillChanged?: boolean): void
  current(): boolean
}

export function createDirtyState(setDirty: (dirty: boolean) => void): DirtyState {
  let app = false
  let failed = false
  let shown: boolean | null = null
  const publish = (): void => {
    const value = app || failed
    if (value !== shown) {
      shown = value
      setDirty(value)
    }
  }
  return {
    fromApp(dirty) {
      app = dirty
      publish()
    },
    saveFailed() {
      failed = true
      publish()
    },
    saved(stillChanged = false) {
      failed = false
      app = stillChanged
      publish()
    },
    current: () => app || failed,
  }
}
