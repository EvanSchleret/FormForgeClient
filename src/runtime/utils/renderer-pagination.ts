import type { FormForgePageSchema, FormForgeRendererPagination } from '../types'

export function resolveFormForgeRenderedPages(
  pagination: FormForgeRendererPagination,
  visiblePages: FormForgePageSchema[],
  currentPage: FormForgePageSchema | null
): FormForgePageSchema[] {
  if (pagination === 'none') {
    return visiblePages
  }

  return currentPage === null ? [] : [currentPage]
}

export function shouldShowFormForgeProgress(
  pagination: FormForgeRendererPagination,
  showProgress: boolean,
  pageCount: number,
  isPreviewMode: boolean,
  simulation: boolean
): boolean {
  return pagination === 'auto'
    && showProgress
    && pageCount > 1
    && (!isPreviewMode || simulation)
}

export function shouldShowFormForgeNavigation(
  pagination: FormForgeRendererPagination,
  pageCount: number,
  isPreviewMode: boolean,
  simulation: boolean
): boolean {
  return pagination === 'auto'
    && pageCount > 1
    && (!isPreviewMode || simulation)
}
