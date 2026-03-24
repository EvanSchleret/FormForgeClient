import type {
  FormForgeBeforeRequestContext,
  FormForgeClientConfig,
  FormForgeHttpAdapter,
  FormForgeHttpRequest,
  FormForgeHttpResponse,
  FormForgeJsonObject,
  FormForgeJsonValue
} from '../types'
import { normalizeFormForgeClientError, normalizeNetworkFormForgeError } from '../validation/errors'
import { isFormForgeJsonObject } from '../utils/object'

function normalizeBaseUrl(baseURL: string | undefined): string {
  if (baseURL === undefined || baseURL === '') {
    return '/api/formforge/v1'
  }

  if (baseURL.endsWith('/')) {
    return baseURL.slice(0, -1)
  }

  return baseURL
}

function normalizePath(path: string): string {
  if (path.startsWith('/')) {
    return path
  }

  return `/${path}`
}

function appendQuery(path: string, query: Record<string, string | number | boolean | undefined> | undefined): string {
  if (query === undefined) {
    return path
  }

  const queryParams: URLSearchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue
    }

    queryParams.set(key, String(value))
  }

  const rawQuery: string = queryParams.toString()
  if (rawQuery.length === 0) {
    return path
  }

  return `${path}?${rawQuery}`
}

function toJsonPayload(text: string): FormForgeJsonValue | null {
  if (text.length === 0) {
    return null
  }

  try {
    return JSON.parse(text) as FormForgeJsonValue
  } catch {
    return null
  }
}

async function parseResponsePayload(response: Response): Promise<FormForgeJsonObject | null> {
  if (response.status === 204) {
    return null
  }

  const text: string = await response.text()
  const jsonPayload: FormForgeJsonValue | null = toJsonPayload(text)

  if (isFormForgeJsonObject(jsonPayload)) {
    return jsonPayload
  }

  if (text.length > 0) {
    return {
      message: text
    }
  }

  return null
}

async function runBeforeRequest(
  callback: FormForgeClientConfig['beforeRequest'],
  request: FormForgeHttpRequest,
  headers: Record<string, string>
): Promise<void> {
  if (callback === undefined) {
    return
  }

  const context: FormForgeBeforeRequestContext = {
    request,
    headers
  }

  await callback(context)
}

export function createFormForgeHttpAdapter(config: FormForgeClientConfig = {}): FormForgeHttpAdapter {
  const baseURL: string = normalizeBaseUrl(config.baseURL)
  const fetchImpl: typeof fetch = config.fetch ?? fetch
  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(config.headers ?? {})
  }
  const credentials: RequestCredentials = config.credentials ?? 'include'

  return async function formForgeHttpAdapter<TData>(request: FormForgeHttpRequest): Promise<FormForgeHttpResponse<TData>> {
    const endpointPath: string = normalizePath(request.path)
    const targetPath: string = appendQuery(`${baseURL}${endpointPath}`, request.query)

    const headers: Record<string, string> = {
      ...defaultHeaders,
      ...(request.headers ?? {})
    }

    let body: BodyInit | undefined = request.body

    if (request.json !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(request.json)
    }

    await runBeforeRequest(config.beforeRequest, request, headers)

    let response: Response

    try {
      response = await fetchImpl(targetPath, {
        method: request.method,
        headers,
        credentials,
        body
      })
    } catch {
      throw normalizeNetworkFormForgeError('Network request failed')
    }

    const payload: FormForgeJsonObject | null = await parseResponsePayload(response)

    if (!response.ok) {
      throw normalizeFormForgeClientError(response.status, payload)
    }

    const data: TData = (payload ?? {}) as TData

    return {
      status: response.status,
      headers: response.headers,
      data
    }
  }
}
