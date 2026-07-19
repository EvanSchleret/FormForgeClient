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
  | 'consent'
  | 'checkbox_group'
  | 'switch'
  | 'temporal'
  | 'date'
  | 'time'
  | 'file'
  | 'address'

export type FormForgeTemporalMode = 'date' | 'time'
export type FormForgeTemporalHourCycle = 12 | 24

export type FormForgeAddressFieldKey =
  | 'line1'
  | 'line2'
  | 'city'
  | 'state'
  | 'zip'
  | 'country'

export interface FormForgeAddressFieldSchema {
  key: FormForgeAddressFieldKey
  label: string
  visible: boolean
  required: boolean
}

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
  display?: 'list' | 'menu'
  temporal_mode?: FormForgeTemporalMode
  hour_cycle?: FormForgeTemporalHourCycle
  consent_label?: string
  address_fields?: FormForgeAddressFieldSchema[]
}

export type FormForgeTextLikeFieldSchema = FormForgeFieldSchemaBase<'text' | 'textarea' | 'email'>

export type FormForgeNumberFieldSchema = FormForgeFieldSchemaBase<'number'>

export type FormForgeSelectLikeFieldSchema = FormForgeFieldSchemaBase<'select' | 'select_menu' | 'radio' | 'checkbox_group'>

export type FormForgeBooleanFieldSchema = FormForgeFieldSchemaBase<'checkbox' | 'consent' | 'switch'>

export type FormForgeDateLikeFieldSchema = FormForgeFieldSchemaBase<'date' | 'time'>

export type FormForgeTemporalFieldSchema = FormForgeFieldSchemaBase<'temporal'>

export type FormForgeAddressFieldSchemaValue = FormForgeFieldSchemaBase<'address'>

export interface FormForgeFileFieldSchema extends FormForgeFieldSchemaBase<'file'> {
  accept?: string[]
  max_size?: number | null
  max_files?: number | null
  max_total_size?: number | null
  storage?: FormForgeFieldStorage | null
}

export type FormForgeFieldSchema =
  | FormForgeTextLikeFieldSchema
  | FormForgeNumberFieldSchema
  | FormForgeSelectLikeFieldSchema
  | FormForgeBooleanFieldSchema
  | FormForgeTemporalFieldSchema
  | FormForgeDateLikeFieldSchema
  | FormForgeAddressFieldSchemaValue
  | FormForgeFileFieldSchema

export type FormForgeFieldValidationMatch = 'all' | 'any'

export type FormForgeFieldValidationOperator =
  | 'min'
  | 'max'
  | 'after'
  | 'before'
  | 'between'
  | 'not_between'
  | 'regex'
  | 'eq'
  | 'neq'
  | 'contains'
  | 'not_contains'

export interface FormForgeTemporalValidationRangeValue {
  start: string | null
  end: string | null
}

export interface FormForgeFieldValidationRule {
  validation_key: string
  target?: string | null
  operator: FormForgeFieldValidationOperator
  value: string | number | null | FormForgeTemporalValidationRangeValue
  unit?: 'characters' | null
}

export interface FormForgeFieldValidationConfig {
  match: FormForgeFieldValidationMatch
  rules: FormForgeFieldValidationRule[]
}

export interface FormForgePageSchema {
  page_key: string
  title: string
  description?: string | null
  meta: FormForgeJsonObject
  fields: FormForgeFieldSchema[]
}

export type FormForgePageLogicMatch = 'all' | 'any'

export type FormForgePageLogicOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'not_starts_with'
  | 'ends_with'
  | 'not_ends_with'
  | 'is_submitted'
  | 'is_not_submitted'
  | 'accepted'
  | 'ignored'

export type FormForgePageLogicThenAction = 'require' | 'goto_block'

export type FormForgePageLogicFallbackAction = 'next' | 'goto_block'

export interface FormForgePageLogicClause {
  field_key: string
  operator: FormForgePageLogicOperator
  value: FormForgeJsonValue
}

export interface FormForgePageLogicThen {
  action: FormForgePageLogicThenAction
  field_key?: string | null
  block_index?: number | null
}

export interface FormForgePageLogicFallback {
  action: FormForgePageLogicFallbackAction
  block_index?: number | null
}

export interface FormForgePageLogicRule {
  rule_key: string
  match: FormForgePageLogicMatch
  when: FormForgePageLogicClause[]
  then: FormForgePageLogicThen[]
  fallback: FormForgePageLogicFallback
}

export interface FormForgePageLogic {
  version?: number
  rules: FormForgePageLogicRule[]
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
  schema_version: number
  title: string
  publish_at?: string | null
  pause_at?: string | null
  response_limit?: number | null
  submission_code_required?: boolean
  category?: string | null
  category_item?: FormForgeCategory | null
  is_published: boolean
  public_url?: string | null
  fields: FormForgeFieldSchema[]
  pages: FormForgePageSchema[]
  conditions: FormForgeCondition[]
  drafts: FormForgeDraftSettings
  api: FormForgeJsonObject
  meta?: FormForgeJsonObject
}
