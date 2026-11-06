// 새 웹 문서는 하얀 화면 대신 무엇을 하면 되는지 알려 준다(0.17 리뷰 #17)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { EmptyPageHint } from '../src/renderer/components/EmptyPageHint'
import { ko } from '../src/renderer/i18n/app/ko'

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true))
afterEach(() => vi.unstubAllGlobals())

describe('EmptyPageHint', () => {
  it('offers the AI panel, a starter page and the source view', () => {
    const onSkeleton = vi.fn()
    const onAskAi = vi.fn()
    const onSource = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => root.render(createElement(EmptyPageHint, { onSkeleton, onAskAi, onSource })))
    const buttons = [...container.querySelectorAll('button')]
    expect(container.querySelector('[role="note"]')).not.toBeNull()
    expect(buttons).toHaveLength(3)
    act(() => buttons[0]!.click())
    act(() => buttons[1]!.click())
    act(() => buttons[2]!.click())
    expect(onAskAi).toHaveBeenCalledTimes(1)
    expect(onSkeleton).toHaveBeenCalledTimes(1)
    expect(onSource).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('speaks plain Korean', () => {
    expect(ko.emptyPageTitle).toBe('빈 웹 문서입니다')
    expect(ko.insertSkeleton).toBe('기본 틀 넣기')
    expect(ko.emptyPageBody).toContain('오른쪽 AI 도우미')
  })
})
