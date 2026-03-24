import { ref, useRoute, watch } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
import type {
  FormForgeClient,
  FormForgeClientConfig,
  FormForgeJsonObject,
  FormForgeResponsesListResponse
} from '../types'

type FormForgeResponsesQueryValue = string | number | boolean | undefined
type FormForgeResponsesQuery = Record<string, FormForgeResponsesQueryValue>
type FormForgeRouteQueryValue = string | null | undefined | string[]

export interface UseFormForgeResponsesQuerySync {
  enabled?: boolean
  pageKey?: string
  perPageKey?: string
  extraKeys?: string[]
}

export interface UseFormForgeResponsesOptions {
  key: string
  immediate?: boolean
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
  querySync?: UseFormForgeResponsesQuerySync
}

export interface FormForgeResponsesRefreshOptions {
  mode?: 'auto' | 'list' | 'resource'
  query?: FormForgeResponsesQuery
  submissionId?: string
}

function normalizeRouteQueryValue(value: FormForgeRouteQueryValue): FormForgeResponsesQueryValue {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return undefined
    }

    return normalizeRouteQueryValue(value[0])
  }

  if (value === null || value === undefined || value === '') {
    return undefined
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  if (/^-?\d+$/.test(value)) {
    return Number(value)
  }

  return value
}

export function useFormForgeResponses(options: UseFormForgeResponsesOptions) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const route = useRoute()
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const list = ref<FormForgeJsonObject[]>([])
  const lastMeta = ref<FormForgeJsonObject | undefined>(undefined)
  const current = ref<FormForgeJsonObject | null>(null)
  const lastListQuery = ref<FormForgeResponsesQuery>({})
  const lastSubmissionId = ref<string | null>(null)
  const lastMode = ref<'list' | 'resource' | null>(null)
  const immediateLoad = options.immediate ?? true

  const syncOptions: Omit<Required<UseFormForgeResponsesQuerySync>, 'immediate'> = {
    enabled: options.querySync?.enabled ?? true,
    pageKey: options.querySync?.pageKey ?? 'page',
    perPageKey: options.querySync?.perPageKey ?? 'per_page',
    extraKeys: options.querySync?.extraKeys ?? []
  }

  function resolveRouteListQuery(): FormForgeResponsesQuery {
    if (syncOptions.enabled === false) {
      return {}
    }

    const query: FormForgeResponsesQuery = {}
    const keys = [syncOptions.pageKey, syncOptions.perPageKey, ...syncOptions.extraKeys]

    for (const key of keys) {
      const rawValue = route.query[key] as FormForgeRouteQueryValue
      const value = normalizeRouteQueryValue(rawValue)
      if (value !== undefined) {
        query[key] = value
      }
    }

    return query
  }

  function createListQuery(override: FormForgeResponsesQuery = {}): FormForgeResponsesQuery {
    return {
      ...resolveRouteListQuery(),
      ...override
    }
  }

  async function withLoading<T>(callback: () => Promise<T>): Promise<T> {
    loading.value = true
    error.value = null

    try {
      return await callback()
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Responses request failed'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function listResponses(
    query: FormForgeResponsesQuery = {}
  ): Promise<FormForgeResponsesListResponse> {
    return withLoading(async () => {
      const resolvedQuery = createListQuery(query)
      const response = await client.listResponses(options.key, resolvedQuery)
      list.value = response.data
      lastMeta.value = response.meta
      lastListQuery.value = resolvedQuery
      lastMode.value = 'list'
      return response
    })
  }

  async function getResponse(submissionId: string): Promise<FormForgeJsonObject> {
    return withLoading(async () => {
      const response = await client.getResponse(options.key, submissionId)
      current.value = response
      lastSubmissionId.value = submissionId
      lastMode.value = 'resource'
      return response
    })
  }

  async function deleteResponse(submissionId: string): Promise<FormForgeJsonObject> {
    return withLoading(async () => {
      const response = await client.deleteResponse(options.key, submissionId)
      current.value = response
      list.value = list.value.filter((item) => {
        const id = item.submission_id
        return !(typeof id === 'string' && id === submissionId)
      })
      return response
    })
  }

  async function refresh(options: FormForgeResponsesRefreshOptions = {}): Promise<FormForgeResponsesListResponse | FormForgeJsonObject> {
    const mode = options.mode ?? 'auto'

    if (mode === 'list') {
      return listResponses(options.query ?? lastListQuery.value)
    }

    if (mode === 'resource') {
      const submissionId = options.submissionId ?? lastSubmissionId.value

      if (typeof submissionId === 'string' && submissionId !== '') {
        return getResponse(submissionId)
      }

      return listResponses(options.query ?? lastListQuery.value)
    }

    if (lastMode.value === 'resource') {
      const submissionId = options.submissionId ?? lastSubmissionId.value

      if (typeof submissionId === 'string' && submissionId !== '') {
        return getResponse(submissionId)
      }
    }

    return listResponses(options.query ?? lastListQuery.value)
  }

  if (syncOptions.enabled === true) {
    watch(
      () => [
        route.query[syncOptions.pageKey],
        route.query[syncOptions.perPageKey],
        ...syncOptions.extraKeys.map((key) => route.query[key])
      ],
      () => {
        listResponses().catch(() => {})
      },
      {
        immediate: false
      }
    )
  }

  if (immediateLoad === true) {
    listResponses().catch(() => {})
  }

  return {
    client,
    loading,
    error,
    list,
    lastMeta,
    current,
    lastListQuery,
    lastSubmissionId,
    refresh,
    listResponses,
    getResponse,
    deleteResponse
  }
}
