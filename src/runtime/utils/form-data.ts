import type { FormForgeJsonObject, FormForgeJsonSubmissionPayload, FormForgeSubmissionValue } from '../types'

export type FormForgeManagedValue = FormForgeSubmissionValue | File | File[]

export interface FormForgeManagedPayload {
  [key: string]: FormForgeManagedValue
}

function isFileValue(value: FormForgeManagedValue): value is File {
  if (typeof File === 'undefined') {
    return false
  }

  return value instanceof File
}

function appendJsonValue(formData: FormData, key: string, value: FormForgeSubmissionValue): void {
  if (value === undefined) {
    return
  }

  if (value === null) {
    formData.append(key, '')
    return
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    formData.append(key, String(value))
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item: FormForgeSubmissionValue, index: number): void => {
      appendJsonValue(formData, `${key}[${index}]`, item)
    })
    return
  }

  for (const [childKey, childValue] of Object.entries(value)) {
    appendJsonValue(formData, `${key}[${childKey}]`, childValue)
  }
}

export function buildManagedFormData(payload: FormForgeManagedPayload, meta?: FormForgeJsonObject): FormData {
  const formData: FormData = new FormData()

  for (const [fieldName, fieldValue] of Object.entries(payload)) {
    if (fieldValue === undefined) {
      continue
    }

    if (isFileValue(fieldValue)) {
      formData.append(fieldName, fieldValue)
      continue
    }

    if (Array.isArray(fieldValue) && fieldValue.every((item: FormForgeManagedValue): boolean => isFileValue(item))) {
      for (const file of fieldValue) {
        if (isFileValue(file)) {
          formData.append(fieldName, file)
        }
      }

      continue
    }

    appendJsonValue(formData, `payload[${fieldName}]`, fieldValue as FormForgeSubmissionValue)
  }

  if (meta !== undefined) {
    for (const [metaKey, metaValue] of Object.entries(meta)) {
      appendJsonValue(formData, `meta[${metaKey}]`, metaValue as FormForgeSubmissionValue)
    }
  }

  return formData
}

export function buildJsonSubmitBody(payload: FormForgeJsonSubmissionPayload, meta?: FormForgeJsonObject): FormForgeJsonObject {
  const body: FormForgeJsonObject = {
    payload: payload as FormForgeJsonObject
  }

  if (meta !== undefined) {
    body.meta = meta
  }

  return body
}
