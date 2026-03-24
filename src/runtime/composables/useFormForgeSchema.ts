import { ref } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
import type { FormForgeClient, FormForgeClientConfig, FormForgeFormSchema, FormForgeSchemaVersionsResponse } from '../types'

export interface UseFormForgeSchemaOptions {
  key: string
  version?: string
  immediate?: boolean
  loadVersions?: boolean
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export function useFormForgeSchema(options: UseFormForgeSchemaOptions) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const schema = ref<FormForgeFormSchema | null>(null)
  const versions = ref<FormForgeSchemaVersionsResponse | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function fetchSchema(): Promise<FormForgeFormSchema> {
    loading.value = true
    error.value = null

    try {
      const nextSchema = options.version !== undefined && options.version !== ''
        ? await client.getFormVersion(options.key, options.version)
        : await client.getForm(options.key)

      schema.value = nextSchema
      return nextSchema
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to fetch schema'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function fetchVersions(): Promise<FormForgeSchemaVersionsResponse> {
    loading.value = true
    error.value = null

    try {
      const nextVersions = await client.getFormVersions(options.key)
      versions.value = nextVersions
      return nextVersions
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to fetch schema versions'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function refresh(): Promise<FormForgeFormSchema> {
    const nextSchema = await fetchSchema()

    if (options.loadVersions === true) {
      await fetchVersions()
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
