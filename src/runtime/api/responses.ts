import type { FormForgeHttpAdapter, FormForgeJsonObject, FormForgeResponsesListResponse } from '../types'
import { isFormForgeJsonObject, pickFormForgeDataEnvelope } from '../utils/object'
import { resolveEndpointPath, type FormForgeRequestOptions } from './request'

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

function normalizeResponsesList(payload: FormForgeJsonObject): FormForgeJsonObject[] {
  const dataValue = payload.data

  if (Array.isArray(dataValue)) {
    return asJsonObjectArray(dataValue)
  }

  if (!isFormForgeJsonObject(dataValue)) {
    return asJsonObjectArray(payload.items ?? payload.responses ?? payload.submissions)
  }

  const nestedData = dataValue.data
  if (Array.isArray(nestedData)) {
    return asJsonObjectArray(nestedData)
  }

  return asJsonObjectArray(dataValue.items ?? dataValue.responses ?? dataValue.submissions)
}

export async function fetchFormForgeResponses(
  http: FormForgeHttpAdapter,
  key: string,
  query: Record<string, string | number | boolean | undefined> = {},
  options: FormForgeRequestOptions = {}
): Promise<FormForgeResponsesListResponse> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}/responses`, {
      key
    }, options.scope),
    method: 'GET',
    query
  })

  return {
    data: normalizeResponsesList(response.data),
    meta: isFormForgeJsonObject(response.data.meta) ? response.data.meta : undefined
  }
}

export async function fetchFormForgeResponse(
  http: FormForgeHttpAdapter,
  key: string,
  submissionId: string,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeJsonObject> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}/responses/${submissionId}`, {
      key,
      submissionId
    }, options.scope),
    method: 'GET'
  })

  return pickFormForgeDataEnvelope(response.data)
}

export async function deleteFormForgeResponse(
  http: FormForgeHttpAdapter,
  key: string,
  submissionId: string,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeJsonObject> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}/responses/${submissionId}`, {
      key,
      submissionId
    }, options.scope),
    method: 'DELETE'
  })

  return pickFormForgeDataEnvelope(response.data)
}
