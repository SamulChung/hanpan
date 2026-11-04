import type { ArtcraftApp } from '../../../shared/artcraft-api'

/**
 * Home's line icons for the ArtCraft apps: a brush for PhotoCraft (photo
 * editing), a pen nib for VectorCraft (illustration). Drawn in currentColor, so
 * the card's theme token colors them.
 */
export function ArtcraftIcon({ app }: { app: ArtcraftApp }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {app === 'photocraft' ? (
        <>
          <path d="M19.5 4.5 11 13" />
          <path d="m9.2 11.4 3.4 3.4" />
          <path d="M9.2 13.2c-2.4.2-3.7 1.9-3.7 3.9 0 1.2-.6 2.1-1.5 2.6 3.5.9 7.7-.2 7.9-4.2" />
        </>
      ) : (
        <>
          <path d="M12 3 6.5 12 9 20.5h6l2.5-8.5z" />
          <path d="M12 3v7.5" />
          <circle cx="12" cy="12" r="1.5" />
        </>
      )}
    </svg>
  )
}
