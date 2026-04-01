import { ref } from '#imports'
import { createFormForgeZodSchema } from '../validation/zod'
import { useFormForgeClient } from './useFormForgeClient'
import type { FormForgeClient, FormForgeClientConfig, FormForgeFormSchema, FormForgeScope, FormForgeSubmissionPayload } from '../types'
import type { FormForgeRequestOptions } from '../api/request'

export interface UseFormForgeFormOptions {
  key: string
  version?: string
  endpoint?: string
  scope?: FormForgeScope
  immediate?: boolean
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export type FormForgeFormRequestOptions = FormForgeRequestOptions

function clonePayload(payload: FormForgeSubmissionPayload): FormForgeSubmissionPayload {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(payload)
    } catch {
      return {
        ...payload
      }
    }
  }

  return {
    ...payload
  }
}

function createInitialPayload(schema: FormForgeFormSchema): FormForgeSubmissionPayload {
  const payload: FormForgeSubmissionPayload = {}

  for (const field of schema.fields) {
    if (field.default !== undefined) {
      payload[field.name] = field.default as FormForgeSubmissionPayload[string]
      continue
    }

    if (field.type === 'checkbox' || field.type === 'switch') {
      payload[field.name] = false
      continue
    }

    if (field.type === 'checkbox_group') {
      payload[field.name] = []
      continue
    }

    if (field.type === 'date_range' || field.type === 'datetime_range') {
      payload[field.name] = {
        start: null,
        end: null
      }
      continue
    }

    payload[field.name] = null
  }

  return payload
}

export function useFormForgeForm(options: UseFormForgeFormOptions) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const schema = ref<FormForgeFormSchema | null>(null)
  const state = ref<FormForgeSubmissionPayload>({})
  const initialState = ref<FormForgeSubmissionPayload>({})
  const loading = ref<boolean>(false)
  const initialized = ref<boolean>(false)
  const lastError = ref<string | null>(null)

  const zodSchema = ref<object | undefined>(undefined)

  function resolveEndpoint(requestOptions: FormForgeFormRequestOptions = {}): string | undefined {
    return requestOptions.endpoint ?? options.endpoint
  }

  function resolveScope(requestOptions: FormForgeFormRequestOptions = {}): FormForgeScope | undefined {
    return requestOptions.scope ?? options.scope
  }

  async function fetchSchema(requestOptions: FormForgeFormRequestOptions = {}): Promise<FormForgeFormSchema> {
    loading.value = true
    lastError.value = null

    try {
      const endpoint = resolveEndpoint(requestOptions)
      const scope = resolveScope(requestOptions)
      const nextSchema = options.version !== undefined && options.version !== ''
        ? await client.getFormVersion(options.key, options.version, { endpoint, scope })
        : await client.getForm(options.key, { endpoint, scope })

      const nextState = createInitialPayload(nextSchema)

      schema.value = nextSchema
      initialState.value = nextState
      state.value = clonePayload(nextState)
      zodSchema.value = createFormForgeZodSchema(nextSchema) as object
      initialized.value = true

      return nextSchema
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Failed to load form schema'
      throw error
    } finally {
      loading.value = false
    }
  }

  function resetState(): void {
    if (schema.value === null) {
      state.value = {}
      initialState.value = {}
      return
    }

    state.value = clonePayload(initialState.value)
  }

  function setFieldValue(fieldName: string, value: FormForgeSubmissionPayload[string]): void {
    state.value = {
      ...state.value,
      [fieldName]: value
    }
  }

  function replaceState(payload: FormForgeSubmissionPayload): void {
    state.value = clonePayload(payload)
  }

  if (options.immediate !== false) {
    fetchSchema().catch(() => {})
  }

  return {
    client,
    schema,
    state,
    loading,
    initialized,
    error: lastError,
    zodSchema,
    fetchSchema,
    resetState,
    setFieldValue,
    replaceState
  }
}
