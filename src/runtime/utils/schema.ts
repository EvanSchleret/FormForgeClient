import type {
  FormForgeAddressFieldSchema,
  FormForgeAddressFieldKey,
  FormForgeCondition,
  FormForgeConditionAction,
  FormForgeConditionClause,
  FormForgeConditionMatch,
  FormForgeConditionOperator,
  FormForgeConditionTargetType,
  FormForgeDraftSettings,
  FormForgeFieldOption,
  FormForgeFieldSchema,
  FormForgeFieldType,
  FormForgeFileFieldSchema,
  FormForgeFormSchema,
  FormForgeJsonObject,
  FormForgeJsonValue,
  FormForgePageSchema
} from '../types'
import { getFormForgeStringArray, isFormForgeJsonObject, pickFormForgeDataEnvelope } from './object'
import { normalizeFormForgeCategory } from './category'
import { createDefaultAddressFields, resolveDefaultFieldLabel } from './defaults'
import { isTemporalFieldType, isTemporalMode, temporalModeFromFieldType } from './temporal'

const FIELD_TYPES: FormForgeFieldType[] = [
  'text',
  'textarea',
  'email',
  'number',
  'select',
  'select_menu',
  'radio',
  'checkbox',
  'consent',
  'checkbox_group',
  'switch',
  'temporal',
  'date',
  'time',
  'file',
  'address'
]

const CONDITION_TARGET_TYPES: FormForgeConditionTargetType[] = ['page', 'field']

const CONDITION_ACTIONS: FormForgeConditionAction[] = ['show', 'hide', 'skip', 'require', 'disable']

const CONDITION_MATCHES: FormForgeConditionMatch[] = ['all', 'any']

const CONDITION_OPERATORS: FormForgeConditionOperator[] = [
  'eq',
  'neq',
  'in',
  'not_in',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'not_contains',
  'is_empty',
  'not_empty'
]

function isFieldType(value: string): value is FormForgeFieldType {
  return FIELD_TYPES.includes(value as FormForgeFieldType)
}

function isConditionTargetType(value: string): value is FormForgeConditionTargetType {
  return CONDITION_TARGET_TYPES.includes(value as FormForgeConditionTargetType)
}

function isConditionAction(value: string): value is FormForgeConditionAction {
  return CONDITION_ACTIONS.includes(value as FormForgeConditionAction)
}

function isConditionMatch(value: string): value is FormForgeConditionMatch {
  return CONDITION_MATCHES.includes(value as FormForgeConditionMatch)
}

function isConditionOperator(value: string): value is FormForgeConditionOperator {
  return CONDITION_OPERATORS.includes(value as FormForgeConditionOperator)
}

function toBoolean(value: FormForgeJsonValue | undefined, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  return fallback
}

function toString(value: FormForgeJsonValue | undefined, fallback: string): string {
  if (typeof value === 'string') {
    return value
  }

  return fallback
}

function toNumber(value: FormForgeJsonValue | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return fallback
}

function toNullableString(value: FormForgeJsonValue | undefined): string | null | undefined {
  if (typeof value === 'string' || value === null) {
    return value
  }

  return undefined
}

function toNumberOrStringOrNull(value: FormForgeJsonValue | undefined): number | string | null | undefined {
  if (typeof value === 'number' || typeof value === 'string' || value === null) {
    return value
  }

  return undefined
}

function toPositiveNumber(value: FormForgeJsonValue | undefined): number | undefined {
  const numericValue = toNumber(value, 0)

  return numericValue > 0 ? numericValue : undefined
}

function normalizeOption(option: FormForgeJsonValue): FormForgeFieldOption | null {
  if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean' || option === null) {
    return option
  }

  if (isFormForgeJsonObject(option)) {
    const value: FormForgeJsonValue | undefined = option.value

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      return {
        ...option,
        value
      }
    }
  }

  return null
}

function normalizeOptions(value: FormForgeJsonValue | undefined): FormForgeFieldOption[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const options: FormForgeFieldOption[] = []

  for (const option of value) {
    const normalizedOption: FormForgeFieldOption | null = normalizeOption(option)
    if (normalizedOption !== null) {
      options.push(normalizedOption)
    }
  }

  return options
}

function normalizeAddressFields(value: FormForgeJsonValue | undefined, locale?: string): FormForgeAddressFieldSchema[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const defaults: FormForgeAddressFieldSchema[] = createDefaultAddressFields(locale)

  const normalized: FormForgeAddressFieldSchema[] = []

  for (const [index, addressField] of value.entries()) {
    if (!isFormForgeJsonObject(addressField)) {
      continue
    }

    const hasLabel = Object.prototype.hasOwnProperty.call(addressField, 'label')
      && (typeof addressField.label === 'string' || addressField.label === null)
    const key = typeof addressField.key === 'string' && addressField.key.trim() !== ''
      ? addressField.key as FormForgeAddressFieldKey
      : (defaults[index]?.key ?? defaults[0].key)
    const label = hasLabel
      ? (typeof addressField.label === 'string' ? addressField.label.trim() : '')
      : (defaults[index]?.label ?? key)

    normalized.push({
      key,
      label,
      visible: addressField.visible !== false,
      required: addressField.required === true
    })
  }

  return normalized.length > 0 ? normalized : undefined
}

function normalizeField(
  field: FormForgeJsonObject,
  index: number,
  fallbackPageKey: string,
  locale?: string
): FormForgeFieldSchema {
  const rawType: string = toString(field.type, 'text')
  const fieldType: FormForgeFieldType = isTemporalFieldType(rawType)
    ? 'temporal'
    : isFieldType(rawType)
      ? rawType
      : 'text'
  const name: string = toString(field.name, `field_${index}`)
  const fieldKey: string = toString(field.field_key, `${name}_${index}`)
  const pageKey: string = toString(field.page_key, fallbackPageKey)

  const metaValue: FormForgeJsonValue | undefined = field.meta
  const meta: FormForgeJsonObject = isFormForgeJsonObject(metaValue) ? metaValue : {}

  const rulesValue: FormForgeJsonValue | undefined = field.rules
  const rules: string[] = getFormForgeStringArray(rulesValue) ?? []

  const normalizedField: FormForgeFieldSchema = {
    field_key: fieldKey,
    type: fieldType,
    name,
    page_key: pageKey,
    label: typeof field.label === 'string' ? field.label : undefined,
    required: toBoolean(field.required, false),
    nullable: toBoolean(field.nullable, false),
    default: field.default ?? null,
    rules,
    meta,
    placeholder: typeof field.placeholder === 'string' ? field.placeholder : undefined,
    help_text: typeof field.help_text === 'string' ? field.help_text : undefined,
    min: toNumberOrStringOrNull(field.min),
    max: toNumberOrStringOrNull(field.max),
    step: toNumberOrStringOrNull(field.step),
    multiple: toBoolean(field.multiple, false),
    disabled: toBoolean(field.disabled, false),
    readonly: toBoolean(field.readonly, false),
    options: normalizeOptions(field.options),
    address_fields: normalizeAddressFields(field.address_fields, locale),
    display: field.display === 'list' || field.display === 'menu' ? field.display : undefined,
    temporal_mode: fieldType === 'temporal'
      ? (isTemporalMode(field.temporal_mode) ? field.temporal_mode : temporalModeFromFieldType(rawType))
      : undefined,
    hour_cycle: fieldType === 'temporal' && (isTemporalMode(field.temporal_mode) ? field.temporal_mode : temporalModeFromFieldType(rawType)) === 'time'
      ? (field.hour_cycle === 12 ? 12 : 24)
      : undefined,
    consent_label: typeof field.consent_label === 'string' ? field.consent_label : undefined
  }

  if (normalizedField.type === 'temporal' && (typeof normalizedField.label !== 'string' || normalizedField.label.trim() === '')) {
    normalizedField.label = resolveDefaultFieldLabel('temporal', locale, normalizedField.temporal_mode)
  }

  if (fieldType === 'file') {
    const accept: string[] | undefined = getFormForgeStringArray(field.accept)
    const maxSize: number | null | undefined = typeof field.max_size === 'number' || field.max_size === null ? field.max_size : undefined
    const maxFiles: number | null | undefined = typeof field.max_files === 'number' || field.max_files === null ? field.max_files : undefined
    const maxTotalSize: number | null | undefined = typeof field.max_total_size === 'number' || field.max_total_size === null ? field.max_total_size : undefined
    const storageValue: FormForgeJsonValue | undefined = field.storage
    const storage: FormForgeJsonObject | null = isFormForgeJsonObject(storageValue) ? storageValue : null

    return {
      ...normalizedField,
      type: 'file',
      accept,
      max_size: maxSize,
      max_files: maxFiles,
      max_total_size: maxTotalSize,
      storage: storage as FormForgeFileFieldSchema['storage']
    } as FormForgeFileFieldSchema
  }

  return normalizedField
}

function normalizeFieldsList(
  value: FormForgeJsonValue | undefined,
  fallbackPageKey: string,
  indexOffset: number = 0,
  locale?: string
): FormForgeFieldSchema[] {
  if (!Array.isArray(value)) {
    return []
  }

  const fields: FormForgeFieldSchema[] = []

  for (const [index, item] of value.entries()) {
    if (!isFormForgeJsonObject(item)) {
      continue
    }

    fields.push(normalizeField(item, indexOffset + index, fallbackPageKey, locale))
  }

  return fields
}

function normalizePageFieldsFromSections(
  value: FormForgeJsonValue | undefined,
  pageKey: string,
  indexOffset: number,
  locale?: string
): FormForgeFieldSchema[] {
  if (!Array.isArray(value)) {
    return []
  }

  const fields: FormForgeFieldSchema[] = []

  for (const sectionValue of value) {
    if (!isFormForgeJsonObject(sectionValue)) {
      continue
    }

    const sectionFields = normalizeFieldsList(sectionValue.fields, pageKey, indexOffset + fields.length, locale)
    fields.push(...sectionFields)
  }

  return fields
}

function normalizePages(value: FormForgeJsonValue | undefined, locale?: string): { pages: FormForgePageSchema[]; fields: FormForgeFieldSchema[] } {
  if (!Array.isArray(value)) {
    return {
      pages: [],
      fields: []
    }
  }

  const pages: FormForgePageSchema[] = []
  const fields: FormForgeFieldSchema[] = []

  for (const [pageIndex, pageValue] of value.entries()) {
    if (!isFormForgeJsonObject(pageValue)) {
      continue
    }

    const pageKey = toString(pageValue.page_key, `page_${pageIndex + 1}`)
    const pageMetaValue: FormForgeJsonValue | undefined = pageValue.meta
    const pageMeta: FormForgeJsonObject = isFormForgeJsonObject(pageMetaValue) ? pageMetaValue : {}

    const pageFields = Array.isArray(pageValue.fields)
      ? normalizeFieldsList(pageValue.fields, pageKey, fields.length, locale)
      : normalizePageFieldsFromSections(pageValue.sections, pageKey, fields.length, locale)

    fields.push(...pageFields)

    pages.push({
      page_key: pageKey,
      title: toString(pageValue.title, ''),
      description: toNullableString(pageValue.description),
      meta: pageMeta,
      fields: pageFields
    })
  }

  return {
    pages,
    fields
  }
}

function buildPagesFromFlatFields(fields: FormForgeFieldSchema[]): FormForgePageSchema[] {
  const pages: FormForgePageSchema[] = []

  for (const field of fields) {
    let page = pages.find((item) => item.page_key === field.page_key)

    if (page === undefined) {
      page = {
        page_key: field.page_key,
        title: '',
        description: null,
        meta: {},
        fields: []
      }
      pages.push(page)
    }

    page.fields.push(field)
  }

  return pages
}

function normalizeConditionClause(value: FormForgeJsonValue, index: number): FormForgeConditionClause | null {
  if (!isFormForgeJsonObject(value)) {
    return null
  }

  const operatorRaw = toString(value.operator, 'eq')

  return {
    field_key: toString(value.field_key, `field_${index + 1}`),
    operator: isConditionOperator(operatorRaw) ? operatorRaw : 'eq',
    value: value.value ?? null
  }
}

function normalizeConditions(value: FormForgeJsonValue | undefined): FormForgeCondition[] {
  if (!Array.isArray(value)) {
    return []
  }

  const conditions: FormForgeCondition[] = []

  for (const [index, item] of value.entries()) {
    if (!isFormForgeJsonObject(item)) {
      continue
    }

    const targetTypeRaw = toString(item.target_type, 'field')
    const actionRaw = toString(item.action, 'show')
    const matchRaw = toString(item.match, 'all')

    const whenValue = item.when
    const when: FormForgeConditionClause[] = []

    if (Array.isArray(whenValue)) {
      for (const [whenIndex, clause] of whenValue.entries()) {
        const normalizedClause = normalizeConditionClause(clause, whenIndex)
        if (normalizedClause !== null) {
          when.push(normalizedClause)
        }
      }
    }

    conditions.push({
      condition_key: toString(item.condition_key, `condition_${index + 1}`),
      target_type: isConditionTargetType(targetTypeRaw) ? targetTypeRaw : 'field',
      target_key: toString(item.target_key, ''),
      action: isConditionAction(actionRaw) ? actionRaw : 'show',
      match: isConditionMatch(matchRaw) ? matchRaw : 'all',
      when
    })
  }

  return conditions
}

function normalizeDraftSettings(value: FormForgeJsonValue | undefined): FormForgeDraftSettings {
  if (!isFormForgeJsonObject(value)) {
    return {
      enabled: false
    }
  }

  return {
    ...value,
    enabled: toBoolean(value.enabled, false)
  }
}

export function normalizeFormForgeSchema(payload: FormForgeJsonObject, locale?: string): FormForgeFormSchema {
  const data: FormForgeJsonObject = pickFormForgeDataEnvelope(payload)

  const rootFields: FormForgeFieldSchema[] = normalizeFieldsList(data.fields, 'page_1', 0, locale)
  const normalizedPages = normalizePages(data.pages, locale)

  const fields: FormForgeFieldSchema[] = normalizedPages.fields.length > 0 ? normalizedPages.fields : rootFields
  const pages: FormForgePageSchema[] = normalizedPages.pages.length > 0 ? normalizedPages.pages : buildPagesFromFlatFields(fields)

  const apiValue: FormForgeJsonValue | undefined = data.api
  const api: FormForgeJsonObject = isFormForgeJsonObject(apiValue) ? apiValue : {}

  const metaValue: FormForgeJsonValue | undefined = data.meta
  const meta: FormForgeJsonObject | undefined = isFormForgeJsonObject(metaValue) ? metaValue : undefined
  const categoryItem = data.category_item === null
    ? null
    : normalizeFormForgeCategory(data.category_item)

  return {
    key: toString(data.key, ''),
    version: toString(data.version, ''),
    schema_version: toNumber(data.schema_version, 1),
    title: toString(data.title, ''),
    publish_at: toNullableString(data.publish_at),
    pause_at: toNullableString(data.pause_at),
    response_limit: toPositiveNumber(data.response_limit),
    submission_code_required: typeof data.submission_code_required === 'boolean' ? data.submission_code_required : undefined,
    category: typeof data.category === 'string' || data.category === null ? data.category : undefined,
    category_item: categoryItem ?? undefined,
    is_published: toBoolean(data.is_published, false),
    public_url: toNullableString(data.public_url),
    fields,
    pages,
    conditions: normalizeConditions(data.conditions),
    drafts: normalizeDraftSettings(data.drafts),
    api,
    meta
  }
}
