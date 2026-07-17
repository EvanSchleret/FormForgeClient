import { describe, expect, it } from 'vitest'
import type { FormForgePageSchema } from '../src/runtime/types'
import {
  resolveFormForgeRenderedPages,
  shouldShowFormForgeNavigation,
  shouldShowFormForgeProgress
} from '../src/runtime/utils/renderer-pagination'

function createPage(pageKey: string): FormForgePageSchema {
  return {
    page_key: pageKey,
    title: pageKey,
    description: null,
    meta: {},
    fields: []
  }
}

describe('renderer pagination', () => {
  const pages = [createPage('page_1'), createPage('page_2')]

  it('renders only the current page in auto mode', () => {
    expect(resolveFormForgeRenderedPages('auto', pages, pages[0] ?? null)).toEqual([pages[0]])
    expect(shouldShowFormForgeNavigation('auto', pages.length, false, false)).toBe(true)
    expect(shouldShowFormForgeProgress('auto', true, pages.length, false, false)).toBe(true)
  })

  it('renders every visible page and hides pagination UI in none mode', () => {
    expect(resolveFormForgeRenderedPages('none', pages, pages[0] ?? null)).toEqual(pages)
    expect(shouldShowFormForgeNavigation('none', pages.length, false, false)).toBe(false)
    expect(shouldShowFormForgeProgress('none', true, pages.length, false, false)).toBe(false)
  })
})
