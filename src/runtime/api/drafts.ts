import type {
  FormForgeDraftRecord,
  FormForgeDraftResponse,
  FormForgeDraftSaveInput,
  FormForgeHttpAdapter,
  FormForgeJsonObject,
  FormForgeJsonSubmissionPayload,
  FormForgeJsonValue
} from '../types'
import { isFormForgeJsonObject } from '../utils/object'
import { resolveEndpointPath, type FormForgeRequestOptions } from './request'

function pickNullableDataEnvelope(payload: FormForgeJsonObject): FormForgeJsonObject | null {
  const dataValue: FormForgeJsonValue | undefined = payload.data

  if (dataValue === null) {
    return null
  }

  if (isFormForgeJsonObject(dataValue)) {
    return dataValue
  }

  return payload
}

function toDraftRecord(value: FormForgeJsonObject | null): FormForgeDraftRecord | null {
  if (value === null) {
    return null
  }

  const payloadValue = value.payload
  const payload: FormForgeJsonSubmissionPayload = isFormForgeJsonObject(payloadValue)
    ? payloadValue as FormForgeJsonSubmissionPayload
    : {}

  const metaValue = value.meta
  const meta = isFormForgeJsonObject(metaValue) ? metaValue : undefined

  const ownerIdValue = value.owner_id
  const ownerId = typeof ownerIdValue === 'string' || typeof ownerIdValue === 'number' || ownerIdValue === null
    ? ownerIdValue
    : undefined

  return {
    form_key: typeof value.form_key === 'string' ? value.form_key : '',
    form_version: typeof value.form_version === 'string' ? value.form_version : undefined,
    owner_type: typeof value.owner_type === 'string' ? value.owner_type : undefined,
    owner_id: ownerId,
    payload,
    meta,
    expires_at: typeof value.expires_at === 'string' || value.expires_at === null ? value.expires_at : undefined,
    created_at: typeof value.created_at === 'string' ? value.created_at : undefined,
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : undefined
  }
}

export async function saveFormForgeDraft(
  http: FormForgeHttpAdapter,
  key: string,
  input: FormForgeDraftSaveInput,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeDraftResponse> {
  const body: FormForgeJsonObject = {
    payload: JSON.parse(JSON.stringify(input.payload)) as FormForgeJsonObject
  }

  if (input.meta !== undefined) {
    body.meta = input.meta
  }

  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}/drafts`, {
      key
    }, options.scope),
    method: 'POST',
    json: body
  })

  return {
    data: toDraftRecord(pickNullableDataEnvelope(response.data)),
    meta: isFormForgeJsonObject(response.data.meta) ? response.data.meta : undefined
  }
}

export async function fetchCurrentFormForgeDraft(
  http: FormForgeHttpAdapter,
  key: string,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeDraftResponse> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}/drafts/current`, {
      key
    }, options.scope),
    method: 'GET'
  })

  return {
    data: toDraftRecord(pickNullableDataEnvelope(response.data)),
    meta: isFormForgeJsonObject(response.data.meta) ? response.data.meta : undefined
  }
}

export async function deleteCurrentFormForgeDraft(
  http: FormForgeHttpAdapter,
  key: string,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeDraftResponse> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}/drafts/current`, {
      key
    }, options.scope),
    method: 'DELETE'
  })

  return {
    data: toDraftRecord(pickNullableDataEnvelope(response.data)),
    meta: isFormForgeJsonObject(response.data.meta) ? response.data.meta : undefined
  }
}
