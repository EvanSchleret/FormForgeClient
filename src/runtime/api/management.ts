import type {
  FormForgeDiffResponse,
  FormForgeHttpAdapter,
  FormForgeJsonObject,
  FormForgeManagementCreateInput,
  FormForgeManagementPatchInput,
  FormForgeRevisionSummary
} from '../types'
import { isFormForgeJsonObject, pickFormForgeDataEnvelope } from '../utils/object'

export interface FormForgeMutationOptions {
  idempotencyKey?: string
}

function asJsonObjectArray(value: unknown): FormForgeJsonObject[] {
  if (!Array.isArray(value)) {
    return []
  }

  const items: FormForgeJsonObject[] = []

  for (const item of value) {
    if (isFormForgeJsonObject(item)) {
      items.push(item)
    }
  }

  return items
}

function normalizeFormsList(payload: FormForgeJsonObject): FormForgeJsonObject[] {
  const dataValue = payload.data

  if (Array.isArray(dataValue)) {
    return asJsonObjectArray(dataValue)
  }

  if (!isFormForgeJsonObject(dataValue)) {
    return asJsonObjectArray(payload.items ?? payload.forms)
  }

  const nestedData = dataValue.data
  if (Array.isArray(nestedData)) {
    return asJsonObjectArray(nestedData)
  }

  return asJsonObjectArray(dataValue.items ?? dataValue.forms)
}

function withMutationHeaders(options: FormForgeMutationOptions = {}): Record<string, string> {
  if (options.idempotencyKey === undefined || options.idempotencyKey === '') {
    return {}
  }

  return {
    'Idempotency-Key': options.idempotencyKey
  }
}

function toJsonObject(input: FormForgeManagementCreateInput | FormForgeManagementPatchInput): FormForgeJsonObject {
  return JSON.parse(JSON.stringify(input)) as FormForgeJsonObject
}

export async function createFormForgeForm(
  http: FormForgeHttpAdapter,
  input: FormForgeManagementCreateInput,
  options: FormForgeMutationOptions = {}
): Promise<FormForgeJsonObject> {
  const response = await http<FormForgeJsonObject>({
    path: '/forms',
    method: 'POST',
    headers: withMutationHeaders(options),
    json: toJsonObject(input)
  })

  return pickFormForgeDataEnvelope(response.data)
}

export async function fetchFormForgeForms(
  http: FormForgeHttpAdapter,
  includeDeleted: boolean = false
): Promise<FormForgeJsonObject[]> {
  const response = await http<FormForgeJsonObject>({
    path: '/forms',
    method: 'GET',
    query: {
      include_deleted: includeDeleted ? 1 : 0
    }
  })

  return normalizeFormsList(response.data)
}

export async function patchFormForgeForm(
  http: FormForgeHttpAdapter,
  key: string,
  input: FormForgeManagementPatchInput,
  options: FormForgeMutationOptions = {}
): Promise<FormForgeJsonObject> {
  const response = await http<FormForgeJsonObject>({
    path: `/forms/${key}`,
    method: 'PATCH',
    headers: withMutationHeaders(options),
    json: toJsonObject(input)
  })

  return pickFormForgeDataEnvelope(response.data)
}

export async function publishFormForgeForm(
  http: FormForgeHttpAdapter,
  key: string,
  options: FormForgeMutationOptions = {}
): Promise<FormForgeJsonObject> {
  const response = await http<FormForgeJsonObject>({
    path: `/forms/${key}/publish`,
    method: 'POST',
    headers: withMutationHeaders(options)
  })

  return pickFormForgeDataEnvelope(response.data)
}

export async function unpublishFormForgeForm(
  http: FormForgeHttpAdapter,
  key: string,
  options: FormForgeMutationOptions = {}
): Promise<FormForgeJsonObject> {
  const response = await http<FormForgeJsonObject>({
    path: `/forms/${key}/unpublish`,
    method: 'POST',
    headers: withMutationHeaders(options)
  })

  return pickFormForgeDataEnvelope(response.data)
}

export async function deleteFormForgeForm(
  http: FormForgeHttpAdapter,
  key: string,
  options: FormForgeMutationOptions = {}
): Promise<FormForgeJsonObject> {
  const response = await http<FormForgeJsonObject>({
    path: `/forms/${key}`,
    method: 'DELETE',
    headers: withMutationHeaders(options)
  })

  return pickFormForgeDataEnvelope(response.data)
}

export async function fetchFormForgeRevisions(
  http: FormForgeHttpAdapter,
  key: string,
  includeDeleted: boolean = false
): Promise<FormForgeRevisionSummary[]> {
  const response = await http<FormForgeJsonObject>({
    path: `/forms/${key}/revisions`,
    method: 'GET',
    query: {
      include_deleted: includeDeleted ? 1 : 0
    }
  })

  const dataEnvelope: FormForgeJsonObject = pickFormForgeDataEnvelope(response.data)
  const revisionsValue = dataEnvelope.revisions ?? dataEnvelope.data ?? dataEnvelope.items

  if (!Array.isArray(revisionsValue)) {
    return []
  }

  const revisions: FormForgeRevisionSummary[] = []

  for (const item of revisionsValue) {
    if (!isFormForgeJsonObject(item)) {
      continue
    }

    const revisionId: string = typeof item.revision_id === 'string' ? item.revision_id : ''
    const versionNumber: number = typeof item.version_number === 'number' ? item.version_number : 0
    const isPublished: boolean = typeof item.is_published === 'boolean' ? item.is_published : false

    revisions.push({
      revision_id: revisionId,
      version_number: versionNumber,
      is_published: isPublished,
      created_at: typeof item.created_at === 'string' ? item.created_at : undefined,
      deleted_at: typeof item.deleted_at === 'string' || item.deleted_at === null ? item.deleted_at : undefined
    })
  }

  return revisions
}

export async function fetchFormForgeDiff(
  http: FormForgeHttpAdapter,
  key: string,
  fromVersion: number,
  toVersion: number
): Promise<FormForgeDiffResponse> {
  const response = await http<FormForgeJsonObject>({
    path: `/forms/${key}/diff/${fromVersion}/${toVersion}`,
    method: 'GET'
  })

  const dataEnvelope: FormForgeJsonObject = pickFormForgeDataEnvelope(response.data)
  const changesValue = dataEnvelope.changes

  const changes: FormForgeJsonObject[] = []
  if (Array.isArray(changesValue)) {
    for (const item of changesValue) {
      if (isFormForgeJsonObject(item)) {
        changes.push(item)
      }
    }
  }

  return {
    from_version: typeof dataEnvelope.from_version === 'number' ? dataEnvelope.from_version : fromVersion,
    to_version: typeof dataEnvelope.to_version === 'number' ? dataEnvelope.to_version : toVersion,
    changes
  }
}
