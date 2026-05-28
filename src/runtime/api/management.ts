import type {
  FormForgeDiffResponse,
  FormForgeHttpAdapter,
  FormForgeJsonObject,
  FormForgeJsonValue,
  FormForgeManagementCreateInput,
  FormForgeManagementForm,
  FormForgeManagementPatchInput,
  FormForgeRevisionSummary
} from '../types'
import { isFormForgeJsonObject, pickFormForgeDataEnvelope } from '../utils/object'
import { normalizeFormForgeCategory } from '../utils/category'
import { resolveEndpointPath, type FormForgeRequestOptions } from './request'

export interface FormForgeMutationOptions extends FormForgeRequestOptions {
  idempotencyKey?: string
}

export type FormForgeManagementFilterValue = string | number | boolean | undefined
export type FormForgeManagementFilters = Record<string, FormForgeManagementFilterValue>

export interface FormForgeManagementRequestOptions extends FormForgeRequestOptions {
  filters?: FormForgeManagementFilters
}

function normalizeManagementForm(value: unknown): FormForgeManagementForm | null {
  if (!isFormForgeJsonObject(value as FormForgeJsonValue | null | undefined)) {
    return null
  }

  const rawValue = value as FormForgeJsonObject

  const category = typeof rawValue.category === 'string' || rawValue.category === null
    ? rawValue.category
    : undefined

  const rawCategoryItem = rawValue.category_item
  const categoryItem = rawCategoryItem === null
    ? null
    : normalizeFormForgeCategory(rawCategoryItem)

  const normalized: FormForgeManagementForm = {
    ...rawValue
  }

  if (category !== undefined) {
    normalized.category = category
  }

  if (rawCategoryItem === null || categoryItem !== null) {
    normalized.category_item = categoryItem
  }

  return normalized
}

function asManagementFormArray(value: unknown): FormForgeManagementForm[] {
  if (!Array.isArray(value)) {
    return []
  }

  const items: FormForgeManagementForm[] = []

  for (const item of value) {
    const normalized = normalizeManagementForm(item)
    if (normalized !== null) {
      items.push(normalized)
    }
  }

  return items
}

function normalizeFormsList(payload: FormForgeJsonObject): FormForgeManagementForm[] {
  const dataValue = payload.data

  if (Array.isArray(dataValue)) {
    return asManagementFormArray(dataValue)
  }

  if (!isFormForgeJsonObject(dataValue)) {
    return asManagementFormArray(payload.items ?? payload.forms)
  }

  const nestedData = dataValue.data
  if (Array.isArray(nestedData)) {
    return asManagementFormArray(nestedData)
  }

  return asManagementFormArray(dataValue.items ?? dataValue.forms)
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

function shouldAutoPublish(input: FormForgeManagementCreateInput | FormForgeManagementPatchInput): boolean {
  return input.auto_publish === true || input.autoPublish === true
}

function toManagementMutationPayload(input: FormForgeManagementCreateInput | FormForgeManagementPatchInput): FormForgeJsonObject {
  const payload = toJsonObject(input)

  if ('autoPublish' in payload) {
    delete payload.autoPublish
  }

  if (shouldAutoPublish(input)) {
    payload.auto_publish = true
  }

  return payload
}

export async function createFormForgeForm(
  http: FormForgeHttpAdapter,
  input: FormForgeManagementCreateInput,
  options: FormForgeMutationOptions = {}
): Promise<FormForgeManagementForm> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, '/forms', {}, options.scope),
    method: 'POST',
    headers: withMutationHeaders(options),
    json: toManagementMutationPayload(input)
  })

  return normalizeManagementForm(pickFormForgeDataEnvelope(response.data)) ?? {}
}

export async function fetchFormForgeForms(
  http: FormForgeHttpAdapter,
  includeDeleted: boolean = false,
  options: FormForgeManagementRequestOptions = {}
): Promise<FormForgeManagementForm[]> {
  const filters: FormForgeManagementFilters = options.filters ?? {}

  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, '/forms', {}, options.scope),
    method: 'GET',
    query: {
      ...filters,
      include_deleted: includeDeleted ? 1 : 0
    }
  })

  return normalizeFormsList(response.data)
}

export async function fetchFormForgeFormRoute(
  http: FormForgeHttpAdapter,
  routeKey: string,
  options: FormForgeManagementRequestOptions = {}
): Promise<FormForgeManagementForm[]> {
  const filters: FormForgeManagementFilters = options.filters ?? {}
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/form-routes/${routeKey}`, { routeKey }, options.scope),
    method: 'GET',
    query: filters
  })

  return normalizeFormsList(response.data)
}

export async function patchFormForgeForm(
  http: FormForgeHttpAdapter,
  key: string,
  input: FormForgeManagementPatchInput,
  options: FormForgeMutationOptions = {}
): Promise<FormForgeManagementForm> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}`, {
      key
    }, options.scope),
    method: 'PATCH',
    headers: withMutationHeaders(options),
    json: toManagementMutationPayload(input)
  })

  return normalizeManagementForm(pickFormForgeDataEnvelope(response.data)) ?? {}
}

export async function publishFormForgeForm(
  http: FormForgeHttpAdapter,
  key: string,
  options: FormForgeMutationOptions = {}
): Promise<FormForgeManagementForm> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}/publish`, {
      key
    }, options.scope),
    method: 'POST',
    headers: withMutationHeaders(options)
  })

  return normalizeManagementForm(pickFormForgeDataEnvelope(response.data)) ?? {}
}

export async function unpublishFormForgeForm(
  http: FormForgeHttpAdapter,
  key: string,
  options: FormForgeMutationOptions = {}
): Promise<FormForgeManagementForm> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}/unpublish`, {
      key
    }, options.scope),
    method: 'POST',
    headers: withMutationHeaders(options)
  })

  return normalizeManagementForm(pickFormForgeDataEnvelope(response.data)) ?? {}
}

export async function deleteFormForgeForm(
  http: FormForgeHttpAdapter,
  key: string,
  options: FormForgeMutationOptions = {}
): Promise<FormForgeManagementForm> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}`, {
      key
    }, options.scope),
    method: 'DELETE',
    headers: withMutationHeaders(options)
  })

  return normalizeManagementForm(pickFormForgeDataEnvelope(response.data)) ?? {}
}

export async function fetchFormForgeRevisions(
  http: FormForgeHttpAdapter,
  key: string,
  includeDeleted: boolean = false,
  options: FormForgeManagementRequestOptions = {}
): Promise<FormForgeRevisionSummary[]> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}/revisions`, {
      key
    }, options.scope),
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
  toVersion: number,
  options: FormForgeManagementRequestOptions = {}
): Promise<FormForgeDiffResponse> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}/diff/${fromVersion}/${toVersion}`, {
      key,
      fromVersion,
      toVersion
    }, options.scope),
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
