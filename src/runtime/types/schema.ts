import type { FormForgeJsonObject, FormForgeJsonValue } from './json'
import type { FormForgeCategory } from './category'

export type FormForgeFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'select'
  | 'select_menu'
  | 'radio'
  | 'checkbox'
  | 'checkbox_group'
  | 'switch'
  | 'date'
  | 'time'
  | 'datetime'
  | 'date_range'
  | 'datetime_range'
  | 'file'

export type FormForgeOptionValue = string | number | boolean | null

export interface FormForgeFieldOptionObject {
  label?: string
  value: FormForgeOptionValue
  description?: string
  disabled?: boolean
  [key: string]: FormForgeJsonValue | undefined
}

export type FormForgeFieldOption = FormForgeOptionValue | FormForgeFieldOptionObject

export interface FormForgeFieldStorage {
  disk: string
  directory: string
  visibility: 'public' | 'private' | string
}

export interface FormForgeFieldSchemaBase<TType extends FormForgeFieldType> {
  field_key: string
  type: TType
  name: string
  page_key: string
  label?: string
  required: boolean
  nullable: boolean
  default: FormForgeJsonValue
  rules: string[]
  meta: FormForgeJsonObject
  placeholder?: string
  help_text?: string
  min?: number | string | null
  max?: number | string | null
  step?: number | string | null
  multiple?: boolean
  disabled?: boolean
  readonly?: boolean
  options?: FormForgeFieldOption[]
}

export type FormForgeTextLikeFieldSchema = FormForgeFieldSchemaBase<'text' | 'textarea' | 'email'>

export type FormForgeNumberFieldSchema = FormForgeFieldSchemaBase<'number'>

export type FormForgeSelectLikeFieldSchema = FormForgeFieldSchemaBase<'select' | 'select_menu' | 'radio' | 'checkbox_group'>

export type FormForgeBooleanFieldSchema = FormForgeFieldSchemaBase<'checkbox' | 'switch'>

export type FormForgeDateLikeFieldSchema = FormForgeFieldSchemaBase<'date' | 'time' | 'datetime' | 'date_range' | 'datetime_range'>

export interface FormForgeFileFieldSchema extends FormForgeFieldSchemaBase<'file'> {
  accept?: string[]
  max_size?: number | null
  max_files?: number | null
  storage?: FormForgeFieldStorage | null
}

export type FormForgeFieldSchema =
  | FormForgeTextLikeFieldSchema
  | FormForgeNumberFieldSchema
  | FormForgeSelectLikeFieldSchema
  | FormForgeBooleanFieldSchema
  | FormForgeDateLikeFieldSchema
  | FormForgeFileFieldSchema

export interface FormForgePageSchema {
  page_key: string
  title: string
  description?: string | null
  meta: FormForgeJsonObject
  fields: FormForgeFieldSchema[]
}

export type FormForgeConditionTargetType = 'page' | 'field'

export type FormForgeConditionAction = 'show' | 'hide' | 'skip' | 'require' | 'disable'

export type FormForgeConditionMatch = 'all' | 'any'

export type FormForgeConditionOperator =
  | 'eq'
  | 'neq'
  | 'in'
  | 'not_in'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'not_empty'

export interface FormForgeConditionClause {
  field_key: string
  operator: FormForgeConditionOperator
  value: FormForgeJsonValue
}

export interface FormForgeCondition {
  condition_key: string
  target_type: FormForgeConditionTargetType
  target_key: string
  action: FormForgeConditionAction
  match: FormForgeConditionMatch
  when: FormForgeConditionClause[]
}

export interface FormForgeDraftSettings {
  enabled: boolean
  [key: string]: FormForgeJsonValue | undefined
}

export interface FormForgeFormSchema {
  key: string
  version: string
  title: string
  category?: string | null
  category_item?: FormForgeCategory | null
  is_published: boolean
  fields: FormForgeFieldSchema[]
  pages: FormForgePageSchema[]
  conditions: FormForgeCondition[]
  drafts: FormForgeDraftSettings
  api: FormForgeJsonObject
  meta?: FormForgeJsonObject
}
