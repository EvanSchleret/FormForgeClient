import type { FormForgeCondition, FormForgeDraftSettings, FormForgeFieldSchema, FormForgePageSchema } from './schema'
import type { FormForgeJsonObject } from './json'

export interface FormForgeManagementCreateInput {
  title: string
  fields?: FormForgeFieldSchema[]
  pages?: FormForgePageSchema[]
  conditions?: FormForgeCondition[]
  drafts?: FormForgeDraftSettings
  category?: string | null
  meta?: FormForgeJsonObject
  api?: FormForgeJsonObject
}

export interface FormForgeManagementPatchInput {
  title?: string
  fields?: FormForgeFieldSchema[]
  pages?: FormForgePageSchema[]
  conditions?: FormForgeCondition[]
  drafts?: FormForgeDraftSettings
  category?: string | null
  meta?: FormForgeJsonObject
  api?: FormForgeJsonObject
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
