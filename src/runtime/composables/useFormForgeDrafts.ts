import { ref } from '#imports'
import { toFormForgeJsonSubmissionPayload } from '../utils/submission'
import { useFormForgeClient } from './useFormForgeClient'
import type { FormForgeRequestOptions } from '../api/request'
import type {
  FormForgeClient,
  FormForgeClientConfig,
  FormForgeDraftRecord,
  FormForgeJsonObject,
  FormForgeScope,
  FormForgeSubmissionPayload
} from '../types'

export interface UseFormForgeDraftsOptions {
  key: string
  endpoint?: string
  scope?: FormForgeScope
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export type FormForgeDraftRequestOptions = FormForgeRequestOptions

export function useFormForgeDrafts(options: UseFormForgeDraftsOptions) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const draft = ref<FormForgeDraftRecord | null>(null)

  function resolveEndpoint(requestOptions: FormForgeDraftRequestOptions = {}): string | undefined {
    return requestOptions.endpoint ?? options.endpoint
  }

  function resolveScope(requestOptions: FormForgeDraftRequestOptions = {}): FormForgeScope | undefined {
    return requestOptions.scope ?? options.scope
  }

  async function saveDraft(
    payload: FormForgeSubmissionPayload,
    meta?: FormForgeJsonObject,
    requestOptions: FormForgeDraftRequestOptions = {}
  ): Promise<FormForgeDraftRecord | null> {
    loading.value = true
    error.value = null

    try {
      const response = await client.saveDraft(options.key, {
        payload: toFormForgeJsonSubmissionPayload(payload),
        meta
      }, {
        endpoint: resolveEndpoint(requestOptions),
        scope: resolveScope(requestOptions)
      })

      draft.value = response.data
      return response.data
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to save draft'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function fetchCurrentDraft(requestOptions: FormForgeDraftRequestOptions = {}): Promise<FormForgeDraftRecord | null> {
    loading.value = true
    error.value = null

    try {
      const response = await client.getCurrentDraft(options.key, {
        endpoint: resolveEndpoint(requestOptions),
        scope: resolveScope(requestOptions)
      })
      draft.value = response.data
      return response.data
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to fetch draft'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function deleteCurrentDraft(requestOptions: FormForgeDraftRequestOptions = {}): Promise<FormForgeDraftRecord | null> {
    loading.value = true
    error.value = null

    try {
      const response = await client.deleteCurrentDraft(options.key, {
        endpoint: resolveEndpoint(requestOptions),
        scope: resolveScope(requestOptions)
      })
      draft.value = response.data
      return response.data
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to delete draft'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  return {
    client,
    loading,
    error,
    draft,
    saveDraft,
    fetchCurrentDraft,
    deleteCurrentDraft
  }
}
