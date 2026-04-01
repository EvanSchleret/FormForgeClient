import type { FormForgeJsonObject } from './json'

export type FormForgeClientErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'rate_limited'
  | 'server_error'
  | 'network_error'

export type FormForgeBusinessErrorCode = 'CATEGORY_IN_USE'

export interface FormForgeClientError {
  status: number
  code: FormForgeClientErrorCode
  message: string
  businessCode?: FormForgeBusinessErrorCode
  fieldErrors?: Record<string, string[]>
  raw?: FormForgeJsonObject | null
}

export interface FormForgeValidationErrorPayload {
  message?: string
  errors?: Record<string, string[]>
}
