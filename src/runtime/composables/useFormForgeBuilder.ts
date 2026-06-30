import { computed, ref, toRaw, watch } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
import { isLegacyTemporalFieldType, isTemporalMode, temporalModeFromFieldType } from '../utils/temporal'
import type {
  FormForgeClient,
  FormForgeClientConfig,
  FormForgeCondition,
  FormForgeConditionAction,
  FormForgeConditionMatch,
  FormForgeConditionOperator,
  FormForgeConditionTargetType,
  FormForgeDraftSettings,
  FormForgeFieldSchema,
  FormForgeFieldOption,
  FormForgeFieldType,
  FormForgeTemporalMode,
  FormForgeJsonObject,
  FormForgeJsonValue,
  FormForgeManagementCreateInput,
  FormForgeManagementPatchInput,
  FormForgeScope,
  FormForgePageSchema
} from '../types'
import { createPageLogic, ensurePageLogic } from '../utils/page-logic'
import {
  createDefaultAddressFields,
  resolveDefaultAnswerPlaceholder,
  resolveDefaultConsentLabel,
  resolveDefaultFieldLabel
} from '../utils/defaults'

export interface FormForgeBuilderDraft {
  uuid: string | null
  key: string | null
  schema_version: number
  title: string
  publish_at?: string | null
  pause_at?: string | null
  response_limit?: number | null
  submission_code_required?: boolean
  submission_code?: string | null
  public_url?: string | null
  category: string | null
  pages: FormForgePageSchema[]
  conditions: FormForgeCondition[]
  drafts: FormForgeDraftSettings
  api: FormForgeJsonObject
}

export interface UseFormForgeBuilderOptions {
  formUuid?: string
  formKey?: string
  endpoint?: string
  scope?: FormForgeScope
  initial?: Partial<FormForgeBuilderDraft>
  autosave?: boolean
  autosaveDelay?: number
  autoPublishOnSave?: boolean
  locale?: string
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export interface FormForgeBuilderSaveOptions {
  idempotencyKey?: string
  autoPublish?: boolean
}

export interface FormForgeBuilderExpose {
  save: () => Promise<void>
  publish: () => Promise<void>
  unpublish: () => Promise<void>
  togglePublishState: () => Promise<void>
}

export const FORM_FORGE_BUILDER_FIELD_TYPES: FormForgeFieldType[] = [
  'text',
  'number',
  'radio',
  'consent',
  'checkbox_group',
  'address',
  'temporal',
  'file'
]

export const FORM_FORGE_BUILDER_CONDITION_TARGET_TYPES: FormForgeConditionTargetType[] = ['page', 'field']
export const FORM_FORGE_BUILDER_CONDITION_ACTIONS: FormForgeConditionAction[] = ['show', 'hide', 'skip', 'require', 'disable']
export const FORM_FORGE_BUILDER_CONDITION_MATCHES: FormForgeConditionMatch[] = ['all', 'any']
export const FORM_FORGE_BUILDER_CONDITION_OPERATORS: FormForgeConditionOperator[] = [
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

function shortKey(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

function cloneJsonObject(value: FormForgeJsonObject): FormForgeJsonObject {
  const rawValue = toRaw(value)

  if (typeof structuredClone === 'function') {
    return structuredClone(rawValue)
  }

  return JSON.parse(JSON.stringify(rawValue)) as FormForgeJsonObject
}

function cloneJsonValue<T>(value: T): T {
  const rawValue = toRaw(value)

  if (typeof structuredClone === 'function') {
    return structuredClone(rawValue)
  }

  return JSON.parse(JSON.stringify(rawValue)) as T
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

function createTemporalDefault(): FormForgeJsonValue {
  return null
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

function createField(type: FormForgeFieldType, pageKey: string, locale?: string): FormForgeFieldSchema {
  const fieldKey = shortKey('fk')
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
    default: resolvedType === 'temporal' ? createTemporalDefault() : null,
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
      default: createTemporalDefault()
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

function createPage(type: FormForgeFieldType = 'text', locale?: string): FormForgePageSchema {
  const pageKey = shortKey('pg')

  return {
    page_key: pageKey,
    title: '',
    description: null,
    meta: {
      logic: createPageLogic() as unknown as FormForgeJsonValue
    },
    fields: [createField(type, pageKey, locale)]
  }
}

function createCondition(): FormForgeCondition {
  return {
    condition_key: shortKey('cd'),
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

function cloneField(field: FormForgeFieldSchema): FormForgeFieldSchema {
  return {
    ...field,
    field_key: shortKey('fk'),
    name: shortKey('field'),
    default: cloneJsonValue(field.default),
    meta: cloneJsonObject(field.meta),
    options: Array.isArray(field.options) ? cloneJsonValue(field.options) : field.options,
    address_fields: Array.isArray(field.address_fields) ? cloneJsonValue(field.address_fields) : field.address_fields
  }
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function extractFormUuid(payload: FormForgeJsonObject): string | null {
  if (typeof payload.uuid === 'string' && payload.uuid !== '') {
    return payload.uuid
  }

  if (typeof payload.form_uuid === 'string' && payload.form_uuid !== '') {
    return payload.form_uuid
  }

  if (typeof payload.id === 'string' && payload.id !== '') {
    return payload.id
  }

  return null
}

function extractFormKey(payload: FormForgeJsonObject): string | null {
  if (typeof payload.key === 'string' && payload.key !== '') {
    return payload.key
  }

  if (typeof payload.form_key === 'string' && payload.form_key !== '') {
    return payload.form_key
  }

  return null
}

function resolveMutationIdentifier(draft: FormForgeBuilderDraft): string | null {
  if (typeof draft.uuid === 'string' && draft.uuid !== '') {
    return draft.uuid
  }

  return null
}

function sanitizeDraftShape(value: FormForgeBuilderDraft, locale?: string): void {
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

  if (value.uuid === null && typeof value.key === 'string' && isUuidLike(value.key)) {
    value.uuid = value.key
  }

  const pages = (Array.isArray(value.pages) ? value.pages : []).filter((page) => page !== undefined && page !== null) as FormForgePageSchema[]

  if (pages.length === 0) {
    pages.push(createPage())
  }

  value.pages = pages

  for (const page of value.pages) {
    if (typeof page.page_key !== 'string' || page.page_key === '') {
      page.page_key = shortKey('pg')
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
      fields.push(createField('text', page.page_key))
    }

    page.fields = fields

    for (const field of page.fields) {
      field.page_key = page.page_key
      field.nullable = false
      field.disabled = false
      field.readonly = false

      if (typeof field.field_key !== 'string' || field.field_key === '') {
        field.field_key = shortKey('fk')
      }

      if (typeof field.name !== 'string' || field.name === '') {
        field.name = shortKey('field')
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

export function useFormForgeBuilder(options: UseFormForgeBuilderOptions = {}) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const locale = options.locale ?? options.clientConfig?.locale

  const autosaveEnabled = ref<boolean>(options.autosave ?? true)
  const autosaveDelay = ref<number>(options.autosaveDelay ?? 5000)
  const autoPublishOnSave = ref<boolean>(options.autoPublishOnSave ?? false)
  const loading = ref<boolean>(false)
  const saving = ref<boolean>(false)
  const publishing = ref<boolean>(false)
  const error = ref<string | null>(null)
  const lastSavedAt = ref<string | null>(null)

  const defaultPage = createPage('text', locale)

  const keyFromOptions = options.formKey ?? options.initial?.key ?? null
  const uuidFromOptions = options.formUuid ?? options.initial?.uuid ?? null

  const initialDraft: FormForgeBuilderDraft = {
    uuid: uuidFromOptions ?? (typeof keyFromOptions === 'string' && isUuidLike(keyFromOptions) ? keyFromOptions : null),
    key: typeof keyFromOptions === 'string' && !isUuidLike(keyFromOptions) ? keyFromOptions : options.initial?.key ?? null,
    schema_version: options.initial?.schema_version ?? 2,
    title: options.initial?.title ?? '',
    publish_at: options.initial?.publish_at ?? null,
    pause_at: options.initial?.pause_at ?? null,
    response_limit: options.initial?.response_limit ?? null,
    submission_code_required: options.initial?.submission_code_required ?? false,
    submission_code: options.initial?.submission_code ?? null,
    public_url: options.initial?.public_url ?? null,
    category: options.initial?.category ?? null,
    pages: options.initial?.pages ?? [defaultPage],
    conditions: options.initial?.conditions ?? [],
    drafts: options.initial?.drafts ?? {
      enabled: true
    },
    api: options.initial?.api ?? {}
  }

  sanitizeDraftShape(initialDraft, locale)

  const draft = ref(initialDraft as unknown) as { value: FormForgeBuilderDraft }

  const publishable = computed<boolean>(() => {
    const pages = draft.value.pages as FormForgePageSchema[]

    if (draft.value.title.trim() === '') {
      return false
    }

    if (pages.length === 0) {
      return false
    }

    return pages.some((page) => page.fields.length > 0)
  })

  function normalizeFieldLocations(): void {
    const pages = draft.value.pages as FormForgePageSchema[]

    for (const page of pages) {
      for (const field of page.fields) {
        field.page_key = page.page_key
      }
    }
  }

  function toManagementInput(autoPublish: boolean = false): FormForgeManagementCreateInput {
    normalizeFieldLocations()

    const pages = draft.value.pages as FormForgePageSchema[]
    const fields: unknown[] = []

    for (const page of pages) {
      for (const field of page.fields) {
        fields.push(field)
      }
    }

    const input: FormForgeManagementCreateInput = {
      title: draft.value.title,
      schema_version: draft.value.schema_version,
      publish_at: draft.value.publish_at ?? null,
      pause_at: draft.value.pause_at ?? null,
      response_limit: draft.value.response_limit ?? null,
      submission_code_required: draft.value.submission_code_required ?? false,
      category: draft.value.category,
      pages,
      fields: fields as FormForgeFieldSchema[],
      conditions: draft.value.conditions as FormForgeCondition[],
      drafts: draft.value.drafts as FormForgeDraftSettings,
      api: draft.value.api
    }

    if (draft.value.submission_code_required === true && typeof draft.value.submission_code === 'string' && draft.value.submission_code.trim() !== '') {
      input.submission_code = draft.value.submission_code
    }

    if (autoPublish) {
      input.auto_publish = true
    }

    return input
  }

  async function save(saveOptions: FormForgeBuilderSaveOptions | string = {}): Promise<void> {
    const resolvedSaveOptions = typeof saveOptions === 'string'
      ? { idempotencyKey: saveOptions, autoPublish: autoPublishOnSave.value }
      : {
          idempotencyKey: saveOptions.idempotencyKey,
          autoPublish: saveOptions.autoPublish === true || autoPublishOnSave.value === true
        }

    if (draft.value.title.trim() === '') {
      throw new Error('Title is required to save')
    }

    saving.value = true
    error.value = null

    try {
      const input: FormForgeManagementCreateInput = toManagementInput(resolvedSaveOptions.autoPublish)

      const mutationIdentifier = resolveMutationIdentifier(draft.value)

      if (mutationIdentifier === null) {
        const hasExistingSlug = typeof draft.value.key === 'string' && draft.value.key !== ''

        if (hasExistingSlug) {
          throw new Error('Form uuid is required for update')
        }

        const created = await client.createForm(input, {
          idempotencyKey: resolvedSaveOptions.idempotencyKey,
          endpoint: options.endpoint,
          scope: options.scope
        })

        const nextUuid = extractFormUuid(created)
        const nextKey = extractFormKey(created)

        if (nextUuid !== null) {
          draft.value.uuid = nextUuid
        }

        if (nextKey !== null) {
          draft.value.key = nextKey
        }

        if (typeof created.public_url === 'string') {
          draft.value.public_url = created.public_url
        }
      } else {
        const patchInput: FormForgeManagementPatchInput = input
        const patched = await client.patchForm(mutationIdentifier, patchInput, {
          idempotencyKey: resolvedSaveOptions.idempotencyKey,
          endpoint: options.endpoint,
          scope: options.scope
        })

        const nextUuid = extractFormUuid(patched)
        const nextKey = extractFormKey(patched)

        if (nextUuid !== null) {
          draft.value.uuid = nextUuid
        }

        if (nextKey !== null) {
          draft.value.key = nextKey
        }

        if (typeof patched.public_url === 'string') {
          draft.value.public_url = patched.public_url
        }
      }

      lastSavedAt.value = new Date().toISOString()
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to save form'
      throw caughtError
    } finally {
      saving.value = false
    }
  }

  async function publish(idempotencyKey?: string): Promise<void> {
    if (!publishable.value) {
      throw new Error('Form is not publishable')
    }

    const mutationIdentifier = resolveMutationIdentifier(draft.value)

    if (mutationIdentifier === null) {
      throw new Error('Form uuid is missing')
    }

    publishing.value = true
    error.value = null

    try {
      await client.publishForm(mutationIdentifier, {
        idempotencyKey,
        endpoint: options.endpoint,
        scope: options.scope
      })
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to publish form'
      throw caughtError
    } finally {
      publishing.value = false
    }
  }

  async function unpublish(idempotencyKey?: string): Promise<void> {
    const mutationIdentifier = resolveMutationIdentifier(draft.value)

    if (mutationIdentifier === null) {
      throw new Error('Form uuid is missing')
    }

    publishing.value = true
    error.value = null

    try {
      await client.unpublishForm(mutationIdentifier, {
        idempotencyKey,
        endpoint: options.endpoint,
        scope: options.scope
      })
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to unpublish form'
      throw caughtError
    } finally {
      publishing.value = false
    }
  }

  function addPage(type: FormForgeFieldType = 'text'): FormForgePageSchema {
    const pages = draft.value.pages as FormForgePageSchema[]
    const page = createPage(type, locale)
    pages.push(page)

    return page
  }

  function removePage(pageKey: string): void {
    const pages = draft.value.pages as FormForgePageSchema[]

    if (pages.length <= 1) {
      return
    }

    const pageIndex = pages.findIndex((page) => page.page_key === pageKey)
    if (pageIndex < 0) {
      return
    }

    pages.splice(pageIndex, 1)
  }

  function movePage(pageKey: string, direction: -1 | 1): void {
    const pages = draft.value.pages as FormForgePageSchema[]
    const pageIndex = pages.findIndex((page) => page.page_key === pageKey)

    if (pageIndex < 0) {
      return
    }

    const nextIndex = pageIndex + direction

    if (nextIndex < 0 || nextIndex >= pages.length) {
      return
    }

    const [page] = pages.splice(pageIndex, 1)
    pages.splice(nextIndex, 0, page)
  }

  function duplicatePage(pageKey: string): void {
    const pages = draft.value.pages as FormForgePageSchema[]
    const pageIndex = pages.findIndex((page) => page.page_key === pageKey)

    if (pageIndex < 0) {
      return
    }

    const page = pages[pageIndex]
    const nextPageKey = shortKey('pg')
    const clonedPage: FormForgePageSchema = {
      ...page,
      page_key: nextPageKey,
      meta: cloneJsonObject(page.meta),
      fields: page.fields.map((field) => {
        const clonedField = cloneField(field)
        clonedField.page_key = nextPageKey
        return clonedField
      })
    }

    pages.splice(pageIndex + 1, 0, clonedPage)
  }

  function mergePageWithPrevious(pageKey: string): void {
    const pages = draft.value.pages as FormForgePageSchema[]

    if (pages.length <= 1) {
      return
    }

    const pageIndex = pages.findIndex((page) => page.page_key === pageKey)
    if (pageIndex <= 0) {
      return
    }

    const previousPage = pages[pageIndex - 1]
    const currentPage = pages[pageIndex]

    previousPage.fields.push(...currentPage.fields.map((field) => ({
      ...field,
      page_key: previousPage.page_key
    })))

    pages.splice(pageIndex, 1)
  }

  function addField(pageKey: string, type: FormForgeFieldType): void {
    const pages = draft.value.pages as FormForgePageSchema[]
    const page = pages.find((item) => item.page_key === pageKey)
    if (page === undefined) {
      return
    }

    page.fields.push(createField(type, pageKey, locale))
  }

  function insertFieldAfter(pageKey: string, fieldKey: string, type: FormForgeFieldType): void {
    const pages = draft.value.pages as FormForgePageSchema[]
    const page = pages.find((item) => item.page_key === pageKey)
    if (page === undefined) {
      return
    }

    const fieldIndex = page.fields.findIndex((item) => item.field_key === fieldKey)
    const nextField = createField(type, pageKey, locale)

    if (fieldIndex < 0) {
      page.fields.push(nextField)
      return
    }

    page.fields.splice(fieldIndex + 1, 0, nextField)
  }

  function duplicateField(pageKey: string, fieldKey: string): void {
    const pages = draft.value.pages as FormForgePageSchema[]
    const page = pages.find((item) => item.page_key === pageKey)
    if (page === undefined) {
      return
    }

    const field = page.fields.find((item) => item.field_key === fieldKey)
    if (field === undefined) {
      return
    }

    const clonedField = cloneField(field)
    clonedField.page_key = page.page_key
    page.fields.push(clonedField)
  }

  function moveField(pageKey: string, fieldKey: string, direction: -1 | 1): void {
    const pages = draft.value.pages as FormForgePageSchema[]
    const page = pages.find((item) => item.page_key === pageKey)
    if (page === undefined) {
      return
    }

    const fieldIndex = page.fields.findIndex((item) => item.field_key === fieldKey)
    if (fieldIndex < 0) {
      return
    }

    const nextIndex = fieldIndex + direction
    if (nextIndex < 0 || nextIndex >= page.fields.length) {
      return
    }

    const [field] = page.fields.splice(fieldIndex, 1)
    page.fields.splice(nextIndex, 0, field)
  }

  function moveFieldToPage(pageKey: string, fieldKey: string, targetPageKey: string): void {
    const pages = draft.value.pages as FormForgePageSchema[]
    const sourcePage = pages.find((item) => item.page_key === pageKey)
    const targetPage = pages.find((item) => item.page_key === targetPageKey)

    if (sourcePage === undefined || targetPage === undefined) {
      return
    }

    const fieldIndex = sourcePage.fields.findIndex((item) => item.field_key === fieldKey)
    if (fieldIndex < 0) {
      return
    }

    const [field] = sourcePage.fields.splice(fieldIndex, 1)
    field.page_key = targetPage.page_key
    targetPage.fields.push(field)
  }

  function removeField(pageKey: string, fieldKey: string): void {
    const pages = draft.value.pages as FormForgePageSchema[]
    const page = pages.find((item) => item.page_key === pageKey)
    if (page === undefined) {
      return
    }

    if (page.fields.length <= 1) {
      return
    }

    const fieldIndex = page.fields.findIndex((field) => field.field_key === fieldKey)
    if (fieldIndex < 0) {
      return
    }

    page.fields.splice(fieldIndex, 1)
  }

  function addCondition(): void {
    const conditions = draft.value.conditions as FormForgeCondition[]
    conditions.push(createCondition())
  }

  function removeCondition(conditionKey: string): void {
    const conditions = draft.value.conditions as FormForgeCondition[]
    const conditionIndex = conditions.findIndex((condition) => condition.condition_key === conditionKey)
    if (conditionIndex < 0) {
      return
    }

    conditions.splice(conditionIndex, 1)
  }

  function addConditionClause(conditionKey: string): void {
    const conditions = draft.value.conditions as FormForgeCondition[]
    const condition = conditions.find((item) => item.condition_key === conditionKey)
    if (condition === undefined) {
      return
    }

    condition.when.push({
      field_key: '',
      operator: 'eq',
      value: null
    })
  }

  function removeConditionClause(conditionKey: string, index: number): void {
    const conditions = draft.value.conditions as FormForgeCondition[]
    const condition = conditions.find((item) => item.condition_key === conditionKey)
    if (condition === undefined) {
      return
    }

    if (condition.when.length <= 1) {
      return
    }

    condition.when.splice(index, 1)
  }

  let autosaveTimer: ReturnType<typeof setTimeout> | undefined
  let hasInitializedWatch = false

  function clearAutosave(): void {
    if (autosaveTimer !== undefined) {
      clearTimeout(autosaveTimer)
      autosaveTimer = undefined
    }
  }

  function scheduleAutosave(): void {
    if (!autosaveEnabled.value) {
      return
    }

    clearAutosave()
    autosaveTimer = setTimeout(() => {
      if (saving.value || publishing.value) {
        return
      }

      if (draft.value.title.trim() === '') {
        return
      }

      save().catch(() => {})
    }, autosaveDelay.value)
  }

  watch(() => draft.value, () => {
    if (!hasInitializedWatch) {
      hasInitializedWatch = true
      return
    }

    scheduleAutosave()
  }, {
    deep: true
  })

  return {
    client,
    loading,
    saving,
    publishing,
    error,
    draft,
    autosaveEnabled,
    autosaveDelay,
    autoPublishOnSave,
    lastSavedAt,
    publishable,
    addPage,
    removePage,
    movePage,
    duplicatePage,
    mergePageWithPrevious,
    addField,
    insertFieldAfter,
    duplicateField,
    moveField,
    moveFieldToPage,
    removeField,
    addCondition,
    removeCondition,
    addConditionClause,
    removeConditionClause,
    normalizeFieldLocations,
    save,
    publish,
    unpublish,
    clearAutosave,
    scheduleAutosave
  }
}
