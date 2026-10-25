import type {
  FormForgeCondition,
  FormForgeFieldOption,
  FormForgeFieldSchema,
  FormForgeFieldType,
  FormForgeJsonObject,
  FormForgeJsonValue,
  FormForgePageSchema,
  FormForgeTemporalMode
} from '../types'
import { createDefaultAddressFields, resolveDefaultAnswerPlaceholder, resolveDefaultConsentLabel, resolveDefaultFieldLabel } from './defaults'
import { createPageLogic, ensurePageLogic } from './page-logic'
import { isLegacyTemporalFieldType, isTemporalMode, temporalModeFromFieldType } from './temporal'

interface FormForgeBuilderDraftShape {
  uuid: string | null
  key: string | null
  schema_version: number
  api: FormForgeJsonObject
  public_url?: string | null
  submission_code_required?: boolean
  submission_code?: string | null
  access_code_required?: boolean
  access_code?: string | null
  pages: FormForgePageSchema[]
  conditions: FormForgeCondition[]
}

export function createFormForgeBuilderKey(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

function isChoiceFieldType(type: FormForgeFieldType): boolean {
  return type === 'radio' || type === 'checkbox_group'
}

function choiceOptionCount(type: FormForgeFieldType): number {
  return type === 'checkbox_group' ? 3 : 2
}

function minimumChoiceOptionCount(type: FormForgeFieldType): number {
  return type === 'checkbox_group' ? 2 : 1
}

function createChoiceOptions(type: FormForgeFieldType): FormForgeFieldOption[] {
  const options: FormForgeFieldOption[] = []
  const count = choiceOptionCount(type)

  for (let index = 0; index < count; index += 1) {
    options.push({
      label: '',
      value: `option_${index + 1}`
    })
  }

  return options
}

function defaultChoiceDisplay(type: FormForgeFieldType): 'list' | 'menu' {
  return type === 'radio' || type === 'checkbox_group' ? 'list' : 'menu'
}

function temporalFieldDefaultMode(type: FormForgeFieldType): FormForgeTemporalMode {
  if (isLegacyTemporalFieldType(type)) {
    return temporalModeFromFieldType(type)
  }

  return 'date'
}

function normalizeTemporalField(field: FormForgeFieldSchema): void {
  const rawType = field.type

  if (isLegacyTemporalFieldType(field.type)) {
    field.type = 'temporal'
  }

  if (field.type !== 'temporal') {
    return
  }

  const resolvedMode = isTemporalMode(field.temporal_mode) ? field.temporal_mode : temporalModeFromFieldType(rawType)
  field.temporal_mode = resolvedMode
  field.hour_cycle = resolvedMode === 'time'
    ? (field.hour_cycle === 12 ? 12 : 24)
    : undefined

  field.default = null
}

function createAddressValue(): Record<string, string | null> {
  return {
    line1: null,
    line2: null,
    city: null,
    state: null,
    zip: null,
    country: null
  }
}

export function createFormForgeBuilderField(type: FormForgeFieldType, pageKey: string, locale?: string): FormForgeFieldSchema {
  const fieldKey = createFormForgeBuilderKey('fk')
  const name = fieldKey.replace('fk_', '')
  const temporalMode = temporalFieldDefaultMode(type)
  const resolvedType: FormForgeFieldType = isLegacyTemporalFieldType(type) ? 'temporal' : type

  const baseField: FormForgeFieldSchema = {
    field_key: fieldKey,
    type: resolvedType,
    name,
    page_key: pageKey,
    label: resolveDefaultFieldLabel(resolvedType, locale, temporalMode),
    required: false,
    nullable: false,
    disabled: false,
    readonly: false,
    default: null,
    rules: [],
    meta: {},
    placeholder: type === 'text' || type === 'number'
      ? resolveDefaultAnswerPlaceholder(locale)
      : undefined,
    options: type === 'radio' || type === 'checkbox_group'
      ? []
      : undefined
  }

  if (isChoiceFieldType(type)) {
    return {
      ...baseField,
      options: createChoiceOptions(type),
      display: defaultChoiceDisplay(type)
    }
  }

  if (type === 'consent') {
    return {
      ...baseField,
      type: 'consent',
      consent_label: resolveDefaultConsentLabel(locale)
    }
  }

  if (resolvedType === 'temporal') {
    return {
      ...baseField,
      type: 'temporal',
      temporal_mode: temporalMode,
      hour_cycle: temporalMode === 'time' ? 24 : undefined,
      default: null
    }
  }

  if (type === 'file') {
    return {
      ...baseField,
      type: 'file',
      multiple: false,
      accept: []
    }
  }

  if (type === 'address') {
    return {
      ...baseField,
      type: 'address',
      default: createAddressValue(),
      address_fields: createDefaultAddressFields(locale)
    }
  }

  return baseField
}

export function createFormForgeBuilderPage(type: FormForgeFieldType = 'text', locale?: string): FormForgePageSchema {
  const pageKey = createFormForgeBuilderKey('pg')

  return {
    page_key: pageKey,
    title: '',
    description: null,
    meta: {
      logic: createPageLogic() as unknown as FormForgeJsonValue
    },
    fields: [createFormForgeBuilderField(type, pageKey, locale)]
  }
}

export function createFormForgeBuilderCondition(): FormForgeCondition {
  return {
    condition_key: createFormForgeBuilderKey('cd'),
    target_type: 'field',
    target_key: '',
    action: 'show',
    match: 'all',
    when: [
      {
        field_key: '',
        operator: 'eq',
        value: null
      }
    ]
  }
}

export function isFormForgeBuilderUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function sanitizeFormForgeBuilderDraft(value: FormForgeBuilderDraftShape, locale?: string): void {
  if (typeof value.uuid !== 'string' || value.uuid === '') {
    value.uuid = null
  }

  if (typeof value.key !== 'string' || value.key === '') {
    value.key = null
  }

  if (!Number.isInteger(value.schema_version) || value.schema_version <= 0) {
    value.schema_version = 2
  }

  if (typeof value.api !== 'object' || value.api === null || Array.isArray(value.api)) {
    value.api = {}
  }

  if (typeof value.public_url !== 'string') {
    value.public_url = null
  }

  if (typeof value.submission_code_required !== 'boolean') {
    value.submission_code_required = false
  }

  if (typeof value.submission_code !== 'string') {
    value.submission_code = null
  }

  if (typeof value.access_code !== 'string') {
    value.access_code = null
  }

  if (value.uuid === null && typeof value.key === 'string' && isFormForgeBuilderUuid(value.key)) {
    value.uuid = value.key
  }

  const pages = (Array.isArray(value.pages) ? value.pages : []).filter((page) => page !== undefined && page !== null) as FormForgePageSchema[]

  if (pages.length === 0) {
    pages.push(createFormForgeBuilderPage())
  }

  value.pages = pages

  for (const page of value.pages) {
    if (typeof page.page_key !== 'string' || page.page_key === '') {
      page.page_key = createFormForgeBuilderKey('pg')
    }

    if (typeof page.title !== 'string') {
      page.title = ''
    }

    if (typeof page.meta !== 'object' || page.meta === null || Array.isArray(page.meta)) {
      page.meta = {}
    }

    ensurePageLogic(page)

    const fields = (Array.isArray(page.fields) ? page.fields : []).filter((field) => field !== undefined && field !== null) as FormForgeFieldSchema[]

    if (fields.length === 0) {
      fields.push(createFormForgeBuilderField('text', page.page_key))
    }

    page.fields = fields

    for (const field of page.fields) {
      field.page_key = page.page_key
      field.nullable = false
      field.disabled = false
      field.readonly = false

      if (typeof field.field_key !== 'string' || field.field_key === '') {
        field.field_key = createFormForgeBuilderKey('fk')
      }

      if (typeof field.name !== 'string' || field.name === '') {
        field.name = createFormForgeBuilderKey('field')
      }

      if (typeof field.rules !== 'object' || !Array.isArray(field.rules)) {
        field.rules = []
      }

      if (typeof field.meta !== 'object' || field.meta === null || Array.isArray(field.meta)) {
        field.meta = {}
      }

      normalizeTemporalField(field)

      if (isChoiceFieldType(field.type)) {
        if (!Array.isArray(field.options) || field.options.length === 0) {
          field.options = createChoiceOptions(field.type)
        }

        const minimumOptionCount = minimumChoiceOptionCount(field.type)

        if (field.options.length < minimumOptionCount) {
          const nextOptions = [...field.options]

          for (let index = nextOptions.length; index < minimumOptionCount; index += 1) {
            nextOptions.push({
              label: '',
              value: `option_${index + 1}`
            })
          }

          field.options = nextOptions
        }

        if (field.display !== 'list' && field.display !== 'menu') {
          field.display = defaultChoiceDisplay(field.type)
        }
      }

      if (field.type === 'consent' && typeof field.consent_label !== 'string') {
        field.consent_label = resolveDefaultConsentLabel(locale)
      }

      if (field.type === 'address') {
        if (!Array.isArray(field.address_fields) || field.address_fields.length === 0) {
          field.address_fields = createDefaultAddressFields(locale)
        }

        if (typeof field.default !== 'object' || field.default === null || Array.isArray(field.default)) {
          field.default = createAddressValue()
        }
      }
    }
  }
}
