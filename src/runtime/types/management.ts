import type { FormForgeCondition, FormForgeDraftSettings, FormForgeFieldSchema, FormForgeFormSchema, FormForgePageSchema } from './schema'
import type { FormForgeClient } from '../api/client'
import type { FormForgeClientConfig, FormForgeScope } from './api'
import type { FormForgeJsonObject } from './json'
import type { FormForgeCategory } from './category'

export interface FormForgeSettingsModel {
  title: string
  category: string | null
  publish_at: string | null
  pause_at: string | null
  response_limit: number | null
  submission_code_required: boolean
  submission_code: string
  has_submission_code: boolean
  public_url: string | null
  drafts: FormForgeDraftSettings
  api: FormForgeJsonObject
}

export interface FormForgeSettingsOptions {
  formUuid?: string
  formKey?: string
  endpoint?: string
  scope?: FormForgeScope
  locale?: string
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export interface FormForgeSettingsExpose {
  save: () => Promise<void>
  reload: () => Promise<void>
}

export interface FormForgeManagementCreateInput {
  title: string
  schema_version?: number
  publish_at?: string | null
  pause_at?: string | null
  response_limit?: number | null
  submission_code?: string | null
  submission_code_required?: boolean
  fields?: FormForgeFieldSchema[]
  pages?: FormForgePageSchema[]
  conditions?: FormForgeCondition[]
  drafts?: FormForgeDraftSettings
  category?: string | null
  meta?: FormForgeJsonObject
  api?: FormForgeJsonObject
  auto_publish?: boolean
  autoPublish?: boolean
}

export interface FormForgeManagementPatchInput {
  title?: string
  schema_version?: number
  publish_at?: string | null
  pause_at?: string | null
  response_limit?: number | null
  submission_code?: string | null
  submission_code_required?: boolean
  fields?: FormForgeFieldSchema[]
  pages?: FormForgePageSchema[]
  conditions?: FormForgeCondition[]
  drafts?: FormForgeDraftSettings
  category?: string | null
  meta?: FormForgeJsonObject
  api?: FormForgeJsonObject
  auto_publish?: boolean
  autoPublish?: boolean
}

export interface FormForgeManagementForm {
  id?: string | number
  uuid?: string
  form_uuid?: string
  form_key?: string
  key?: string
  title?: string
  category?: string | null
  public_url?: string | null
  has_submission_code?: boolean
  schema?: FormForgeFormSchema
  meta?: FormForgeJsonObject
  is_published?: boolean
  deleted_at?: string | null
  category_item?: FormForgeCategory | null
}

export interface FormForgeRevisionSummary {
  revision_id: string
  version_number: number
  is_published: boolean
  created_at?: string
  deleted_at?: string | null
}

export interface FormForgeDiffResponse {
  from_version: number
  to_version: number
  changes: FormForgeJsonObject[]
}
