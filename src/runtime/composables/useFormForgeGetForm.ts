import { ref } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
import type { FormForgeClient, FormForgeClientConfig, FormForgeFormSchema, FormForgeScope } from '../types'

export interface FormForgeGetFormParams {
  key: string
  version?: string
  endpoint?: string
  scope?: FormForgeScope
}

export interface UseFormForgeGetFormOptions {
  endpoint?: string
  scope?: FormForgeScope
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export function useFormForgeGetForm(options: UseFormForgeGetFormOptions = {}) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const form = ref<FormForgeFormSchema | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function getForm(params: FormForgeGetFormParams): Promise<FormForgeFormSchema> {
    loading.value = true
    error.value = null

    try {
      const endpoint = params.endpoint ?? options.endpoint
      const scope = params.scope ?? options.scope
      const response = params.version !== undefined && params.version !== ''
        ? await client.getFormVersion(params.key, params.version, { endpoint, scope })
        : await client.getForm(params.key, { endpoint, scope })

      form.value = response
      return response
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to fetch form'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  function clear(): void {
    form.value = null
    error.value = null
  }

  return {
    client,
    form,
    loading,
    error,
    getForm,
    clear
  }
}
