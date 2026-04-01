import type { FormForgeJsonObject } from './json'

export type FormForgeUploadMode = 'managed' | 'direct' | 'staged'

export type FormForgeDatetimeMode = 'offset' | 'utc'

export interface FormForgeResolvedScope {
  prefix: string
  params: Record<string, string | number>
}

export interface FormForgeScopedRouteDefinition {
  prefix: string
  paramsFromRoute: Record<string, string>
}

export type FormForgeScopedRouteMap = Record<string, FormForgeScopedRouteDefinition>

export type FormForgeScope = string | FormForgeResolvedScope

export type FormForgeScopeParams = Record<string, string | number | undefined>

export type FormForgeScopeParamsInput =
  | FormForgeScopeParams
  | (() => FormForgeScopeParams)

export interface FormForgeRangeValue {
  start: string | null
  end: string | null
}

export interface FormForgeStagedUploadValue {
  upload_token: string
}

export interface FormForgeDirectUploadValue {
  disk: string
  path: string
  original_name?: string
}

export type FormForgeSubmissionScalarValue = string | number | boolean | null

export interface FormForgeJsonSubmissionObject {
  [key: string]: FormForgeJsonSubmissionValue
}

export type FormForgeJsonSubmissionValue =
  | FormForgeSubmissionScalarValue
  | FormForgeRangeValue
  | FormForgeStagedUploadValue
  | FormForgeDirectUploadValue
  | FormForgeJsonSubmissionObject
  | FormForgeJsonSubmissionValue[]

export type FormForgeSubmissionValue =
  | FormForgeJsonSubmissionValue
  | File
  | File[]

export interface FormForgeSubmissionPayload {
  [key: string]: FormForgeSubmissionValue
}

export interface FormForgeJsonSubmissionPayload {
  [key: string]: FormForgeJsonSubmissionValue
}

export interface FormForgeSubmitInput {
  payload: FormForgeJsonSubmissionPayload
  meta?: FormForgeJsonObject
  test?: boolean
}

export interface FormForgeSubmissionResponse {
  data: FormForgeJsonObject
  meta?: FormForgeJsonObject
}

export interface FormForgeResponsesListResponse {
  data: FormForgeJsonObject[]
  meta?: FormForgeJsonObject
}

export interface FormForgeSchemaVersionsResponse {
  data: FormForgeJsonObject
  meta?: FormForgeJsonObject
}

export interface FormForgeStageUploadInput {
  field?: string
  field_key?: string
  file: File
}

export interface FormForgeStagedUploadResponse {
  data: {
    staged: {
      upload_token: string
      expires_at?: string
    }
  }
  meta?: FormForgeJsonObject
}

export interface FormForgeResolveInput {
  payload?: FormForgeJsonSubmissionPayload
  debug?: boolean
}

export interface FormForgeDraftSaveInput {
  payload: FormForgeJsonSubmissionPayload
  meta?: FormForgeJsonObject
}

export interface FormForgeDraftRecord {
  form_key: string
  form_version?: string
  owner_type?: string
  owner_id?: string | number | null
  payload: FormForgeJsonSubmissionPayload
  meta?: FormForgeJsonObject
  expires_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface FormForgeDraftResponse {
  data: FormForgeDraftRecord | null
  meta?: FormForgeJsonObject
}

export interface FormForgeHttpRequest {
  path: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined>
  json?: FormForgeJsonObject
  body?: BodyInit
}

export interface FormForgeHttpResponse<TData> {
  status: number
  headers: Headers
  data: TData
}

export type FormForgeHttpAdapter = <TData>(request: FormForgeHttpRequest) => Promise<FormForgeHttpResponse<TData>>

export interface FormForgeBeforeRequestContext {
  request: FormForgeHttpRequest
  headers: Record<string, string>
  url?: string
}

export type FormForgeBaseURLParams = Record<string, string | number | undefined>

export type FormForgeBaseURLParamsInput =
  | FormForgeBaseURLParams
  | (() => FormForgeBaseURLParams)

export interface FormForgeClientConfig {
  baseURL?: string
  baseURLParams?: FormForgeBaseURLParamsInput
  scopedRoutes?: FormForgeScopedRouteMap
  defaultScope?: string
  scopeParams?: FormForgeScopeParamsInput
  credentials?: RequestCredentials
  headers?: Record<string, string>
  fetch?: typeof fetch
  beforeRequest?: (context: FormForgeBeforeRequestContext) => Promise<void> | void
  uploadMode?: FormForgeUploadMode
  datetimeMode?: FormForgeDatetimeMode
  locale?: string
}
