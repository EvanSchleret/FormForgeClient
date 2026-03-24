import { ref } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
import type { FormForgeClient, FormForgeClientConfig, FormForgeFormSchema } from '../types'

export interface FormForgeGetFormParams {
  key: string
  version?: string
}

export interface UseFormForgeGetFormOptions {
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
      const response = params.version !== undefined && params.version !== ''
        ? await client.getFormVersion(params.key, params.version)
        : await client.getForm(params.key)

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
