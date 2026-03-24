import { ref } from '#imports'
import { buildManagedFormData, type FormForgeManagedPayload } from '../utils/form-data'
import { toFormForgeJsonSubmissionPayload } from '../utils/submission'
import { createFormForgeZodSchema, validateFormForgePayload } from '../validation/zod'
import { useFormForgeClient } from './useFormForgeClient'
import type {
  FormForgeClient,
  FormForgeClientConfig,
  FormForgeClientError,
  FormForgeFieldSchema,
  FormForgeFormSchema,
  FormForgeJsonObject,
  FormForgeStagedUploadValue,
  FormForgeSubmissionPayload,
  FormForgeSubmissionResponse,
  FormForgeUploadMode
} from '../types'

export interface UseFormForgeSubmitOptions {
  key: string
  schema: () => FormForgeFormSchema | null
  state: () => FormForgeSubmissionPayload
  version?: string
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
  validateLocal?: boolean
}

export interface FormForgeSubmitOptions {
  mode?: FormForgeUploadMode
  version?: string
  meta?: FormForgeJsonObject
  test?: boolean
  validateLocal?: boolean
}

const RESERVED_SUBMISSION_FIELD_NAMES: string[] = [
  'submitted_by_id',
  'submitted_by_type',
  'type',
  'updated_at',
  'ip_address'
]

function isReservedSubmissionFieldName(fieldName: string): boolean {
  return RESERVED_SUBMISSION_FIELD_NAMES.includes(fieldName)
}

function isFileValue(value: FormForgeSubmissionPayload[string]): value is File {
  if (typeof File === 'undefined') {
    return false
  }

  return value instanceof File
}

function isStagedUploadToken(value: FormForgeSubmissionPayload[string]): value is FormForgeStagedUploadValue {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return false
  }

  const uploadToken = (value as { upload_token?: string }).upload_token
  return typeof uploadToken === 'string'
}

function isFormForgeClientError(error: object): error is FormForgeClientError {
  const maybeError = error as FormForgeClientError

  return typeof maybeError.status === 'number' && typeof maybeError.code === 'string' && typeof maybeError.message === 'string'
}

async function stageSingleFile(
  client: FormForgeClient,
  formKey: string,
  field: FormForgeFieldSchema,
  file: File,
  version: string | undefined
): Promise<FormForgeStagedUploadValue> {
  const staged = await client.stageUpload(
    formKey,
    {
      field: field.name,
      field_key: field.field_key,
      file
    },
    {
      version
    }
  )

  return {
    upload_token: staged.data.staged.upload_token
  }
}

async function stageFieldFiles(
  client: FormForgeClient,
  formKey: string,
  field: FormForgeFieldSchema,
  value: FormForgeSubmissionPayload[string],
  version: string | undefined
): Promise<FormForgeSubmissionPayload[string]> {
  if (value === null || isStagedUploadToken(value)) {
    return value
  }

  if (isFileValue(value)) {
    return stageSingleFile(client, formKey, field, value, version)
  }

  if (Array.isArray(value)) {
    const stagedValues: FormForgeStagedUploadValue[] = []

    for (const item of value) {
      if (isFileValue(item)) {
        const stagedItem = await stageSingleFile(client, formKey, field, item, version)
        stagedValues.push(stagedItem)
      }

      if (isStagedUploadToken(item)) {
        stagedValues.push(item)
      }
    }

    return stagedValues
  }

  return value
}

function filterSubmittableFields(schema: FormForgeFormSchema): FormForgeFieldSchema[] {
  return schema.fields.filter((field) => !isReservedSubmissionFieldName(field.name))
}

function buildSubmissionPayload(fields: FormForgeFieldSchema[], state: FormForgeSubmissionPayload): FormForgeSubmissionPayload {
  const payload: FormForgeSubmissionPayload = {}

  for (const field of fields) {
    if (state[field.name] !== undefined) {
      payload[field.name] = state[field.name]
    }
  }

  return payload
}

export function useFormForgeSubmit(options: UseFormForgeSubmitOptions) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const submitting = ref<boolean>(false)
  const fieldErrors = ref<Record<string, string[]>>({})
  const error = ref<FormForgeClientError | null>(null)
  const response = ref<FormForgeSubmissionResponse | null>(null)

  async function submit(submitOptions: FormForgeSubmitOptions = {}): Promise<FormForgeSubmissionResponse> {
    const schema = options.schema()
    if (schema === null) {
      throw new Error('Schema is not loaded')
    }

    const submittableFields = filterSubmittableFields(schema)
    const submittableSchema: FormForgeFormSchema = {
      ...schema,
      fields: submittableFields
    }

    const mode: FormForgeUploadMode = submitOptions.mode ?? options.clientConfig?.uploadMode ?? 'staged'
    const version: string | undefined = submitOptions.version ?? options.version
    const payload = buildSubmissionPayload(submittableFields, options.state())

    fieldErrors.value = {}
    error.value = null
    submitting.value = true

    try {
      const shouldValidateLocal = submitOptions.validateLocal ?? options.validateLocal ?? true

      if (shouldValidateLocal) {
        const localSchema = createFormForgeZodSchema(submittableSchema)
        const localErrors = validateFormForgePayload(localSchema, payload)
        if (Object.keys(localErrors).length > 0) {
          fieldErrors.value = localErrors
          throw {
            status: 422,
            code: 'validation',
            message: 'Validation failed',
            fieldErrors: localErrors
          } as FormForgeClientError
        }
      }

      if (mode === 'managed') {
        const formData = buildManagedFormData(payload as FormForgeManagedPayload, submitOptions.meta)
        const managedResponse = await client.submitFormMultipart(options.key, formData, {
          version,
          test: submitOptions.test
        })
        response.value = managedResponse
        return managedResponse
      }

      const jsonPayload: FormForgeSubmissionPayload = {
        ...payload
      }

      if (mode === 'staged') {
        for (const field of submittableFields) {
          if (field.type !== 'file') {
            continue
          }

          const currentValue = jsonPayload[field.name]
          jsonPayload[field.name] = await stageFieldFiles(client, options.key, field, currentValue, version)
        }
      }

      const submitResponse = await client.submitForm(
        options.key,
        {
          payload: toFormForgeJsonSubmissionPayload(jsonPayload),
          meta: submitOptions.meta,
          test: submitOptions.test
        },
        {
          version
        }
      )

      response.value = submitResponse
      return submitResponse
    } catch (caughtError) {
      if (typeof caughtError === 'object' && caughtError !== null && isFormForgeClientError(caughtError)) {
        error.value = caughtError
        fieldErrors.value = caughtError.fieldErrors ?? {}
      } else {
        error.value = {
          status: 0,
          code: 'network_error',
          message: caughtError instanceof Error ? caughtError.message : 'Submission failed'
        }
      }

      throw error.value
    } finally {
      submitting.value = false
    }
  }

  return {
    client,
    submitting,
    fieldErrors,
    error,
    response,
    submit
  }
}
