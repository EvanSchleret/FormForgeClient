import type { FormForgeJsonObject, FormForgeJsonValue } from '../types'

export function isFormForgeJsonObject(value: FormForgeJsonValue | null | undefined): value is FormForgeJsonObject {
  if (value === null) {
    return false
  }

  return !Array.isArray(value) && typeof value === 'object'
}

export function getFormForgeString(value: FormForgeJsonValue | undefined): string | undefined {
  if (typeof value === 'string') {
    return value
  }

  return undefined
}

export function getFormForgeNumber(value: FormForgeJsonValue | undefined): number | undefined {
  if (typeof value === 'number') {
    return value
  }

  return undefined
}

export function getFormForgeBoolean(value: FormForgeJsonValue | undefined): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }

  return undefined
}

export function getFormForgeStringArray(value: FormForgeJsonValue | undefined): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const items: string[] = []

  for (const item of value) {
    if (typeof item === 'string') {
      items.push(item)
    }
  }

  return items
}

export function pickFormForgeDataEnvelope(payload: FormForgeJsonObject): FormForgeJsonObject {
  const value: FormForgeJsonValue | undefined = payload.data

  if (isFormForgeJsonObject(value)) {
    return value
  }

  return payload
}
