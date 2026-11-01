/**
 * Hanpan: the picture-credit check of a mind map (docs/plans/gongu-images.md 4.8). Every
 * topic with a picture, on every sheet, is credited when a line of its note is a credit
 * line the app wrote; a credited work with licence conditions is named too. Read-only and
 * offline: "Go" only brings the topic into view.
 */
import {
  licenseName,
  topicCreditIssues,
  type PictureCreditIssue,
} from '@genoffice/hanpan-core/renderer'
import type { ViewTopic } from '@genoffice/xmind-engine'
import { Modal } from '../components/dialogs'
import { uiLang, useI18n } from '../i18n/locale'

export interface PictureTopic {
  sheetKey: string
  id: string
  title: string
  note: string | null
}

/** The topics that carry a picture, sheet by sheet in reading order. */
export function pictureTopics(sheets: readonly { key: string; root: ViewTopic }[]): PictureTopic[] {
  const found: PictureTopic[] = []
  const walk = (sheetKey: string, topic: ViewTopic): void => {
    if (topic.image) found.push({ sheetKey, id: topic.id, title: topic.title, note: topic.note })
    for (const child of topic.children) walk(sheetKey, child)
  }
  for (const sheet of sheets) walk(sheet.key, sheet.root)
  return found
}

export function CreditCheckDialog(p: {
  sheets: readonly { key: string; root: ViewTopic }[]
  onGo(sheetKey: string, topicId: string): void
  onClose(): void
}) {
  const { t } = useI18n()
  const topics = pictureTopics(p.sheets)
  const issues = topicCreditIssues(topics)

  const lineOf = (issue: PictureCreditIssue): string => {
    const topic = topics[issue.picture - 1]?.title ?? ''
    if (issue.kind === 'conditions')
      return t('mmCreditConditions', {
        topic,
        title: issue.title,
        license: licenseName(issue.license, uiLang()),
      })
    return t('mmCreditNoCredit', { topic })
  }

  return (
    <Modal title={t('mmCredits')} kind="hanpan-credits" onCancel={p.onClose}>
      <div className="hp-credits" data-credit-issues={issues.length}>
        {topics.length === 0 && <p className="mm-modal-hint">{t('mmCreditsNone')}</p>}
        {topics.length > 0 && issues.length === 0 && (
          <p className="mm-modal-hint">{t('mmCreditsOk', { n: topics.length })}</p>
        )}
        {issues.length > 0 && (
          <ul className="hp-credits-list">
            {issues.map((issue, index) => {
              const topic = topics[issue.picture - 1]
              return (
                <li key={index} data-credit-kind={issue.kind}>
                  <span>{lineOf(issue)}</span>
                  {topic && (
                    <button type="button" onClick={() => p.onGo(topic.sheetKey, topic.id)}>
                      {t('mmCreditGo')}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <div className="mm-modal-actions">
          <button type="button" onClick={p.onClose}>
            {t('syncClose')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
