// Types for tools/fetch-artcraft.mjs, consumed by tests via a relative import.
export interface ArtcraftPin {
  repo: string
  tag: string
  asset: string
  size: number
  sha256: string
  /** the program inside the unpacked folder */
  exe: string
  /** where the license files sit inside the unpacked folder ('.' for the top) */
  licenseDir: string
}

export declare function verifyDownload(path: string, pin: { size: number; sha256: string }): void
export declare function pinStamp(pin: { tag: string; sha256: string }): string
export declare function flattenSingleRoot(dir: string): void
export declare function dropPortableMarker(dir: string): void
