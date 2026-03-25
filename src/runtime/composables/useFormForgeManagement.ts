import { ref } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
import type {
  FormForgeClient,
  FormForgeClientConfig,
  FormForgeDiffResponse,
  FormForgeJsonObject,
  FormForgeManagementCreateInput,
  FormForgeManagementPatchInput,
  FormForgeRevisionSummary
} from '../types'

export interface UseFormForgeManagementOptions {
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export function useFormForgeManagement(options: UseFormForgeManagementOptions = {}) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const forms = ref<FormForgeJsonObject[]>([])
  const lastListIncludeDeleted = ref<boolean>(false)

  async function withLoading<T>(callback: () => Promise<T>): Promise<T> {
    loading.value = true
    error.value = null

    try {
      return await callback()
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Management request failed'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function createForm(input: FormForgeManagementCreateInput, idempotencyKey?: string): Promise<FormForgeJsonObject> {
    return withLoading(() => client.createForm(input, { idempotencyKey }))
  }

  async function listForms(includeDeleted: boolean = false): Promise<FormForgeJsonObject[]> {
    return withLoading(async () => {
      const response = await client.listForms(includeDeleted)
      forms.value = response
      lastListIncludeDeleted.value = includeDeleted
      return response
    })
  }

  async function refreshForms(): Promise<FormForgeJsonObject[]> {
    return listForms(lastListIncludeDeleted.value)
  }

  async function patchForm(key: string, input: FormForgeManagementPatchInput, idempotencyKey?: string): Promise<FormForgeJsonObject> {
    return withLoading(() => client.patchForm(key, input, { idempotencyKey }))
  }

  async function publishForm(key: string, idempotencyKey?: string): Promise<FormForgeJsonObject> {
    return withLoading(() => client.publishForm(key, { idempotencyKey }))
  }

  async function unpublishForm(key: string, idempotencyKey?: string): Promise<FormForgeJsonObject> {
    return withLoading(() => client.unpublishForm(key, { idempotencyKey }))
  }

  async function deleteForm(key: string, idempotencyKey?: string): Promise<FormForgeJsonObject> {
    return withLoading(() => client.deleteForm(key, { idempotencyKey }))
  }

  async function getRevisions(key: string, includeDeleted: boolean = false): Promise<FormForgeRevisionSummary[]> {
    return withLoading(() => client.getRevisions(key, includeDeleted))
  }

  async function getDiff(key: string, fromVersion: number, toVersion: number): Promise<FormForgeDiffResponse> {
    return withLoading(() => client.getDiff(key, fromVersion, toVersion))
  }

  return {
    client,
    loading,
    error,
    forms,
    lastListIncludeDeleted,
    listForms,
    refreshForms,
    refresh: refreshForms,
    createForm,
    patchForm,
    publishForm,
    unpublishForm,
    deleteForm,
    getRevisions,
    getDiff
  }
}
