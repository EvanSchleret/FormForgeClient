import { ref } from '#imports'
import { createFormForgeZodSchema } from '../validation/zod'
import { useFormForgeClient } from './useFormForgeClient'
import type { FormForgeClient, FormForgeClientConfig, FormForgeFormSchema, FormForgeSubmissionPayload } from '../types'

export interface UseFormForgeFormOptions {
  key: string
  version?: string
  immediate?: boolean
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

function clonePayload(payload: FormForgeSubmissionPayload): FormForgeSubmissionPayload {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(payload)
    } catch {}
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

  async function fetchSchema(): Promise<FormForgeFormSchema> {
    loading.value = true
    lastError.value = null

    try {
      const nextSchema = options.version !== undefined && options.version !== ''
        ? await client.getFormVersion(options.key, options.version)
        : await client.getForm(options.key)

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
