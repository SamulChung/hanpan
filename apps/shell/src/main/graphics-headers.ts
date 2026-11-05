/**
 * The AI Photo and AI Illustration web apps install a page API that controls the
 * whole app (decision 0093). Only Hanpan's own host page, on the same origin,
 * may put an app page in a frame.
 */
export function graphicsResponseHeaders(
  host: string,
  file: string,
): Record<string, string> | undefined {
  if (host !== 'photo' && host !== 'illust') return undefined
  const path = file.replace(/\\/g, '/')
  if (!/\/web\/[^/]+\/.+\.html$/i.test(path)) return undefined
  return { 'content-security-policy': "frame-ancestors 'self'" }
}
