import { describe, expect, it } from 'vitest'
import type { ViewTopic } from '@genoffice/xmind-engine'
import { pictureTopics } from '../src/renderer/hanpan/CreditCheckDialog'

/** The mind map picture-credit check reads every sheet (docs/plans/gongu-images.md 4.8). */

function topic(id: string, extra: Partial<ViewTopic> = {}, children: ViewTopic[] = []): ViewTopic {
  return {
    id,
    title: id,
    folded: false,
    labels: [],
    note: null,
    link: null,
    image: null,
    markers: [],
    style: {},
    summaries: [],
    boundaries: [],
    children,
    ...extra,
  } as ViewTopic
}

describe('pictureTopics', () => {
  it('lists the topics with a picture, sheet by sheet, folded branches included', () => {
    const image = { src: 'xap:resources/a.png' } as unknown as ViewTopic['image']
    const sheets = [
      {
        key: 's1',
        root: topic('root', {}, [
          topic('a', { image, note: '메모' }, [topic('a1', { image, folded: true })]),
          topic('b'),
        ]),
      },
      { key: 's2', root: topic('root2', { image }) },
    ]
    expect(pictureTopics(sheets)).toEqual([
      { sheetKey: 's1', id: 'a', title: 'a', note: '메모' },
      { sheetKey: 's1', id: 'a1', title: 'a1', note: null },
      { sheetKey: 's2', id: 'root2', title: 'root2', note: null },
    ])
  })
})
