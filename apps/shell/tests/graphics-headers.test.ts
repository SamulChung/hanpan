import { describe, expect, it } from 'vitest'
import { graphicsResponseHeaders } from '../src/main/graphics-headers'

describe('graphicsResponseHeaders', () => {
  it('lets only Hanpan pages frame the web apps', () => {
    const frameOnly = { 'content-security-policy': "frame-ancestors 'self'" }
    expect(graphicsResponseHeaders('photo', 'C:\\out\\renderer\\web\\photo\\index.html')).toEqual(
      frameOnly,
    )
    expect(graphicsResponseHeaders('illust', '/out/renderer/web/illust/index.html')).toEqual(
      frameOnly,
    )
  })

  it('leaves the host page, the app files and other hosts alone', () => {
    expect(graphicsResponseHeaders('illust', '/out/renderer/index.html')).toBeUndefined()
    expect(
      graphicsResponseHeaders('illust', '/out/renderer/web/illust/app_bg.wasm'),
    ).toBeUndefined()
    expect(graphicsResponseHeaders('docs', '/out/renderer/web/x/index.html')).toBeUndefined()
  })
})
