import type { FormForgeHttpAdapter, FormForgeJsonObject, FormForgeSubmitInput, FormForgeSubmissionResponse } from '../types'
import { buildJsonSubmitBody } from '../utils/form-data'
import { pickFormForgeDataEnvelope } from '../utils/object'
import { resolveEndpointPath, type FormForgeRequestOptions } from './request'

interface FormForgeSubmitOptions extends FormForgeRequestOptions {
  version?: string
}

function buildSubmitPath(key: string, version: string | undefined): string {
  if (version !== undefined && version !== '') {
    return `/forms/${key}/versions/${version}/submit`
  }

  return `/forms/${key}/submit`
}

export async function submitFormForgeJson(
  http: FormForgeHttpAdapter,
  key: string,
  input: FormForgeSubmitInput,
  options: FormForgeSubmitOptions = {}
): Promise<FormForgeSubmissionResponse> {
  const headers: Record<string, string> = {}

  if (input.test === true) {
    headers['X-FormForge-Test'] = 'true'
  }

  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, buildSubmitPath(key, options.version), {
      key,
      version: options.version ?? ''
    }, options.scope),
    method: 'POST',
    headers,
    json: buildJsonSubmitBody(input.payload, input.meta)
  })

  return {
    data: pickFormForgeDataEnvelope(response.data),
    meta: response.data.meta as FormForgeJsonObject | undefined
  }
}

export async function submitFormForgeMultipart(
  http: FormForgeHttpAdapter,
  key: string,
  formData: FormData,
  options: FormForgeSubmitOptions & { test?: boolean } = {}
): Promise<FormForgeSubmissionResponse> {
  const headers: Record<string, string> = {}

  if (options.test === true) {
    headers['X-FormForge-Test'] = 'true'
  }

  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, buildSubmitPath(key, options.version), {
      key,
      version: options.version ?? ''
    }, options.scope),
    method: 'POST',
    headers,
    body: formData
  })

  return {
    data: pickFormForgeDataEnvelope(response.data),
    meta: response.data.meta as FormForgeJsonObject | undefined
  }
}
