import { ref } from '#imports'
import { toFormForgeJsonSubmissionPayload } from '../utils/submission'
import { useFormForgeClient } from './useFormForgeClient'
import type {
  FormForgeClient,
  FormForgeClientConfig,
  FormForgeDraftRecord,
  FormForgeJsonObject,
  FormForgeSubmissionPayload
} from '../types'

export interface UseFormForgeDraftsOptions {
  key: string
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export function useFormForgeDrafts(options: UseFormForgeDraftsOptions) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const draft = ref<FormForgeDraftRecord | null>(null)

  async function saveDraft(payload: FormForgeSubmissionPayload, meta?: FormForgeJsonObject): Promise<FormForgeDraftRecord | null> {
    loading.value = true
    error.value = null

    try {
      const response = await client.saveDraft(options.key, {
        payload: toFormForgeJsonSubmissionPayload(payload),
        meta
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

  async function fetchCurrentDraft(): Promise<FormForgeDraftRecord | null> {
    loading.value = true
    error.value = null

    try {
      const response = await client.getCurrentDraft(options.key)
      draft.value = response.data
      return response.data
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to fetch draft'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function deleteCurrentDraft(): Promise<FormForgeDraftRecord | null> {
    loading.value = true
    error.value = null

    try {
      const response = await client.deleteCurrentDraft(options.key)
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
