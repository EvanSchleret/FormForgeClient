import type {
  FormForgeFormSchema,
  FormForgeHttpAdapter,
  FormForgeJsonObject,
  FormForgeResolveInput,
  FormForgeSchemaVersionsResponse
} from '../types'
import { isFormForgeJsonObject, pickFormForgeDataEnvelope } from '../utils/object'
import { normalizeFormForgeSchema } from '../utils/schema'
import { resolveEndpointPath, type FormForgeRequestOptions } from './request'

export async function fetchFormForgeSchema(
  http: FormForgeHttpAdapter,
  key: string,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeFormSchema> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}`, {
      key
    }, options.scope),
    method: 'GET'
  })

  return normalizeFormForgeSchema(response.data)
}

export async function fetchFormForgeSchemaVersions(
  http: FormForgeHttpAdapter,
  key: string,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeSchemaVersionsResponse> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}/versions`, {
      key
    }, options.scope),
    method: 'GET'
  })

  return {
    data: pickFormForgeDataEnvelope(response.data),
    meta: response.data.meta as FormForgeJsonObject | undefined
  }
}

export async function fetchFormForgeSchemaVersion(
  http: FormForgeHttpAdapter,
  key: string,
  version: string,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeFormSchema> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}/versions/${version}`, {
      key,
      version
    }, options.scope),
    method: 'GET'
  })

  return normalizeFormForgeSchema(response.data)
}

export async function resolveFormForgeSchema(
  http: FormForgeHttpAdapter,
  key: string,
  input: FormForgeResolveInput = {},
  version?: string,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeFormSchema> {
  const fallbackPath = version !== undefined && version !== ''
    ? `/forms/${key}/versions/${version}/resolve`
    : `/forms/${key}/resolve`
  const path = resolveEndpointPath(options.endpoint, fallbackPath, {
    key,
    version: version ?? ''
  }, options.scope)

  const body: FormForgeJsonObject = {
    payload: JSON.parse(JSON.stringify(input.payload ?? {})) as FormForgeJsonObject,
    debug: input.debug === true
  }

  const response = await http<FormForgeJsonObject>({
    path,
    method: 'POST',
    json: body
  })

  const data = pickFormForgeDataEnvelope(response.data)
  const schemaValue = data.schema

  if (isFormForgeJsonObject(schemaValue)) {
    return normalizeFormForgeSchema(schemaValue)
  }

  return normalizeFormForgeSchema(data)
}
