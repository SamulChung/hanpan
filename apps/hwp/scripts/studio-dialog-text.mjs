/**
 * The studio's dialogs write some of their text in Korean straight into the markup instead of
 * asking the catalogs (문서 비교·이력, 수식·차트 데이터, 쪽 테두리 …), so an English or Vietnamese
 * tab showed Korean there. These patches make them ask for keys of the app's own
 * (`hanpan.*`, words in studio-plugin/studio-locales/dialog-strings.mjs), one patch per file.
 *
 * Korean that stays is data, not interface text: the diff engine's markers and titles the
 * compare views match on, font names, the Korean outline numbering preset. The studio-locales
 * test lists each with its reason.
 *
 * Each edit is found exactly once (or exactly `count` times) in the upstream source, so an
 * rhwp upgrade that changes a dialog stops the build instead of leaving Korean behind.
 */

/** A patch for one studio UI file that imports the studio's `t` as `alias`. */
function dialog(stem, alias, build) {
  /** `alias('key', params)` */
  const call = (key, params) => `${alias}('${key}'${params ? `, ${params}` : ''})`
  /** the same call inside a template literal */
  const hole = (key, params) => '${' + call(key, params) + '}'
  /** a quoted literal that appears once, asked for by key */
  const lit = (text, key, params) => ({ find: `'${text}'`, replace: call(key, params) })
  return {
    [`studio-text-${stem}`]: {
      file: new RegExp(String.raw`[\\/]rhwp-studio[\\/]src[\\/]ui[\\/]` + stem + String.raw`\.ts$`),
      edits: build({ call, hole, lit }),
    },
  }
}

/** The value rendering the compare dialog and the history dialog share (same code in both). */
function diffValueEdits({ call, hole }) {
  return [
    {
      find: '<div class="compare-result-kv-head">텍스트 변경</div><div class="compare-result-kv-line"><span class="k">기존</span><span class="v">${this.escape(l)}</span></div><div class="compare-result-kv-line"><span class="k">변경</span>',
      replace: `<div class="compare-result-kv-head">${hole('hanpan.diff.textChanged')}</div><div class="compare-result-kv-line"><span class="k">${hole('hanpan.diff.before')}</span><span class="v">\${this.escape(l)}</span></div><div class="compare-result-kv-line"><span class="k">${hole('hanpan.diff.after')}</span>`,
    },
    ...[
      ['r', '행', 'row'],
      ['c', '열', 'col'],
      ['tprev', '텍스트', 'text'],
      ['cprev', '셀 텍스트', 'cellText'],
      ['txt', '텍스트 해시', 'textHash'],
      ['props', '속성 해시', 'propsHash'],
      ['box', '크기', 'size'],
      ['sig', '시그니처', 'signature'],
      ['crop', '자르기', 'crop'],
      ['effect', '효과', 'effect'],
      ['bc', '밝기/대비', 'brightnessContrast'],
      ['rot', '회전', 'rotation'],
      ['flip', '대칭', 'flip'],
      ['wrap', '본문배치', 'wrap'],
      ['rel', '기준', 'relTo'],
      ['pix', '시각 내용', 'visual'],
    ].map(([field, text, key]) => ({
      find: `      ${field}: '${text}',`,
      replace: `      ${field}: ${call(`hanpan.diff.field.${key}`)},`,
    })),
    {
      find: '`<div class="compare-result-kv">변경값:<br/>변경 셀 ${changedCells}개 (셀 미리보기 범위를 벗어나거나 텍스트가 길어 일부 생략됨)</div>`',
      replace: `\`<div class="compare-result-kv">${hole('hanpan.diff.changes')}<br/>${hole('hanpan.diff.changedCells', '{ count: changedCells }')}</div>\``,
    },
    {
      find: "const lp = left.props ?? '(없음)';",
      replace: `const lp = left.props ?? ${call('hanpan.diff.none')};`,
    },
    {
      find: "const rp = right.props ?? '(없음)';",
      replace: `const rp = right.props ?? ${call('hanpan.diff.none')};`,
    },
    {
      find: '`<div class="compare-result-kv">변경값:<br/>속성 해시: ${this.escape(lp)} → ${this.escape(rp)}</div>`',
      replace: `\`<div class="compare-result-kv">${hole('hanpan.diff.changes')}<br/>${hole('hanpan.diff.propsHashChange', '{ before: this.escape(lp), after: this.escape(rp) }')}</div>\``,
    },
    {
      find: '\'<div class="compare-result-kv">변경값:<br/>속성 값 변경</div>\'',
      replace: `\`<div class="compare-result-kv">${hole('hanpan.diff.changes')}<br/>${hole('hanpan.diff.propsChanged')}</div>\``,
    },
    {
      find: '`<div class="compare-result-kv">변경값:<br/>${body}</div>`',
      replace: `\`<div class="compare-result-kv">${hole('hanpan.diff.changes')}<br/>\${body}</div>\``,
    },
    {
      // the engine's marker is compared; what is shown is in the UI language
      find: "if (value === '(없음)') return value;",
      replace: `if (value === '(없음)') return ${call('hanpan.diff.none')};`,
    },
    {
      find: 'return `좌${nums[0]}, 상${nums[1]}, 우${nums[2]}, 하${nums[3]}`;',
      replace: `return ${call('hanpan.diff.cropValue', '{ left: nums[0], top: nums[1], right: nums[2], bottom: nums[3] }')};`,
    },
    {
      find: "return normalized || '(없음)';",
      replace: `return normalized || ${call('hanpan.diff.none')};`,
    },
    {
      find: "if (key === 'rot') return `${value}도`;",
      replace: `if (key === 'rot') return ${call('hanpan.diff.degrees', '{ value }')};`,
    },
    {
      find: 'return `밝기 ${b}, 대비 ${c}`;',
      replace: `return ${call('hanpan.diff.brightnessContrast', '{ brightness: b, contrast: c }')};`,
    },
    {
      find: "if (value === '10') return '가로';",
      replace: `if (value === '10') return ${call('hanpan.diff.flipHorizontal')};`,
    },
    {
      find: "if (value === '01') return '세로';",
      replace: `if (value === '01') return ${call('hanpan.diff.flipVertical')};`,
    },
    {
      find: "if (value === '11') return '가로+세로';",
      replace: `if (value === '11') return ${call('hanpan.diff.flipBoth')};`,
    },
    {
      find: "if (value === '00') return '없음';",
      replace: `if (value === '00') return ${call('hanpan.diff.flipNone')};`,
    },
    {
      find: "map.set(cell, text || '(빈값)');",
      replace: `map.set(cell, text || ${call('hanpan.diff.empty')});`,
    },
    ...[
      ['table', '표'],
      ['shape', '도형'],
      ['image', '이미지'],
      ['chart', '그래프'],
      ['text', '텍스트'],
    ].map(([kind, text]) => ({
      find: `if (kind === '${kind}') return '${text}';`,
      replace: `if (kind === '${kind}') return ${call(`hanpan.diff.kind.${kind}`)};`,
    })),
    { find: "    return '메타';", replace: `    return ${call('hanpan.diff.kind.meta')};` },
  ]
}

export const DIALOG_TEXT_PATCHES = {
  ...dialog('bookmark-dialog', 't', ({ call, lit }) => [
    {
      find: 'this.nameInput.value = `책갈피${count}`;',
      replace: `this.nameInput.value = ${call('hanpan.bookmark.defaultName', '{ count }')};`,
    },
    lit('새 책갈피 이름:', 'hanpan.bookmark.renamePrompt'),
  ]),
  ...dialog('cell-border-bg-dialog', 'i18nText', ({ lit }) => [
    lit('단순 역대각선', 'hanpan.cellBorder.backSlashCenter'),
    lit('아래쪽 분기 역대각선', 'hanpan.cellBorder.backSlashCenterBelow'),
    lit('전체 분기 역대각선', 'hanpan.cellBorder.backSlashAll'),
    lit('단순 대각선', 'hanpan.cellBorder.slashCenter'),
    lit('아래쪽 분기 대각선', 'hanpan.cellBorder.slashCenterBelow'),
    lit('전체 분기 대각선', 'hanpan.cellBorder.slashAll'),
    lit('대각선 해제', 'hanpan.cellBorder.clearSlash'),
    lit('역대각선 해제', 'hanpan.cellBorder.clearBackSlash'),
  ]),
  ...dialog('char-shape-dialog', 'i18nText', ({ call, lit }) => [
    lit('웹 글꼴', 'hanpan.font.webGroup'),
    lit('로컬 글꼴', 'hanpan.font.localGroup'),
    {
      find: "['없음', '실선', '점선', '굵은 선', '파선', '일점쇄선', '이점쇄선'].forEach",
      replace: `[${['none', 'solid', 'dotted', 'thick', 'dashed', 'dashDot', 'dashDotDot']
        .map((key) => call(`hanpan.line.${key}`))
        .join(', ')}].forEach`,
    },
  ]),
  ...dialog('chart-data-dialog', 't', ({ lit }) => [
    lit(
      '원본이 빈 값(결측)이라 이 자리는 고칠 수 없습니다 — 행을 새로 넣으면 값을 쓸 수 있습니다.',
      'hanpan.chartData.emptyCell',
    ),
    lit('원본에 이 계열의 값이 없던 자리입니다.', 'hanpan.chartData.absentCell'),
    lit('이 계열은 이름 칸(c:tx)이 없어 이름을 넣을 자리가 없습니다.', 'hanpan.chartData.noName'),
    lit('셀을 우클릭하면 행·계열을 넣거나 지울 수 있습니다.', 'hanpan.chartData.gridNote'),
    lit(
      '원형 차트는 첫 계열만 그리므로, 추가한 계열은 화면에 나타나지 않습니다.',
      'hanpan.chartData.pieExtraSeries',
    ),
    lit(
      '주식형 캔들은 첫·끝 계열을 몸통으로 삼습니다 — 양끝을 바꾸면 그림이 깨집니다.',
      'hanpan.chartData.candle',
    ),
    lit('다층 카테고리 차트는 행 구조를 바꿀 수 없습니다.', 'hanpan.chartData.multiLevelRows'),
    lit('계열마다 라벨이 달라 행 구조를 바꿀 수 없습니다.', 'hanpan.chartData.labelsDifferRows'),
    lit('마지막 행은 지울 수 없습니다.', 'hanpan.chartData.lastRow'),
    lit('마지막 계열은 지울 수 없습니다.', 'hanpan.chartData.lastSeries'),
  ]),
  ...dialog('compare-dialog', 'i18nText', (helpers) => [
    {
      find: "title.innerHTML = '<span>문서 비교</span>';",
      replace: `title.innerHTML = \`<span>${helpers.hole('hanpan.compare.title')}</span>\`;`,
    },
    helpers.lit('오른쪽 문서 로드 실패', 'hanpan.compare.rightLoadFailed'),
    helpers.lit('오른쪽 문서 로드 타임아웃', 'hanpan.compare.rightLoadTimeout'),
    {
      find: "if (!t) return '(없음)';",
      replace: `if (!t) return ${helpers.call('hanpan.diff.none')};`,
    },
    ...diffValueEdits(helpers),
  ]),
  ...dialog('history-dialog', 't', (helpers) => [
    {
      find: "title.innerHTML = '<span>문서 이력 관리</span>';",
      replace: `title.innerHTML = \`<span>${helpers.hole('hanpan.history.title')}</span>\`;`,
    },
    {
      find: "if (!trimmed) return '(없음)';",
      replace: `if (!trimmed) return ${helpers.call('hanpan.diff.none')};`,
    },
    ...diffValueEdits(helpers),
  ]),
  ...dialog('compare-result-window', 't', ({ call }) => [
    {
      find: "item.leftPreview || '(없음)')",
      replace: `item.leftPreview || ${call('hanpan.diff.none')})`,
      count: 2,
    },
    {
      find: "item.rightPreview || '(없음)')",
      replace: `item.rightPreview || ${call('hanpan.diff.none')})`,
      count: 2,
    },
    {
      find: "return { left: '(셀 텍스트 동일)', right: '(셀 텍스트 동일)' };",
      replace: `return { left: ${call('hanpan.diff.cellsUnchanged')}, right: ${call('hanpan.diff.cellsUnchanged')} };`,
    },
    {
      // the engine's empty marker shows in the UI language
      find: "if (!raw) return '(없음)';",
      replace: `if (!raw || raw === '(없음)') return ${call('hanpan.diff.none')};`,
    },
    {
      find: "${cell.replace(/^r(\\d+)c(\\d+)$/i, '$1행$2열')}",
      replace: '${cell.replace(/^r(\\d+)c(\\d+)$/i, ' + call('hanpan.diff.cellAddress') + ')}',
    },
    {
      find: 'lines.push(`... 외 ${cells.length - 5}개 셀`);',
      replace: `lines.push(${call('hanpan.diff.moreCells', '{ count: cells.length - 5 }')});`,
    },
    {
      find: "push('회전', kv.rot ? `${kv.rot}도` : undefined);",
      replace: `push(${call('hanpan.diff.field.rotation')}, kv.rot ? ${call('hanpan.diff.degrees', '{ value: kv.rot }')} : undefined);`,
    },
    ...[
      ['셀 텍스트', 'cellText'],
      ['행', 'row'],
      ['열', 'col'],
      ['크기', 'size'],
      ['텍스트', 'text'],
      ['자르기', 'crop'],
      ['효과', 'effect'],
      ['밝기/대비', 'brightnessContrast'],
      ['대칭', 'flip'],
      ['배치', 'layout'],
      ['기준', 'relTo'],
    ].map(([text, key]) => ({
      find: `push('${text}',`,
      replace: `push(${call(`hanpan.diff.field.${key}`)},`,
    })),
  ]),
  ...dialog('equation-props-dialog', 't', ({ call, lit }) => [
    lit('글자처럼 취급', 'hanpan.equationProps.treatAsChar'),
    {
      find: "if (!this.props?.hasCaption) return '없음';",
      replace: `if (!this.props?.hasCaption) return ${call('hanpan.caption.none')};`,
    },
    { find: "return '위';", replace: `return ${call('hanpan.caption.top')};` },
    { find: "return '아래';", replace: `return ${call('hanpan.caption.bottom')};` },
    { find: "return '왼쪽';", replace: `return ${call('hanpan.caption.left')};` },
    { find: "return '오른쪽';", replace: `return ${call('hanpan.caption.right')};` },
    {
      find: "default:\n        return '없음';",
      replace: `default:\n        return ${call('hanpan.caption.none')};`,
    },
  ]),
  ...dialog('field-insert-dialog', 't', ({ call }) => [
    {
      // set when the dialog is built and again when it is reused
      find: "this.guideInput.value = '입력하세요';",
      replace: `this.guideInput.value = ${call('hanpan.field.defaultGuide')};`,
      count: 2,
    },
  ]),
  ...dialog('font-set-edit-dialog', 't', ({ lit }) => [
    lit('웹 글꼴', 'hanpan.font.webGroup'),
    lit('로컬 글꼴', 'hanpan.font.localGroup'),
  ]),
  ...dialog('formula-dialog', 't', ({ call }) =>
    [
      ['합계', 'sum'],
      ['평균', 'average'],
      ['곱', 'product'],
      ['최소값', 'min'],
      ['최대값', 'max'],
      ['개수', 'count'],
      ['절대값', 'abs'],
      ['제곱근', 'sqrt'],
      ['반올림', 'round'],
      ['올림', 'ceiling'],
      ['내림', 'floor'],
      ['절삭', 'trunc'],
      ['나머지', 'mod'],
      ['조건', 'if'],
      ['정수', 'int'],
      ['부호', 'sign'],
      ['e 거듭제곱', 'exp'],
      ['자연로그', 'log'],
      ['상용로그', 'log10'],
      ['사인', 'sin'],
      ['코사인', 'cos'],
      ['탄젠트', 'tan'],
    ].map(([text, key]) => ({
      find: `desc: '${text}' }`,
      replace: `desc: ${call(`hanpan.formula.${key}`)} }`,
    })),
  ),
  ...dialog('hml-import-warning-message', 'i18nText', ({ call }) => [
    {
      find: "import type { HmlOpenMetadata } from '../core/wasm-bridge.ts';",
      replace: [
        "import type { HmlOpenMetadata } from '../core/wasm-bridge.ts';",
        "import { t as i18nText } from '../i18n/index.ts';",
      ].join('\n'),
    },
    {
      find: '`HML${version} 문서를 열었습니다. HML로 의미를 보존해 저장할 수 있지만 원본 바이트와 동일하지는 않습니다.`',
      replace: call('hanpan.hml.openedSavable', '{ version }'),
    },
    {
      find: '`HML${version} 문서를 열었습니다. 보존할 수 없는 요소가 있어 HML로는 저장할 수 없습니다. HWP 또는 HWPX로 저장하세요.`',
      replace: call('hanpan.hml.openedNotSavable', '{ version }'),
    },
    {
      find: '`지원하지 않거나 변환된 요소 ${metadata.warnings.length}건이 있습니다.`',
      replace: call('hanpan.hml.unsupported', '{ count: metadata.warnings.length }'),
    },
    {
      find: '`그 외 ${metadata.warnings.length - MAX_WARNING_PATHS}건`',
      replace: call('hanpan.hml.more', '{ count: metadata.warnings.length - MAX_WARNING_PATHS }'),
    },
  ]),
  ...dialog('hml-save-format-message', 'i18nText', ({ call, hole }) => [
    {
      find: "} from '../core/hml-save-capability.ts';",
      replace: [
        "} from '../core/hml-save-capability.ts';",
        "import { t as i18nText } from '../i18n/index.ts';",
      ].join('\n'),
    },
    {
      find: "'HML로 의미를 보존해 저장할 수 있지만 원본 바이트와 동일하지는 않습니다.\\n저장할 형식을 선택하세요.'",
      replace: call('hanpan.hml.saveKeepsMeaning'),
    },
    {
      find: "`${capability.diagnostic ?? 'HML 저장을 사용할 수 없습니다.'}\\nHWP 또는 HWPX로 저장할 수 있습니다.`",
      replace: `\`\${capability.diagnostic ?? ${call('hanpan.hml.saveUnavailable')}}\\n${hole('hanpan.hml.canSaveHwp')}\``,
    },
    {
      find: '`그 외 ${blockers.length - MAX_BLOCKER_PATHS}건`',
      replace: call('hanpan.hml.more', '{ count: blockers.length - MAX_BLOCKER_PATHS }'),
    },
  ]),
  ...dialog('hyperlink-dialog', 't', ({ call, lit }) => [
    lit(
      'http:// 또는 https://로 시작하는 웹 주소를 입력해 주세요.',
      'hanpan.hyperlink.needWebAddress',
    ),
    lit(
      '팝업이 차단되었습니다. 이 사이트의 팝업을 허용해 주세요.',
      'hanpan.hyperlink.popupBlocked',
    ),
    {
      find: "this.initial.existing ? '하이퍼링크 고치기' : '하이퍼링크'",
      replace: `this.initial.existing ? ${call('hanpan.hyperlink.editLabel')} : ${call('hanpan.hyperlink.label')}`,
    },
  ]),
  ...dialog('options-dialog', 'i18nText', ({ call, lit }) => [
    {
      find: 'return `저장소 접근 실패: ${state.lastError}`;',
      replace: `return ${call('hanpan.options.storageFailed', '{ error: state.lastError }')};`,
    },
    {
      find: 'return `문서별 확인 결과 저장됨: 사용 가능 ${state.count}개 / 확인한 글꼴 ${state.checkedFamilies.length}개${dateSuffix}`;',
      replace: `return ${call('hanpan.options.probeStored', '{ count: state.count, checked: state.checkedFamilies.length, date: dateSuffix }')};`,
    },
    {
      find: 'return `로컬 글꼴 결과 저장됨: 사용 가능 ${state.count}개 / 문서 후보 ${state.checkedFamilies.length}개 / 열거 누락 확인 ${state.probedFamilies.length}개${dateSuffix}`;',
      replace: `return ${call('hanpan.options.localStored', '{ count: state.count, checked: state.checkedFamilies.length, probed: state.probedFamilies.length, date: dateSuffix }')};`,
    },
    {
      find: 'return `로컬 글꼴 열거 결과 저장됨: ${state.count}개 · 문서별 누락 후보는 문서를 열 때 추가 확인${dateSuffix}`;',
      replace: `return ${call('hanpan.options.listStored', '{ count: state.count, date: dateSuffix }')};`,
    },
    lit(
      '로컬 글꼴 접근 권한이 허용되지 않았습니다. 브라우저 권한 설정에서 허용한 뒤 다시 시도해 주세요.',
      'hanpan.options.permissionDenied',
    ),
    lit(
      '글꼴 감지에 실패했습니다. 웹 대체 글꼴로 계속 사용할 수 있습니다.',
      'hanpan.options.detectFailed',
    ),
  ]),
  ...dialog('page-border-dialog', 't', ({ call }) => [
    ...[
      ['위쪽', 'sideTop'],
      ['왼쪽', 'sideLeft'],
      ['오른쪽', 'sideRight'],
      ['아래쪽', 'sideBottom'],
      ['모두', 'sideAll'],
    ].map(([text, key]) => ({
      find: `this.sideButton('${text}',`,
      replace: `this.sideButton(${call(`hanpan.pageBorder.${key}`)},`,
    })),
    ...[
      ['0', '무늬 없음', 'pageBorder.patternNone'],
      ['1', '가로선', 'pageBorder.patternHorizontal'],
      ['2', '세로선', 'pageBorder.patternVertical'],
      ['3', '대각선', 'pageBorder.patternDiagonal'],
      ['4', '격자', 'pageBorder.patternGrid'],
      ['0', '없음', 'line.none'],
      ['1', '실선', 'line.solid'],
      ['2', '파선', 'line.dashed'],
      ['3', '점선', 'line.dotted'],
      ['4', '일점 쇄선', 'line.dashDotSpaced'],
      ['5', '이점 쇄선', 'line.dashDotDotSpaced'],
      ['6', '긴 파선', 'line.longDash'],
      ['8', '이중선', 'line.double'],
      ['12', '물결선', 'line.wavy'],
    ].map(([value, text, key]) => ({
      find: `['${value}', '${text}'],`,
      replace: `['${value}', ${call(`hanpan.${key}`)}],`,
    })),
  ]),
  ...dialog('style-dialog', 't', ({ call }) => [
    {
      find: '`왼쪽 여백: ${ml} pt&nbsp;&nbsp;&nbsp;첫 줄: ${firstLine}`,',
      replace: `${call('hanpan.style.leftMargin', '{ margin: ml, firstLine }')},`,
    },
    {
      find: '`오른쪽 여백: ${mr} pt&nbsp;&nbsp;&nbsp;정렬 방식: ${align}`,',
      replace: `${call('hanpan.style.rightMargin', '{ margin: mr, align }')},`,
    },
    {
      find: '`줄 간격: ${lsStr}`,',
      replace: `${call('hanpan.style.lineSpacing', '{ value: lsStr }')},`,
    },
    {
      find: '`다음 스타일: ${nextStyleName}`,',
      replace: `${call('hanpan.style.nextStyle', '{ name: nextStyleName }')},`,
    },
    { find: '`글꼴: ${font}`,', replace: `${call('hanpan.style.font', '{ font }')},` },
    { find: '`크기: ${size} pt`,', replace: `${call('hanpan.style.size', '{ size }')},` },
    {
      find: '`장평: ${ratio}%&nbsp;&nbsp;자간: ${spacing}%`,',
      replace: `${call('hanpan.style.widthSpacing', '{ ratio, spacing }')},`,
    },
  ]),
  ...dialog('style-edit-dialog', 't', ({ lit }) => [lit('새 스타일', 'hanpan.style.newName')]),
  ...dialog('table-cell-props-dialog', 'i18nText', ({ call }) => [
    {
      find: "['위쪽', '가운데', '아래쪽'].map(",
      replace: `[${call('hanpan.cell.vAlignTop')}, ${call('hanpan.cell.vAlignCenter')}, ${call('hanpan.cell.vAlignBottom')}].map(`,
    },
    {
      find: "['가로쓰기', '세로쓰기'].map(",
      replace: `[${call('hanpan.cell.textHorizontal')}, ${call('hanpan.cell.textVertical')}].map(`,
    },
    {
      find: "['선형', '방사형', '원뿔형', '사각형']",
      replace: `[${['Linear', 'Radial', 'Conical', 'Square']
        .map((key) => call(`hanpan.cell.gradient${key}`))
        .join(', ')}]`,
    },
  ]),
  ...dialog('table-row-column-dialog', 't', ({ call, lit }) => [
    lit('위쪽에 줄 추가하기', 'hanpan.tableRowColumn.rowAbove'),
    lit('아래쪽에 줄 추가하기', 'hanpan.tableRowColumn.rowBelow'),
    lit('왼쪽에 칸 추가하기', 'hanpan.tableRowColumn.colLeft'),
    lit('오른쪽에 칸 추가하기', 'hanpan.tableRowColumn.colRight'),
    { find: "'row', '줄',", replace: `'row', ${call('hanpan.tableRowColumn.rows')},` },
    { find: "'col', '칸',", replace: `'col', ${call('hanpan.tableRowColumn.cols')},` },
  ]),
  ...dialog('toolbar', 't', ({ call }) => [
    {
      // found again by a mark of its own, not by its (now translated) label
      find: `this.fontName.querySelectorAll('optgroup[label="대표 글꼴"]')`,
      replace: `this.fontName.querySelectorAll('optgroup[data-hanpan-font-sets]')`,
    },
    {
      find: "group.label = '대표 글꼴';",
      replace: `group.label = ${call('hanpan.font.fontSetGroup')}; group.dataset.hanpanFontSets = '';`,
    },
  ]),
}
