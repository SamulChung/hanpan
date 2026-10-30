import { describe, expect, it } from 'vitest'
import { GONGMUN_THEME, REPORT_THEME } from '../src/doc-theme'
import { blocksToHtml, escapeHtml, fontStack } from '../src/html-writer'
import { markdownToBlocks } from '../src/markdown-blocks'

describe('blocksToHtml', () => {
  const markdown = '# 보고 <초안>\n\n## Ⅰ. 개요\n\n- 첫 항목\n  - 아래 항목\n\n| 구분 | 내용 |\n|---|---|\n| A&B | "따옴표" |\n\n> ※ 참고 사항\n'

  it('lays the page out like the HWP: theme fonts, markers and a real table', () => {
    const html = blocksToHtml(markdownToBlocks(markdown), REPORT_THEME)
    expect(html).toContain('<title>보고 &lt;초안&gt;</title>')
    expect(html).toMatch(/<h1 style="font-family:'HY헤드라인M', 'Malgun Gothic'[^"]*font-size:22pt[^"]*text-align:center/)
    expect(html).toContain('>Ⅰ. 개요</h2>')
    expect(html).toContain('>○ 첫 항목</p>')
    expect(html).toContain('<th>구분</th>')
    expect(html).toContain('<td>A&amp;B</td><td>&quot;따옴표&quot;</td>')
    expect(html).toContain('>※ 참고 사항</p>')
    expect(html).toContain('@page { size: A4;')
  })

  it('takes the official-letter look from its theme', () => {
    expect(blocksToHtml(markdownToBlocks(markdown), GONGMUN_THEME)).toContain("font-family:'맑은 고딕'")
  })

  it('falls back to a serif for 명조 and a sans for the rest', () => {
    expect(fontStack('휴먼명조')).toBe("'휴먼명조', 'Batang', 'Noto Serif KR', serif")
    expect(fontStack('HY헤드라인M').endsWith('sans-serif')).toBe(true)
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
  })
})
