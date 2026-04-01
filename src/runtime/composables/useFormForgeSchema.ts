import { ref } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
import type { FormForgeClient, FormForgeClientConfig, FormForgeFormSchema, FormForgeSchemaVersionsResponse, FormForgeScope } from '../types'
import type { FormForgeRequestOptions } from '../api/request'

export interface UseFormForgeSchemaOptions {
  key: string
  version?: string
  endpoint?: string
  scope?: FormForgeScope
  immediate?: boolean
  loadVersions?: boolean
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export type FormForgeSchemaFetchOptions = FormForgeRequestOptions

export function useFormForgeSchema(options: UseFormForgeSchemaOptions) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const schema = ref<FormForgeFormSchema | null>(null)
  const versions = ref<FormForgeSchemaVersionsResponse | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  function resolveEndpoint(requestOptions: FormForgeSchemaFetchOptions = {}): string | undefined {
    return requestOptions.endpoint ?? options.endpoint
  }

  function resolveScope(requestOptions: FormForgeSchemaFetchOptions = {}): FormForgeScope | undefined {
    return requestOptions.scope ?? options.scope
  }

  async function fetchSchema(requestOptions: FormForgeSchemaFetchOptions = {}): Promise<FormForgeFormSchema> {
    loading.value = true
    error.value = null

    try {
      const endpoint = resolveEndpoint(requestOptions)
      const scope = resolveScope(requestOptions)
      const nextSchema = options.version !== undefined && options.version !== ''
        ? await client.getFormVersion(options.key, options.version, { endpoint, scope })
        : await client.getForm(options.key, { endpoint, scope })

      schema.value = nextSchema
      return nextSchema
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to fetch schema'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function fetchVersions(requestOptions: FormForgeSchemaFetchOptions = {}): Promise<FormForgeSchemaVersionsResponse> {
    loading.value = true
    error.value = null

    try {
      const nextVersions = await client.getFormVersions(options.key, {
        endpoint: resolveEndpoint(requestOptions),
        scope: resolveScope(requestOptions)
      })
      versions.value = nextVersions
      return nextVersions
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to fetch schema versions'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function refresh(requestOptions: FormForgeSchemaFetchOptions = {}): Promise<FormForgeFormSchema> {
    const nextSchema = await fetchSchema(requestOptions)

    if (options.loadVersions === true) {
      await fetchVersions(requestOptions)
    }

    return nextSchema
  }

  if (options.immediate !== false) {
    refresh().catch(() => {})
  }

  return {
    client,
    schema,
    versions,
    loading,
    error,
    fetchSchema,
    fetchVersions,
    refresh
  }
}
