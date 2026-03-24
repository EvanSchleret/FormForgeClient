import type {
  FormForgeFormSchema,
  FormForgeHttpAdapter,
  FormForgeJsonObject,
  FormForgeResolveInput,
  FormForgeSchemaVersionsResponse
} from '../types'
import { isFormForgeJsonObject, pickFormForgeDataEnvelope } from '../utils/object'
import { normalizeFormForgeSchema } from '../utils/schema'

export async function fetchFormForgeSchema(http: FormForgeHttpAdapter, key: string): Promise<FormForgeFormSchema> {
  const response = await http<FormForgeJsonObject>({
    path: `/forms/${key}`,
    method: 'GET'
  })

  return normalizeFormForgeSchema(response.data)
}

export async function fetchFormForgeSchemaVersions(http: FormForgeHttpAdapter, key: string): Promise<FormForgeSchemaVersionsResponse> {
  const response = await http<FormForgeJsonObject>({
    path: `/forms/${key}/versions`,
    method: 'GET'
  })

  return {
    data: pickFormForgeDataEnvelope(response.data),
    meta: response.data.meta as FormForgeJsonObject | undefined
  }
}

export async function fetchFormForgeSchemaVersion(http: FormForgeHttpAdapter, key: string, version: string): Promise<FormForgeFormSchema> {
  const response = await http<FormForgeJsonObject>({
    path: `/forms/${key}/versions/${version}`,
    method: 'GET'
  })

  return normalizeFormForgeSchema(response.data)
}

export async function resolveFormForgeSchema(
  http: FormForgeHttpAdapter,
  key: string,
  input: FormForgeResolveInput = {},
  version?: string
): Promise<FormForgeFormSchema> {
  const path = version !== undefined && version !== ''
    ? `/forms/${key}/versions/${version}/resolve`
    : `/forms/${key}/resolve`

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
