import { computed, ref, watch } from '#imports'
import type { FormForgeFormSchema, FormForgePageSchema } from '../types'

export interface UseFormForgeWizardOptions {
  schema: () => FormForgeFormSchema | null
  isPageVisible?: (page: FormForgePageSchema, index: number) => boolean
}

export function useFormForgeWizard(options: UseFormForgeWizardOptions) {
  const pageIndex = ref<number>(0)

  const pages = computed<FormForgePageSchema[]>(() => {
    const schema = options.schema()
    if (schema === null) {
      return []
    }

    return schema.pages
  })

  const visiblePages = computed<FormForgePageSchema[]>(() => {
    if (options.isPageVisible === undefined) {
      return pages.value
    }

    return pages.value.filter((page, index) => options.isPageVisible?.(page, index) === true)
  })

  const pageCount = computed<number>(() => visiblePages.value.length)

  const currentPage = computed<FormForgePageSchema | null>(() => {
    const nextPage = visiblePages.value[pageIndex.value]
    return nextPage ?? null
  })

  const canGoPrevious = computed<boolean>(() => pageIndex.value > 0)
  const canGoNext = computed<boolean>(() => pageIndex.value < pageCount.value - 1)

  function setPageIndex(index: number): void {
    if (pageCount.value === 0) {
      pageIndex.value = 0
      return
    }

    if (index < 0) {
      pageIndex.value = 0
      return
    }

    if (index >= pageCount.value) {
      pageIndex.value = pageCount.value - 1
      return
    }

    pageIndex.value = index
  }

  function nextPage(): boolean {
    if (!canGoNext.value) {
      return false
    }

    setPageIndex(pageIndex.value + 1)
    return true
  }

  function previousPage(): boolean {
    if (!canGoPrevious.value) {
      return false
    }

    setPageIndex(pageIndex.value - 1)
    return true
  }

  function goToPage(pageKey: string): boolean {
    const index = visiblePages.value.findIndex((page) => page.page_key === pageKey)
    if (index < 0) {
      return false
    }

    setPageIndex(index)
    return true
  }

  function resetWizard(): void {
    setPageIndex(0)
  }

  watch(visiblePages, () => {
    setPageIndex(pageIndex.value)
  }, {
    immediate: true
  })

  return {
    pages,
    visiblePages,
    pageCount,
    pageIndex,
    currentPage,
    canGoPrevious,
    canGoNext,
    setPageIndex,
    nextPage,
    previousPage,
    goToPage,
    resetWizard
  }
}
