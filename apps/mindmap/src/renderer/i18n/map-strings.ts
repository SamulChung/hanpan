import type { Lang } from '@genoffice/i18n'
import type { MapStrings } from '../map/controller'
import { ARROWS, MARKER_COLORS, SMILEYS } from '../map/marker-families'
import { translateIn } from './locale'

/**
 * The texts the map itself shows, in one language: the titles new topics and
 * summaries start with, and the drawing library's context menu. The library
 * ships its own menu texts for a handful of languages; all twelve entries are
 * passed from this app's dictionaries instead, so every one of the 21
 * languages has them.
 */
export function mapStrings(lang: Lang): MapStrings {
  const text = (key: Parameters<typeof translateIn>[1]): string => translateIn(lang, key)
  return {
    newTopic: text('newTopic'),
    summary: text('tbSummary'),
    menu: {
      addChild: text('meAddChild'),
      addParent: text('meAddParent'),
      addSibling: text('meAddSibling'),
      removeNode: text('meRemoveNode'),
      focus: text('meFocus'),
      cancelFocus: text('meCancelFocus'),
      moveUp: text('meMoveUp'),
      moveDown: text('meMoveDown'),
      link: text('meLink'),
      linkBidirectional: text('meLinkBidirectional'),
      clickTips: text('meClickTips'),
      summary: text('meSummary'),
    },
    menuRelationship: text('tbRelationship'),
    menuLabel: text('tbLabel'),
    menuNote: text('tbNote'),
    menuLink: text('tbLink'),
    decoration: {
      priority: PRIORITY_LEVELS.map((n) => translateIn(lang, 'markerPriority', { n })),
      progress: PROGRESS_PERCENT.map((percent) => translateIn(lang, 'markerProgress', { percent })),
      flag: text('markerFlag'),
      star: text('markerStar'),
      flagColored: colored(lang, text('markerFlag')),
      starColored: colored(lang, text('markerStar')),
      smiley: named(SMILEYS, SMILEY_KEY, text),
      arrow: named(ARROWS, ARROW_KEY, text),
      otherMarker: text('markerOther'),
      pictureNotShown: text('pictureNotShown'),
    },
  }
}

const PRIORITY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
/** The nine steps of the progress markers, from not started to done, as the share that is done. */
const PROGRESS_PERCENT = [0, 13, 25, 38, 50, 63, 75, 88, 100] as const

type Key = Parameters<typeof translateIn>[1]

/** Each colour the panel offers, as the dictionary names it. */
export const COLOR_KEY: Readonly<Record<(typeof MARKER_COLORS)[number], Key>> = {
  red: 'colorRed',
  orange: 'colorOrange',
  'dark-blue': 'colorDarkBlue',
  purple: 'colorPurple',
  green: 'colorGreen',
  blue: 'colorBlue',
  gray: 'colorGray',
}

export const SMILEY_KEY: Readonly<Record<(typeof SMILEYS)[number], Key>> = {
  laugh: 'smileyLaugh',
  smile: 'smileySmile',
  cry: 'smileyCry',
  surprise: 'smileySurprise',
  boring: 'smileyBoring',
  angry: 'smileyAngry',
  embarrass: 'smileyEmbarrass',
}

export const ARROW_KEY: Readonly<Record<(typeof ARROWS)[number], Key>> = {
  left: 'arrowLeft',
  right: 'arrowRight',
  up: 'arrowUp',
  down: 'arrowDown',
  'left-right': 'arrowLeftRight',
  'up-down': 'arrowUpDown',
  refresh: 'arrowRefresh',
}

/** Each name of a family, in words. */
function named<N extends string>(
  names: readonly N[],
  keys: Readonly<Record<N, Key>>,
  text: (key: Key) => string,
): Record<N, string> {
  return Object.fromEntries(names.map((name) => [name, text(keys[name])])) as Record<N, string>
}

/** `name` in each colour the panel offers, keyed by the colour's name in the id. */
function colored(lang: Lang, name: string): Record<string, string> {
  return Object.fromEntries(
    MARKER_COLORS.map((color) => [
      color,
      translateIn(lang, 'markerColored', { name, color: translateIn(lang, COLOR_KEY[color]) }),
    ]),
  )
}
