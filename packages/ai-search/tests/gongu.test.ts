import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GONGU_API_BASE,
  gonguErrorOf,
  gonguImageDetail,
  gonguImageSearch,
  gonguServiceKey,
  gonguWorkOf,
  parseGonguXml,
  testGonguKey,
} from '../src/gongu'

/**
 * The Gongu expired-works service (docs/plans/gongu-images.md). Every test
 * stubs fetch: none reaches the Public Data Portal or uses a real key.
 */

const item = (seq: string, name: string, author: string, extra = '') =>
  `<item><authorNameKor>${author}</authorNameKor><writingName>${name}</writingName>` +
  `<writingSeq>${seq}</writingSeq><simgpath>https://img.example/s/${seq}.jpg</simgpath>` +
  `<limgpath>https://img.example/l/${seq}.jpg</limgpath>${extra}</item>`

const listXml = (items: string[], total = items.length) =>
  `<?xml version="1.0" encoding="UTF-8"?><response><header><resultCode>00</resultCode>` +
  `<resultMsg>NORMAL SERVICE.</resultMsg></header><body><items>${items.join('')}</items>` +
  `<numOfRows>20</numOfRows><pageNo>1</pageNo><totalCount>${total}</totalCount></body></response>`

const gatewayError = (code: string, auth: string) =>
  `<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE ERROR</errMsg>` +
  `<returnAuthMsg>${auth}</returnAuthMsg><returnReasonCode>${code}</returnReasonCode>` +
  `</cmmMsgHeader></OpenAPI_ServiceResponse>`

function stubFetch(answer: (url: URL) => Response) {
  const calls: URL[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = new URL(input)
      calls.push(url)
      return answer(url)
    }),
  )
  return calls
}

afterEach(() => vi.unstubAllGlobals())

describe('reading the answer', () => {
  it('reads header, total and the flat fields of each item, decoding entities and CDATA', () => {
    const parsed = parseGonguXml(
      listXml(
        [
          item('1', '씨름 &amp; 무동', '김홍도'),
          item('2', '<![CDATA[서당 <풍속도>]]>', '김&#xD64D;도'),
        ],
        7,
      ),
    )
    expect(parsed.resultCode).toBe('00')
    expect(parsed.totalCount).toBe(7)
    expect(parsed.items.map((i) => i.writingName)).toEqual(['씨름 & 무동', '서당 <풍속도>'])
    expect(parsed.items[1]!.authorNameKor).toBe('김홍도')
  })

  it('turns an item into a work, dropping unusable addresses and control characters', () => {
    const work = gonguWorkOf({
      writingSeq: '13064',
      writingName: '  단원\u0007풍속도첩 ',
      authorNameKor: '',
      authorNameEng: 'Kim Hong-do',
      createYear: '1780',
      provideGovName: '국립중앙박물관',
      simgpath: 'javascript:alert(1)',
      limgpath: 'https://img.example/l/13064.jpg',
    })
    expect(work).toEqual({
      workId: '13064',
      title: '단원풍속도첩',
      author: 'Kim Hong-do',
      year: '1780',
      provider: '국립중앙박물관',
      imageUrl: 'https://img.example/l/13064.jpg',
    })
  })

  it('reads the control characters out after decoding as well', () => {
    const parsed = parseGonguXml(listXml([item('3', 'a&#7;b', 'c')]))
    expect(parsed.items[0]!.writingName).toBe('a b')
  })

  it('reads a real detail answer: https picture addresses, year from the file name', () => {
    // shape of the service's answer for work 3066 as seen with a key on 2026-11-01
    const picture = (size: string) =>
      `http://gongu.copyright.or.kr/gongu/wrt/cmmn/wrtFileImageView.do?thumbAt=Y&amp;thumbSe=${size}&amp;wrtSn=4534&amp;fileSn=1`
    const parsed = parseGonguXml(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><response><header>' +
        '<resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header><body><item>' +
        '<authorNameKor>저작자 미상</authorNameKor><fileNameG>작자미상_호작도(까치호랑이)_18-19세기_4534.jpg</fileNameG>' +
        `<fileTypeG>image/pjpeg</fileTypeG><icnNo>ICN.914=0000000004534</icnNo><limgpath>${picture('b_thumb')}</limgpath>` +
        '<officialCountry>대한민국</officialCountry><provideGovName>한국미술정보센터</provideGovName>' +
        `<simgpath>${picture('t_thumb')}</simgpath><writingName>호작도(까치호랑이)</writingName>` +
        '<writingSeq>4534</writingSeq></item></body></response>',
    )
    expect(gonguErrorOf(parsed)).toBeNull()
    expect(gonguWorkOf(parsed.items[0]!)).toEqual({
      workId: '4534',
      title: '호작도(까치호랑이)',
      author: '저작자 미상',
      year: '18-19세기',
      country: '대한민국',
      provider: '한국미술정보센터',
      thumbUrl:
        'https://gongu.copyright.or.kr/gongu/wrt/cmmn/wrtFileImageView.do?thumbAt=Y&thumbSe=t_thumb&wrtSn=4534&fileSn=1',
      imageUrl:
        'https://gongu.copyright.or.kr/gongu/wrt/cmmn/wrtFileImageView.do?thumbAt=Y&thumbSe=b_thumb&wrtSn=4534&fileSn=1',
      fileType: 'image/pjpeg',
    })
  })

  it('reads no year out of an unknown year or a file name of another shape', () => {
    const year = (fileNameG: string, createYear?: string) =>
      gonguWorkOf({
        writingSeq: '3066',
        writingName: '호랑이',
        fileNameG,
        ...(createYear ? { createYear } : {}),
      })?.year
    expect(year('서병갑_호랑이_년도미상_3066.jpg')).toBeUndefined()
    expect(year('서병갑_호랑이_1950_9999.jpg')).toBeUndefined()
    expect(year('호랑이.jpg')).toBeUndefined()
    expect(year('서병갑_호랑이_1950_3066.jpg')).toBe('1950')
    expect(year('서병갑_호랑이_1950_3066.jpg', '1951')).toBe('1951')
  })

  it('leaves picture addresses on other hosts as they are', () => {
    expect(
      gonguWorkOf({ writingSeq: '1', writingName: 'a', simgpath: 'http://img.example/s.jpg' })
        ?.thumbUrl,
    ).toBe('http://img.example/s.jpg')
  })

  it('skips items without a number or a title', () => {
    expect(gonguWorkOf({ writingName: '제목' })).toBeNull()
    expect(gonguWorkOf({ writingSeq: '1', writingName: '  ' })).toBeNull()
    expect(gonguWorkOf({ writingSeq: '../x', writingName: '제목' })).toBeNull()
  })
})

describe('errors', () => {
  it('maps the gateway codes to kinds', () => {
    const kind = (code: string, auth: string) =>
      gonguErrorOf(parseGonguXml(gatewayError(code, auth)))
    expect(kind('30', 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR')).toBe('bad-key')
    expect(kind('20', 'SERVICE_ACCESS_DENIED_ERROR')).toBe('bad-key')
    expect(kind('31', 'DEADLINE_HAS_EXPIRED_ERROR')).toBe('expired-key')
    expect(kind('22', 'LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR')).toBe('quota')
    expect(kind('23', 'LIMITED_NUMBER_OF_SERVICE_REQUESTS_PER_SECOND_EXCEEDS_ERROR')).toBe('rate')
    expect(kind('29', 'BLACKLIST_IP_ACCESS_ERROR')).toBe('blocked')
    expect(kind('12', 'NO_OPENAPI_SERVICE_ERROR')).toBe('service')
  })

  it('reads the real answer to an unregistered key (HTTP 403, Korean message)', () => {
    const body =
      '<?xml version="1.0" encoding="UTF-8"?>\n<OpenAPI_ServiceResponse>\n<cmmMsgHeader>\n' +
      '  <errMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</errMsg>\n' +
      '  <returnAuthMsg>등록되지 않은 서비스키</returnAuthMsg>\n' +
      '  <returnReasonCode>30</returnReasonCode>\n</cmmMsgHeader>\n</OpenAPI_ServiceResponse>'
    expect(gonguErrorOf(parseGonguXml(body), 403)).toBe('bad-key')
  })

  it('reads the HTTP status when the body says nothing', () => {
    expect(gonguErrorOf(parseGonguXml('Unauthorized'), 401)).toBe('bad-key')
    expect(gonguErrorOf(parseGonguXml(''), 429)).toBe('rate')
    expect(gonguErrorOf(parseGonguXml(''), 500)).toBe('service')
    expect(gonguErrorOf(parseGonguXml(''), 200)).toBe('service')
  })

  it('treats no data as an empty answer, not a failure', () => {
    const empty = '<response><header><resultCode>03</resultCode></header><body/></response>'
    expect(gonguErrorOf(parseGonguXml(empty))).toBeNull()
    expect(gonguErrorOf(parseGonguXml(listXml([])))).toBeNull()
  })
})

describe('the key', () => {
  it('decodes a pasted URL-encoded key so it is encoded once', () => {
    expect(gonguServiceKey(' abc%2Bdef%3D%3D ')).toBe('abc+def==')
    expect(gonguServiceKey('abc+def==')).toBe('abc+def==')
    expect(gonguServiceKey('bad%zz')).toBe('bad%zz')
  })

  it('makes no request without a key', async () => {
    const calls = stubFetch(() => new Response(listXml([])))
    const result = await gonguImageSearch('호랑이', '  ')
    expect(result).toMatchObject({ ok: false, error: 'no-key' })
    expect(calls).toHaveLength(0)
  })

  it('checks a key with one request', async () => {
    const calls = stubFetch(() => new Response(listXml([item('1', '그림', '작가')])))
    expect(await testGonguKey('k%2B1')).toEqual({ ok: true, value: null })
    expect(calls).toHaveLength(1)
    expect(calls[0]!.searchParams.get('serviceKey')).toBe('k+1')
    expect(calls[0]!.searchParams.get('numOfRows')).toBe('1')
    stubFetch(() => new Response(gatewayError('30', 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR')))
    expect(await testGonguKey('k')).toMatchObject({ ok: false, error: 'bad-key' })
  })

  it('reports a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('getaddrinfo ENOTFOUND')
      }),
    )
    expect(await testGonguKey('k')).toMatchObject({ ok: false, error: 'network' })
  })
})

describe('search', () => {
  it('asks by title and by author, then merges by work number with title hits first', async () => {
    const calls = stubFetch((url) =>
      url.searchParams.has('writingName')
        ? new Response(
            listXml([item('1', '호랑이', '작자 미상'), item('2', '까치 호랑이', '미상')], 2),
          )
        : new Response(
            listXml([item('2', '까치 호랑이', '미상'), item('3', '맹호도', '호랑이')], 2),
          ),
    )
    const result = await gonguImageSearch(' 호랑이 ', 'key', { page: 2, perPage: 99 })
    expect(calls.map((c) => c.pathname)).toEqual([
      new URL(`${GONGU_API_BASE}/getImgExpWrtgList`).pathname,
      new URL(`${GONGU_API_BASE}/getImgExpWrtgList`).pathname,
    ])
    expect(calls[0]!.searchParams.get('writingName')).toBe('호랑이')
    expect(calls[1]!.searchParams.get('authorNameKor')).toBe('호랑이')
    expect(calls[0]!.searchParams.get('pageNo')).toBe('2')
    expect(calls[0]!.searchParams.get('numOfRows')).toBe('50')
    expect(result.ok && result.value.works.map((w) => w.workId)).toEqual(['1', '2', '3'])
    expect(result.ok && result.value.total).toBe(4)
  })

  it('stops after the first request when the key is refused', async () => {
    const calls = stubFetch(
      () => new Response(gatewayError('22', 'LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR')),
    )
    expect(await gonguImageSearch('a', 'key')).toMatchObject({ ok: false, error: 'quota' })
    expect(calls).toHaveLength(1)
  })

  it('makes no request for an empty query', async () => {
    const calls = stubFetch(() => new Response(listXml([])))
    expect(await gonguImageSearch('   ', 'key')).toEqual({ ok: true, value: { works: [] } })
    expect(calls).toHaveLength(0)
  })
})

describe('detail', () => {
  it('reads the one item of the detail answer', async () => {
    const calls = stubFetch(
      () =>
        new Response(
          '<response><header><resultCode>00</resultCode></header><body>' +
            item(
              '13064',
              '씨름',
              '김홍도',
              '<createYear>1780</createYear><officialCountry>한국</officialCountry>',
            ) +
            '</body></response>',
        ),
    )
    const result = await gonguImageDetail('13064', 'key')
    expect(calls[0]!.searchParams.get('writingSeq')).toBe('13064')
    expect(result).toMatchObject({
      ok: true,
      value: { workId: '13064', title: '씨름', author: '김홍도', year: '1780', country: '한국' },
    })
  })

  it('refuses a malformed work number without a request', async () => {
    const calls = stubFetch(() => new Response(''))
    expect(await gonguImageDetail('1&x=2', 'key')).toMatchObject({ ok: false, error: 'service' })
    expect(calls).toHaveLength(0)
  })
})
