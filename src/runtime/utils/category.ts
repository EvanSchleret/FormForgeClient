import type {
  FormForgeCategory,
  FormForgeCategoryListResponse,
  FormForgeCategorySelectOption,
  FormForgeJsonObject,
  FormForgeJsonValue,
  FormForgePaginationLinks,
  FormForgePaginationMeta
} from '../types'
import { isFormForgeJsonObject } from './object'

function toStringOrNull(value: FormForgeJsonValue | undefined): string | null {
  if (typeof value === 'string') {
    return value
  }

  if (value === null) {
    return null
  }

  return null
}

function toBoolean(value: FormForgeJsonValue | undefined, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  return fallback
}

function toNumber(value: FormForgeJsonValue | undefined, fallback: number): number {
  if (typeof value === 'number') {
    return value
  }

  return fallback
}

function asJsonObjectArray(value: FormForgeJsonValue | undefined): FormForgeJsonObject[] {
  if (!Array.isArray(value)) {
    return []
  }

  const items: FormForgeJsonObject[] = []

  for (const item of value) {
    if (isFormForgeJsonObject(item)) {
      items.push(item)
    }
  }

  return items
}

function normalizePaginationMeta(value: FormForgeJsonValue | undefined): FormForgePaginationMeta | undefined {
  if (!isFormForgeJsonObject(value)) {
    return undefined
  }

  return value as FormForgePaginationMeta
}

function normalizePaginationLinks(value: FormForgeJsonValue | undefined): FormForgePaginationLinks | undefined {
  if (!isFormForgeJsonObject(value)) {
    return undefined
  }

  return value as FormForgePaginationLinks
}

function pickPaginationPayload(payload: FormForgeJsonObject): FormForgeJsonObject {
  const envelope = payload.data

  if (isFormForgeJsonObject(envelope) && Array.isArray(envelope.data)) {
    return envelope
  }

  return payload
}

export function normalizeFormForgeCategory(value: unknown): FormForgeCategory | null {
  if (!isFormForgeJsonObject(value as FormForgeJsonValue | undefined)) {
    return null
  }

  const category = value as FormForgeJsonObject
  const meta = isFormForgeJsonObject(category.meta) ? category.meta : {}

  return {
    id: toNumber(category.id, 0),
    key: typeof category.key === 'string' ? category.key : '',
    name: typeof category.name === 'string' ? category.name : '',
    description: toStringOrNull(category.description),
    is_active: toBoolean(category.is_active, false),
    meta,
    created_at: toStringOrNull(category.created_at),
    updated_at: toStringOrNull(category.updated_at)
  }
}

export function normalizeFormForgeCategoryListResponse(payload: FormForgeJsonObject): FormForgeCategoryListResponse {
  const paginationPayload = pickPaginationPayload(payload)
  const rawItems = asJsonObjectArray(paginationPayload.data)
  const categories: FormForgeCategory[] = []

  for (const rawItem of rawItems) {
    const item = normalizeFormForgeCategory(rawItem)
    if (item !== null) {
      categories.push(item)
    }
  }

  return {
    data: categories,
    meta: normalizePaginationMeta(paginationPayload.meta ?? payload.meta),
    links: normalizePaginationLinks(paginationPayload.links ?? payload.links)
  }
}

export function normalizeFormForgeCategoryOptions(
  categories: FormForgeCategory[],
  includeInactive: boolean = true
): FormForgeCategorySelectOption[] {
  const sortable = [...categories].sort((left, right) => left.name.localeCompare(right.name))
  const options: FormForgeCategorySelectOption[] = []

  for (const category of sortable) {
    if (!includeInactive && category.is_active === false) {
      continue
    }

    options.push({
      label: category.name,
      value: category.key,
      disabled: category.is_active === false
    })
  }

  return options
}
