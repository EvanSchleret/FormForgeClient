import type {
  FormForgeCategory,
  FormForgeCategoryCreateInput,
  FormForgeCategoryListQuery,
  FormForgeCategoryListResponse,
  FormForgeCategoryUpdateInput,
  FormForgeHttpAdapter,
  FormForgeJsonObject
} from '../types'
import type { FormForgeMutationOptions } from './management'
import { normalizeFormForgeCategory, normalizeFormForgeCategoryListResponse } from '../utils/category'
import { pickFormForgeDataEnvelope } from '../utils/object'
import { resolveEndpointPath, type FormForgeRequestOptions } from './request'

function withMutationHeaders(options: FormForgeMutationOptions = {}): Record<string, string> {
  if (options.idempotencyKey === undefined || options.idempotencyKey === '') {
    return {}
  }

  return {
    'Idempotency-Key': options.idempotencyKey
  }
}

function toJsonObject(input: FormForgeCategoryCreateInput | FormForgeCategoryUpdateInput): FormForgeJsonObject {
  return JSON.parse(JSON.stringify(input)) as FormForgeJsonObject
}

function normalizeSingleCategory(payload: FormForgeJsonObject): FormForgeCategory {
  const dataEnvelope = pickFormForgeDataEnvelope(payload)
  const normalized = normalizeFormForgeCategory(dataEnvelope)

  if (normalized !== null) {
    return normalized
  }

  return {
    id: 0,
    key: '',
    name: '',
    description: null,
    is_active: false,
    meta: {},
    created_at: null,
    updated_at: null
  }
}

export async function fetchFormForgeCategories(
  http: FormForgeHttpAdapter,
  query: FormForgeCategoryListQuery = {},
  options: FormForgeRequestOptions = {}
): Promise<FormForgeCategoryListResponse> {
  const resolvedQuery: Record<string, string | number | boolean | undefined> = {
    per_page: query.per_page,
    search: query.search,
    is_active: query.is_active === undefined ? undefined : (query.is_active ? 1 : 0)
  }

  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, '/categories', {}, options.scope),
    method: 'GET',
    query: resolvedQuery
  })

  return normalizeFormForgeCategoryListResponse(response.data)
}

export async function fetchFormForgeCategory(
  http: FormForgeHttpAdapter,
  categoryKey: string,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeCategory> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/categories/${categoryKey}`, {
      categoryKey
    }, options.scope),
    method: 'GET'
  })

  return normalizeSingleCategory(response.data)
}

export async function createFormForgeCategory(
  http: FormForgeHttpAdapter,
  input: FormForgeCategoryCreateInput,
  options: FormForgeMutationOptions = {}
): Promise<FormForgeCategory> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, '/categories', {}, options.scope),
    method: 'POST',
    headers: withMutationHeaders(options),
    json: toJsonObject(input)
  })

  return normalizeSingleCategory(response.data)
}

export async function patchFormForgeCategory(
  http: FormForgeHttpAdapter,
  categoryKey: string,
  input: FormForgeCategoryUpdateInput,
  options: FormForgeMutationOptions = {}
): Promise<FormForgeCategory> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/categories/${categoryKey}`, {
      categoryKey
    }, options.scope),
    method: 'PATCH',
    headers: withMutationHeaders(options),
    json: toJsonObject(input)
  })

  return normalizeSingleCategory(response.data)
}

export async function deleteFormForgeCategory(
  http: FormForgeHttpAdapter,
  categoryKey: string,
  options: FormForgeMutationOptions = {}
): Promise<FormForgeCategory> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/categories/${categoryKey}`, {
      categoryKey
    }, options.scope),
    method: 'DELETE',
    headers: withMutationHeaders(options)
  })

  return normalizeSingleCategory(response.data)
}
