import type {
  FormForgeClientError,
  FormForgeClientErrorCode,
  FormForgeJsonObject,
  FormForgeJsonValue,
  FormForgeValidationErrorPayload
} from '../types'
import { isFormForgeJsonObject } from '../utils/object'

function mapStatusToCode(status: number): FormForgeClientErrorCode {
  if (status === 401) {
    return 'unauthorized'
  }

  if (status === 403) {
    return 'forbidden'
  }

  if (status === 404) {
    return 'not_found'
  }

  if (status === 409) {
    return 'conflict'
  }

  if (status === 422) {
    return 'validation'
  }

  if (status === 429) {
    return 'rate_limited'
  }

  if (status >= 500) {
    return 'server_error'
  }

  return 'network_error'
}

function extractValidationErrors(payload: FormForgeJsonObject | null): Record<string, string[]> | undefined {
  if (payload === null) {
    return undefined
  }

  const rawErrors: FormForgeJsonValue | undefined = payload.errors

  if (!isFormForgeJsonObject(rawErrors)) {
    return undefined
  }

  const fieldErrors: Record<string, string[]> = {}

  for (const [fieldName, fieldValue] of Object.entries(rawErrors)) {
    if (!Array.isArray(fieldValue)) {
      continue
    }

    const messages: string[] = []

    for (const item of fieldValue) {
      if (typeof item === 'string') {
        messages.push(item)
      }
    }

    if (messages.length > 0) {
      fieldErrors[fieldName] = messages
    }
  }

  if (Object.keys(fieldErrors).length === 0) {
    return undefined
  }

  return fieldErrors
}

function extractMessage(payload: FormForgeJsonObject | null): string {
  if (payload === null) {
    return 'Network error'
  }

  const messageValue: FormForgeJsonValue | undefined = payload.message

  if (typeof messageValue === 'string' && messageValue.length > 0) {
    return messageValue
  }

  return 'Request failed'
}

function collectPayloadMessages(payload: FormForgeJsonObject | null): string[] {
  if (payload === null) {
    return []
  }

  const messages: string[] = []
  const messageValue: FormForgeJsonValue | undefined = payload.message

  if (typeof messageValue === 'string' && messageValue.trim() !== '') {
    messages.push(messageValue.trim())
  }

  const validationErrors = extractValidationErrors(payload)
  if (validationErrors !== undefined) {
    for (const [fieldName, fieldMessages] of Object.entries(validationErrors)) {
      messages.push(fieldName)
      for (const fieldMessage of fieldMessages) {
        if (fieldMessage.trim() !== '') {
          messages.push(fieldMessage.trim())
        }
      }
    }
  }

  return messages
}

function hasCategoryInUseConflict(status: number, payload: FormForgeJsonObject | null): boolean {
  if (status !== 409) {
    return false
  }

  const flattened = collectPayloadMessages(payload)
    .map((message) => message.toLowerCase())
    .join(' ')

  if (flattened === '') {
    return false
  }

  const mentionsCategory = flattened.includes('category') || flattened.includes('catégorie')
  const mentionsInUse =
    flattened.includes('in use')
    || flattened.includes('linked')
    || flattened.includes('attach')
    || flattened.includes('used')
    || flattened.includes('utilis')
    || flattened.includes('liée')

  return mentionsCategory && mentionsInUse
}

export function normalizeFormForgeClientError(status: number, payload: FormForgeJsonObject | null): FormForgeClientError {
  return {
    status,
    code: mapStatusToCode(status),
    message: extractMessage(payload),
    businessCode: hasCategoryInUseConflict(status, payload) ? 'CATEGORY_IN_USE' : undefined,
    fieldErrors: extractValidationErrors(payload),
    raw: payload
  }
}

export function normalizeNetworkFormForgeError(message: string): FormForgeClientError {
  return {
    status: 0,
    code: 'network_error',
    message,
    raw: null
  }
}

export function parseFormForgeValidationPayload(payload: FormForgeJsonObject | null): FormForgeValidationErrorPayload {
  if (payload === null) {
    return {}
  }

  const response: FormForgeValidationErrorPayload = {}

  const messageValue: FormForgeJsonValue | undefined = payload.message
  if (typeof messageValue === 'string') {
    response.message = messageValue
  }

  const errors: Record<string, string[]> | undefined = extractValidationErrors(payload)
  if (errors !== undefined) {
    response.errors = errors
  }

  return response
}
