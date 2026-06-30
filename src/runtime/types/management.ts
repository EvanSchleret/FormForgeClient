import type { FormForgeCondition, FormForgeDraftSettings, FormForgeFieldSchema, FormForgePageSchema } from './schema'
import type { FormForgeJsonObject } from './json'
import type { FormForgeCategory } from './category'

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

export type FormForgeManagementForm = FormForgeJsonObject & {
  id?: string | number
  uuid?: string
  key?: string
  title?: string
  category?: string | null
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
