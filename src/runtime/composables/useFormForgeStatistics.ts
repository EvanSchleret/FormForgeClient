import { ref } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
import type { FormForgeRequestOptions } from '../api/request'
import type {
  FormForgeClient,
  FormForgeClientConfig,
  FormForgeScope,
  FormForgeStatisticsQuery,
  FormForgeStatisticsResponse
} from '../types'

export interface UseFormForgeStatisticsOptions {
  key: string
  query: FormForgeStatisticsQuery
  endpoint?: string
  scope?: FormForgeScope
  immediate?: boolean
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export type FormForgeStatisticsFetchOptions = FormForgeRequestOptions

export function useFormForgeStatistics(options: UseFormForgeStatisticsOptions) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const statistics = ref<FormForgeStatisticsResponse | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const lastQuery = ref<FormForgeStatisticsQuery>(options.query)
  const lastEndpoint = ref<string | undefined>(options.endpoint)
  const lastScope = ref<FormForgeScope | undefined>(options.scope)

  async function fetchStatistics(
    query: FormForgeStatisticsQuery = options.query,
    requestOptions: FormForgeStatisticsFetchOptions = {}
  ): Promise<FormForgeStatisticsResponse> {
    loading.value = true
    error.value = null

    try {
      const endpoint = requestOptions.endpoint ?? options.endpoint
      const scope = requestOptions.scope ?? options.scope
      const response = await client.getFormStatistics(options.key, query, {
        endpoint,
        scope
      })
      statistics.value = response
      lastQuery.value = query
      lastEndpoint.value = endpoint
      lastScope.value = scope

      return response
    } catch (caughtError) {
      const message = typeof caughtError === 'object' && caughtError !== null && 'message' in caughtError
        ? caughtError.message
        : undefined
      error.value = typeof message === 'string' ? message : 'Statistics request failed'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function refresh(
    query: FormForgeStatisticsQuery = lastQuery.value,
    requestOptions: FormForgeStatisticsFetchOptions = {}
  ): Promise<FormForgeStatisticsResponse> {
    return fetchStatistics(query, {
      endpoint: requestOptions.endpoint ?? lastEndpoint.value,
      scope: requestOptions.scope ?? lastScope.value
    })
  }

  if (options.immediate !== false) {
    fetchStatistics().catch(() => {})
  }

  return {
    client,
    statistics,
    loading,
    error,
    lastQuery,
    lastEndpoint,
    lastScope,
    fetchStatistics,
    refresh
  }
}
