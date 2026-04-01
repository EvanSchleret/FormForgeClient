import type {
  FormForgeJsonSubmissionObject,
  FormForgeJsonSubmissionPayload,
  FormForgeJsonSubmissionValue,
  FormForgeSubmissionPayload,
  FormForgeSubmissionValue
} from '../types'

function isFileValue(value: FormForgeSubmissionValue): value is File {
  if (typeof File === 'undefined') {
    return false
  }

  return value instanceof File
}

export function toFormForgeJsonSubmissionValue(
  value: FormForgeSubmissionValue | undefined
): FormForgeJsonSubmissionValue | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (isFileValue(value)) {
    return undefined
  }

  if (Array.isArray(value)) {
    const arrayValue: FormForgeJsonSubmissionValue[] = []

    for (const item of value) {
      const normalizedItem = toFormForgeJsonSubmissionValue(item as FormForgeSubmissionValue)
      if (normalizedItem !== undefined) {
        arrayValue.push(normalizedItem)
      }
    }

    return arrayValue
  }

  const objectValue: FormForgeJsonSubmissionObject = {}

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedNestedValue = toFormForgeJsonSubmissionValue(nestedValue as FormForgeSubmissionValue)
    if (normalizedNestedValue !== undefined) {
      objectValue[key] = normalizedNestedValue
    }
  }

  return objectValue
}

export function toFormForgeJsonSubmissionPayload(payload: FormForgeSubmissionPayload): FormForgeJsonSubmissionPayload {
  const normalizedPayload: FormForgeJsonSubmissionPayload = {}

  for (const [key, value] of Object.entries(payload)) {
    const normalizedValue = toFormForgeJsonSubmissionValue(value)

    if (normalizedValue !== undefined) {
      normalizedPayload[key] = normalizedValue
    }
  }

  return normalizedPayload
}
