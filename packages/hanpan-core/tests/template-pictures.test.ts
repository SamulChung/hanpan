import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { blocksToDocx } from '../src/docx-writer'
import { DOC_THEMES } from '../src/doc-theme'
import { blocksToHwp } from '../src/hwp-writer'
import { loadEngine } from './engine'
import { markdownToBlocks, type MarkdownPicture } from '../src/markdown-blocks'
import {
  PICTURE_TEMPLATES,
  TEMPLATE_PICTURES,
  pictureCredit,
  templateMapOutline,
} from '../src/template-pictures'
import { DOC_TEMPLATES } from '../src/templates-data'

const JPEG = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0xff, 0xd9,
])

const resolver = (id: string): MarkdownPicture | undefined => {
  const p = TEMPLATE_PICTURES.find((each) => each.id === id)
  return (
    p && {
      image: { bytes: JPEG, mime: 'image/jpeg', width: p.width, height: p.height },
      credit: pictureCredit(p),
    }
  )
}

describe('picture lines in template markdown', () => {
  it('puts the picture and its credit under it', () => {
    const blocks = markdownToBlocks('# 제목\n\n### 1. 풍경\n\n![인왕제색도](picture:inwang)\n', {
      picture: resolver,
    })
    const at = blocks.findIndex((b) => b.kind === 'image')
    expect(at).toBeGreaterThan(0)
    expect(blocks[at]).toMatchObject({
      kind: 'image',
      depth: 0,
      image: { mime: 'image/jpeg', width: 1280, height: 743 },
    })
    expect(blocks[at + 1]).toEqual({
      kind: 'para',
      depth: 0,
      role: 'note',
      text: '인왕제색도 — 출처: 정선, 「인왕제색도」, 공유마당, 저작권 보호기간 만료',
    })
  })

  it('names the publisher and CC BY for a CC BY picture', () => {
    expect(pictureCredit(TEMPLATE_PICTURES.find((p) => p.id === 'ssireum')!)).toBe(
      '출처: 김홍도, 「풍속화첩_씨름」, 한국데이터베이스산업진흥원, 공유마당, CC BY',
    )
  })

  it('keeps the caption as text without a resolver or for an unknown id', () => {
    for (const blocks of [
      markdownToBlocks('# 제목\n\n![인왕제색도](picture:inwang)\n'),
      markdownToBlocks('# 제목\n\n![없는 그림](picture:nothing)\n', { picture: resolver }),
    ]) {
      expect(blocks.some((b) => b.kind === 'image')).toBe(false)
      expect(blocks.at(-1)).toMatchObject({ kind: 'para', role: 'body' })
    }
  })

  it('reads an ordinary markdown image as its caption, as before', () => {
    const blocks = markdownToBlocks('# 제목\n\n![그림](https://example.com/a.png)\n', {
      picture: resolver,
    })
    expect(blocks.some((b) => b.kind === 'image')).toBe(false)
  })
})

describe('the picture templates', () => {
  it('use only pictures in the catalogue, each free to hand on', () => {
    const known = new Set(TEMPLATE_PICTURES.map((p) => p.id))
    for (const t of PICTURE_TEMPLATES) {
      for (const [, id] of t.markdown.matchAll(/\(picture:([a-z0-9-]+)\)/g))
        expect(known.has(id!), `${t.id} ${id}`).toBe(true)
    }
    for (const p of TEMPLATE_PICTURES) {
      expect(['만료', 'CC BY']).toContain(p.terms)
      expect(p.source).toMatch(
        /^https:\/\/gongu\.copyright\.or\.kr\/gongu\/wrt\/wrt\/view\.do\?wrtSn=\d+$/,
      )
    }
  })

  it('drop their picture lines, and only those, for a mind map', () => {
    const lesson = PICTURE_TEMPLATES.find((t) => t.id === 'old-painting-lesson')!
    const outline = templateMapOutline(lesson.markdown)
    expect(outline).not.toContain('picture:')
    expect(outline.split('\n')).toHaveLength(lesson.markdown.split('\n').length - 3)
    expect(outline).toContain('### 2. 서당의 하루')
    const story = PICTURE_TEMPLATES.find((t) => t.id === 'expired-story-lesson')!
    expect(templateMapOutline(story.markdown)).toBe(story.markdown)
  })

  it('have ids of their own', () => {
    const ids = [...DOC_TEMPLATES, ...PICTURE_TEMPLATES].map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('write a HWPX with the bundled pictures in it', async () => {
    const dir = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../../apps/shell/src/main/hanpan/pictures',
    )
    const bundled = (id: string): MarkdownPicture | undefined => {
      const p = TEMPLATE_PICTURES.find((each) => each.id === id)
      return (
        p && {
          image: {
            bytes: new Uint8Array(readFileSync(join(dir, `${id}.jpg`))),
            mime: 'image/jpeg',
            width: p.width,
            height: p.height,
          },
          credit: pictureCredit(p),
        }
      )
    }
    const lesson = PICTURE_TEMPLATES.find((t) => t.id === 'old-painting-lesson')!
    const { bytes } = blocksToHwp(
      await loadEngine(),
      markdownToBlocks(lesson.markdown, { picture: bundled }),
      DOC_THEMES.plain!,
      'hwpx',
    )
    const zip = await JSZip.loadAsync(bytes)
    expect(Object.keys(zip.files).filter((name) => name.startsWith('BinData/'))).toHaveLength(3)
  })

  it('write a Word document with every picture and its credit', async () => {
    for (const t of PICTURE_TEMPLATES) {
      const blocks = markdownToBlocks(t.markdown, { picture: resolver })
      const pictures = [...t.markdown.matchAll(/\(picture:/g)].length
      expect(blocks.filter((b) => b.kind === 'image')).toHaveLength(pictures)
      expect(blocks.filter((b) => b.kind === 'para' && b.text.includes('출처: '))).toHaveLength(
        pictures,
      )
      const bytes = await blocksToDocx(blocks, DOC_THEMES.plain!)
      expect(bytes.length).toBeGreaterThan(1000)
    }
  })
})
