import { computed, ref } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
import { normalizeFormForgeCategoryOptions as normalizeCategoryOptions } from '../utils/category'
import type { FormForgeRequestOptions } from '../api/request'
import type {
  FormForgeBusinessErrorCode,
  FormForgeCategory,
  FormForgeCategoryCreateInput,
  FormForgeCategoryListQuery,
  FormForgeCategoryListResponse,
  FormForgeCategorySelectOption,
  FormForgeCategoryUpdateInput,
  FormForgeClient,
  FormForgeClientConfig,
  FormForgeClientError,
  FormForgeScope,
  FormForgePaginationLinks,
  FormForgePaginationMeta
} from '../types'
import type { FormForgeMutationOptions } from '../api/management'

type FormForgeCategoryMode = 'list' | 'resource' | null

export interface UseFormForgeCategoryOptions {
  immediate?: boolean
  initialQuery?: FormForgeCategoryListQuery
  endpoint?: string
  scope?: FormForgeScope
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export type FormForgeCategoryRequestOptions = FormForgeRequestOptions

export interface FormForgeCategoryRefreshOptions {
  mode?: 'auto' | 'list' | 'resource'
  query?: FormForgeCategoryListQuery
  categoryKey?: string
  endpoint?: string
  scope?: FormForgeScope
}

function isFormForgeClientError(value: unknown): value is FormForgeClientError {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as FormForgeClientError

  return typeof candidate.status === 'number' && typeof candidate.code === 'string' && typeof candidate.message === 'string'
}

function resolveErrorMessage(caughtError: unknown): string {
  if (caughtError instanceof Error) {
    return caughtError.message
  }

  return 'Categories request failed'
}

export function useFormForgeCategory(options: UseFormForgeCategoryOptions = {}) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const clientError = ref<FormForgeClientError | null>(null)
  const list = ref<FormForgeCategory[]>([])
  const current = ref<FormForgeCategory | null>(null)
  const lastMeta = ref<FormForgePaginationMeta | undefined>(undefined)
  const lastLinks = ref<FormForgePaginationLinks | undefined>(undefined)
  const lastListQuery = ref<FormForgeCategoryListQuery>(options.initialQuery ?? {})
  const lastListEndpoint = ref<string | undefined>(options.endpoint)
  const lastListScope = ref<FormForgeScope | undefined>(options.scope)
  const lastCategoryKey = ref<string | null>(null)
  const lastMode = ref<FormForgeCategoryMode>(null)
  const immediateLoad = options.immediate ?? true

  const fieldErrors = computed<Record<string, string[]>>(() => clientError.value?.fieldErrors ?? {})
  const businessErrorCode = computed<FormForgeBusinessErrorCode | undefined>(() => clientError.value?.businessCode)
  const isCategoryInUse = computed<boolean>(() => businessErrorCode.value === 'CATEGORY_IN_USE')

  async function withLoading<T>(callback: () => Promise<T>): Promise<T> {
    loading.value = true
    error.value = null
    clientError.value = null

    try {
      return await callback()
    } catch (caughtError) {
      error.value = resolveErrorMessage(caughtError)

      if (isFormForgeClientError(caughtError)) {
        clientError.value = caughtError
      }

      throw caughtError
    } finally {
      loading.value = false
    }
  }

  function resolveEndpoint(requestOptions: FormForgeCategoryRequestOptions = {}): string | undefined {
    return requestOptions.endpoint ?? options.endpoint
  }

  function resolveScope(requestOptions: FormForgeCategoryRequestOptions = {}): FormForgeScope | undefined {
    return requestOptions.scope ?? options.scope
  }

  function withDefaultMutationOptions(mutationOptions: FormForgeMutationOptions = {}): FormForgeMutationOptions {
    return {
      ...mutationOptions,
      endpoint: mutationOptions.endpoint ?? options.endpoint,
      scope: mutationOptions.scope ?? options.scope
    }
  }

  async function listCategories(
    query: FormForgeCategoryListQuery = {},
    requestOptions: FormForgeCategoryRequestOptions = {}
  ): Promise<FormForgeCategoryListResponse> {
    return withLoading(async () => {
      const resolvedQuery = {
        ...lastListQuery.value,
        ...query
      }

      const endpoint = resolveEndpoint(requestOptions)
      const scope = resolveScope(requestOptions)
      const response = await client.listCategories(resolvedQuery, {
        endpoint,
        scope
      })
      list.value = response.data
      lastMeta.value = response.meta
      lastLinks.value = response.links
      lastListQuery.value = resolvedQuery
      lastListEndpoint.value = endpoint
      lastListScope.value = scope
      lastMode.value = 'list'
      return response
    })
  }

  async function getCategory(categoryKey: string, requestOptions: FormForgeCategoryRequestOptions = {}): Promise<FormForgeCategory> {
    return withLoading(async () => {
      const response = await client.getCategory(categoryKey, {
        endpoint: resolveEndpoint(requestOptions),
        scope: resolveScope(requestOptions)
      })
      current.value = response
      lastCategoryKey.value = categoryKey
      lastMode.value = 'resource'
      return response
    })
  }

  async function createCategory(input: FormForgeCategoryCreateInput, options: FormForgeMutationOptions = {}): Promise<FormForgeCategory> {
    return withLoading(async () => {
      const created = await client.createCategory(input, withDefaultMutationOptions(options))
      current.value = created
      list.value = [created, ...list.value.filter((item) => item.key !== created.key)]
      return created
    })
  }

  async function patchCategory(
    categoryKey: string,
    input: FormForgeCategoryUpdateInput,
    options: FormForgeMutationOptions = {}
  ): Promise<FormForgeCategory> {
    return withLoading(async () => {
      const updated = await client.patchCategory(categoryKey, input, withDefaultMutationOptions(options))
      current.value = updated
      list.value = list.value.map((item) => (item.key === updated.key ? updated : item))
      return updated
    })
  }

  async function deleteCategory(categoryKey: string, options: FormForgeMutationOptions = {}): Promise<FormForgeCategory> {
    return withLoading(async () => {
      const deleted = await client.deleteCategory(categoryKey, withDefaultMutationOptions(options))
      list.value = list.value.filter((item) => item.key !== categoryKey)

      if (current.value?.key === categoryKey) {
        current.value = null
      }

      return deleted
    })
  }

  async function refresh(options: FormForgeCategoryRefreshOptions = {}): Promise<FormForgeCategoryListResponse | FormForgeCategory> {
    const mode = options.mode ?? 'auto'
    const endpoint = options.endpoint ?? lastListEndpoint.value
    const scope = options.scope ?? lastListScope.value

    if (mode === 'list') {
      return listCategories(options.query ?? lastListQuery.value, {
        endpoint,
        scope
      })
    }

    if (mode === 'resource') {
      const categoryKey = options.categoryKey ?? lastCategoryKey.value

      if (typeof categoryKey === 'string' && categoryKey !== '') {
        return getCategory(categoryKey, {
          endpoint,
          scope
        })
      }

      return listCategories(options.query ?? lastListQuery.value, {
        endpoint,
        scope
      })
    }

    if (lastMode.value === 'resource') {
      const categoryKey = options.categoryKey ?? lastCategoryKey.value

      if (typeof categoryKey === 'string' && categoryKey !== '') {
        return getCategory(categoryKey, {
          endpoint,
          scope
        })
      }
    }

    return listCategories(options.query ?? lastListQuery.value, {
      endpoint,
      scope
    })
  }

  if (immediateLoad) {
    listCategories(options.initialQuery, {
      endpoint: options.endpoint,
      scope: options.scope
    }).catch(() => {})
  }

  return {
    client,
    loading,
    error,
    clientError,
    fieldErrors,
    businessErrorCode,
    isCategoryInUse,
    list,
    current,
    lastMeta,
    lastLinks,
    lastListQuery,
    lastListEndpoint,
    lastListScope,
    lastCategoryKey,
    listCategories,
    getCategory,
    createCategory,
    patchCategory,
    deleteCategory,
    refresh
  }
}

type FormForgeCategoryOptionsSource =
  | FormForgeCategory[]
  | { value: FormForgeCategory[] | null | undefined }
  | (() => FormForgeCategory[] | null | undefined)
  | Record<string, unknown>
  | null
  | undefined

export interface UseFormForgeCategoryOptionsHelperInput {
  source?: FormForgeCategoryOptionsSource
  categories?: FormForgeCategoryOptionsSource
  key?: string
  includeInactive?: boolean
  query?: FormForgeCategoryListQuery
  endpoint?: string
  scope?: FormForgeScope
  immediate?: boolean
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

function readCategorySourceValue(source: FormForgeCategoryOptionsSource): unknown {
  if (typeof source === 'function') {
    return source()
  }

  if (source !== null && typeof source === 'object' && 'value' in source) {
    return (source as { value: unknown }).value
  }

  return source
}

function pickCategoriesFromRecord(record: Record<string, unknown>, key: string): FormForgeCategory[] {
  const candidateKeys = [key, 'list', 'categories', 'data']

  for (const candidateKey of candidateKeys) {
    const candidate = readCategorySourceValue(record[candidateKey] as FormForgeCategoryOptionsSource)

    if (Array.isArray(candidate)) {
      return candidate as FormForgeCategory[]
    }
  }

  const rawData = readCategorySourceValue(record.data as FormForgeCategoryOptionsSource)

  if (rawData !== null && typeof rawData === 'object') {
    const nestedData = (rawData as Record<string, unknown>).data
    const resolvedNestedData = readCategorySourceValue(nestedData as FormForgeCategoryOptionsSource)

    if (Array.isArray(resolvedNestedData)) {
      return resolvedNestedData as FormForgeCategory[]
    }
  }

  return []
}

function resolveHelperCategories(options: UseFormForgeCategoryOptionsHelperInput): FormForgeCategory[] {
  const source = options.source ?? options.categories
  const resolvedSource = readCategorySourceValue(source)

  if (Array.isArray(resolvedSource)) {
    return resolvedSource as FormForgeCategory[]
  }

  if (resolvedSource !== null && typeof resolvedSource === 'object') {
    const key = options.key ?? 'list'
    return pickCategoriesFromRecord(resolvedSource as Record<string, unknown>, key)
  }

  return []
}

export function normalizeFormForgeCategoryOptions(
  categories: FormForgeCategory[],
  includeInactive: boolean = true
): FormForgeCategorySelectOption[] {
  return normalizeCategoryOptions(categories, includeInactive)
}

export function useFormForgeCategoryOptions(options: UseFormForgeCategoryOptionsHelperInput = {}) {
  const hasExplicitSource = options.source !== undefined || options.categories !== undefined

  const categoryLoader = hasExplicitSource
    ? null
    : useFormForgeCategory({
      immediate: options.immediate ?? true,
      initialQuery: options.query,
      endpoint: options.endpoint,
      scope: options.scope,
      client: options.client,
      clientConfig: options.clientConfig
    })

  return computed<FormForgeCategorySelectOption[]>(() => {
    const categories = hasExplicitSource
      ? resolveHelperCategories(options)
      : (categoryLoader?.list.value ?? [])
    return normalizeFormForgeCategoryOptions(categories, options.includeInactive ?? true)
  })
}
