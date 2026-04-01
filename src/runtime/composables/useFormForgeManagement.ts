import { computed, ref } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
import type { FormForgeManagementRequestOptions, FormForgeMutationOptions } from '../api/management'
import type {
  FormForgeBusinessErrorCode,
  FormForgeClient,
  FormForgeClientConfig,
  FormForgeClientError,
  FormForgeDiffResponse,
  FormForgeManagementCreateInput,
  FormForgeManagementForm,
  FormForgeManagementPatchInput,
  FormForgeScope,
  FormForgeRevisionSummary
} from '../types'

export interface UseFormForgeManagementOptions {
  endpoint?: string
  scope?: FormForgeScope
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export interface UseFormForgeManagementMutationInputOptions {
  idempotencyKey?: string
  endpoint?: string
  scope?: FormForgeScope
}

type UseFormForgeManagementMutationOptions = string | UseFormForgeManagementMutationInputOptions | undefined

function isFormForgeClientError(value: unknown): value is FormForgeClientError {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as FormForgeClientError
  return typeof candidate.status === 'number' && typeof candidate.code === 'string' && typeof candidate.message === 'string'
}

export function useFormForgeManagement(options: UseFormForgeManagementOptions = {}) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const clientError = ref<FormForgeClientError | null>(null)
  const forms = ref<FormForgeManagementForm[]>([])
  const lastListIncludeDeleted = ref<boolean>(false)
  const lastListEndpoint = ref<string | undefined>(options.endpoint)
  const lastListScope = ref<FormForgeScope | undefined>(options.scope)
  const fieldErrors = computed<Record<string, string[]>>(() => clientError.value?.fieldErrors ?? {})
  const businessErrorCode = computed<FormForgeBusinessErrorCode | undefined>(() => clientError.value?.businessCode)
  const hasCategoryValidationError = computed<boolean>(() => {
    const errors = fieldErrors.value

    return errors.category !== undefined || errors.category_key !== undefined
  })

  async function withLoading<T>(callback: () => Promise<T>): Promise<T> {
    loading.value = true
    error.value = null
    clientError.value = null

    try {
      return await callback()
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Management request failed'

      if (isFormForgeClientError(caughtError)) {
        clientError.value = caughtError
      }

      throw caughtError
    } finally {
      loading.value = false
    }
  }

  function normalizeMutationOptions(options: UseFormForgeManagementMutationOptions): FormForgeMutationOptions {
    if (typeof options === 'string') {
      return {
        idempotencyKey: options,
        endpoint: undefined,
        scope: undefined
      }
    }

    return {
      idempotencyKey: options?.idempotencyKey,
      endpoint: options?.endpoint ?? undefined,
      scope: options?.scope ?? undefined
    }
  }

  function resolveRequestEndpoint(endpoint: string | undefined): string | undefined {
    return endpoint ?? options.endpoint
  }

  function resolveRequestScope(scope: FormForgeScope | undefined): FormForgeScope | undefined {
    return scope ?? options.scope
  }

  async function createForm(input: FormForgeManagementCreateInput, options?: UseFormForgeManagementMutationOptions): Promise<FormForgeManagementForm> {
    const mutationOptions = normalizeMutationOptions(options)
    mutationOptions.endpoint = resolveRequestEndpoint(mutationOptions.endpoint)
    mutationOptions.scope = resolveRequestScope(mutationOptions.scope)
    return withLoading(() => client.createForm(input, mutationOptions))
  }

  async function listForms(
    includeDeleted: boolean = false,
    options: FormForgeManagementRequestOptions = {}
  ): Promise<FormForgeManagementForm[]> {
    return withLoading(async () => {
      const endpoint = resolveRequestEndpoint(options.endpoint)
      const scope = resolveRequestScope(options.scope)
      const response = await client.listForms(includeDeleted, {
        endpoint,
        scope
      })
      forms.value = response
      lastListIncludeDeleted.value = includeDeleted
      lastListEndpoint.value = endpoint
      lastListScope.value = scope
      return response
    })
  }

  async function refreshForms(): Promise<FormForgeManagementForm[]> {
    return listForms(lastListIncludeDeleted.value, {
      endpoint: lastListEndpoint.value,
      scope: lastListScope.value
    })
  }

  async function patchForm(
    key: string,
    input: FormForgeManagementPatchInput,
    options?: UseFormForgeManagementMutationOptions
  ): Promise<FormForgeManagementForm> {
    const mutationOptions = normalizeMutationOptions(options)
    mutationOptions.endpoint = resolveRequestEndpoint(mutationOptions.endpoint)
    mutationOptions.scope = resolveRequestScope(mutationOptions.scope)
    return withLoading(() => client.patchForm(key, input, mutationOptions))
  }

  async function publishForm(key: string, options?: UseFormForgeManagementMutationOptions): Promise<FormForgeManagementForm> {
    const mutationOptions = normalizeMutationOptions(options)
    mutationOptions.endpoint = resolveRequestEndpoint(mutationOptions.endpoint)
    mutationOptions.scope = resolveRequestScope(mutationOptions.scope)
    return withLoading(() => client.publishForm(key, mutationOptions))
  }

  async function unpublishForm(key: string, options?: UseFormForgeManagementMutationOptions): Promise<FormForgeManagementForm> {
    const mutationOptions = normalizeMutationOptions(options)
    mutationOptions.endpoint = resolveRequestEndpoint(mutationOptions.endpoint)
    mutationOptions.scope = resolveRequestScope(mutationOptions.scope)
    return withLoading(() => client.unpublishForm(key, mutationOptions))
  }

  async function deleteForm(key: string, options?: UseFormForgeManagementMutationOptions): Promise<FormForgeManagementForm> {
    const mutationOptions = normalizeMutationOptions(options)
    mutationOptions.endpoint = resolveRequestEndpoint(mutationOptions.endpoint)
    mutationOptions.scope = resolveRequestScope(mutationOptions.scope)
    return withLoading(() => client.deleteForm(key, mutationOptions))
  }

  async function getRevisions(
    key: string,
    includeDeleted: boolean = false,
    options: FormForgeManagementRequestOptions = {}
  ): Promise<FormForgeRevisionSummary[]> {
    return withLoading(() => client.getRevisions(key, includeDeleted, {
      endpoint: resolveRequestEndpoint(options.endpoint),
      scope: resolveRequestScope(options.scope)
    }))
  }

  async function getDiff(
    key: string,
    fromVersion: number,
    toVersion: number,
    options: FormForgeManagementRequestOptions = {}
  ): Promise<FormForgeDiffResponse> {
    return withLoading(() => client.getDiff(key, fromVersion, toVersion, {
      endpoint: resolveRequestEndpoint(options.endpoint),
      scope: resolveRequestScope(options.scope)
    }))
  }

  return {
    client,
    loading,
    error,
    clientError,
    fieldErrors,
    businessErrorCode,
    hasCategoryValidationError,
    forms,
    lastListIncludeDeleted,
    lastListEndpoint,
    lastListScope,
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
