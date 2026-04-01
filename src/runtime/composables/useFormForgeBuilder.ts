import { computed, ref, watch } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
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
  FormForgeFieldType,
  FormForgeJsonObject,
  FormForgeManagementCreateInput,
  FormForgeManagementPatchInput,
  FormForgeScope,
  FormForgePageSchema
} from '../types'

export interface FormForgeBuilderDraft {
  uuid: string | null
  key: string | null
  title: string
  category: string | null
  pages: FormForgePageSchema[]
  conditions: FormForgeCondition[]
  drafts: FormForgeDraftSettings
}

export interface UseFormForgeBuilderOptions {
  formUuid?: string
  formKey?: string
  endpoint?: string
  scope?: FormForgeScope
  initial?: Partial<FormForgeBuilderDraft>
  autosave?: boolean
  autosaveDelay?: number
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export const FORM_FORGE_BUILDER_FIELD_TYPES: FormForgeFieldType[] = [
  'text',
  'textarea',
  'email',
  'number',
  'select',
  'select_menu',
  'radio',
  'checkbox',
  'checkbox_group',
  'switch',
  'date',
  'time',
  'datetime',
  'date_range',
  'datetime_range',
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

function fieldLabelFromType(type: FormForgeFieldType): string {
  if (type === 'checkbox_group') {
    return 'Checkbox Group'
  }

  if (type === 'select_menu') {
    return 'Select Menu'
  }

  if (type === 'date_range') {
    return 'Date Range'
  }

  if (type === 'datetime_range') {
    return 'Datetime Range'
  }

  return type.charAt(0).toUpperCase() + type.slice(1)
}

function createField(type: FormForgeFieldType, pageKey: string): FormForgeFieldSchema {
  const fieldKey = shortKey('fk')
  const name = fieldKey.replace('fk_', '')

  const baseField: FormForgeFieldSchema = {
    field_key: fieldKey,
    type,
    name,
    page_key: pageKey,
    label: fieldLabelFromType(type),
    required: false,
    nullable: false,
    disabled: false,
    readonly: false,
    default: null,
    rules: [],
    meta: {},
    options: type === 'select' || type === 'select_menu' || type === 'radio' || type === 'checkbox_group'
      ? []
      : undefined
  }

  if (type === 'file') {
    return {
      ...baseField,
      type: 'file',
      multiple: false,
      accept: []
    }
  }

  return baseField
}

function createPage(): FormForgePageSchema {
  const pageKey = shortKey('pg')

  return {
    page_key: pageKey,
    title: 'Page',
    description: null,
    meta: {},
    fields: [createField('text', pageKey)]
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
    name: shortKey('field')
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

function sanitizeDraftShape(value: FormForgeBuilderDraft): void {
  if (typeof value.uuid !== 'string' || value.uuid === '') {
    value.uuid = null
  }

  if (typeof value.key !== 'string' || value.key === '') {
    value.key = null
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
      page.title = 'Page'
    }

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
    }
  }
}

export function useFormForgeBuilder(options: UseFormForgeBuilderOptions = {}) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)

  const autosaveEnabled = ref<boolean>(options.autosave ?? true)
  const autosaveDelay = ref<number>(options.autosaveDelay ?? 5000)
  const loading = ref<boolean>(false)
  const saving = ref<boolean>(false)
  const publishing = ref<boolean>(false)
  const error = ref<string | null>(null)
  const lastSavedAt = ref<string | null>(null)

  const defaultPage = createPage()

  const keyFromOptions = options.formKey ?? options.initial?.key ?? null
  const uuidFromOptions = options.formUuid ?? options.initial?.uuid ?? null

  const initialDraft: FormForgeBuilderDraft = {
    uuid: uuidFromOptions ?? (typeof keyFromOptions === 'string' && isUuidLike(keyFromOptions) ? keyFromOptions : null),
    key: typeof keyFromOptions === 'string' && !isUuidLike(keyFromOptions) ? keyFromOptions : options.initial?.key ?? null,
    title: options.initial?.title ?? '',
    category: options.initial?.category ?? null,
    pages: options.initial?.pages ?? [defaultPage],
    conditions: options.initial?.conditions ?? [],
    drafts: options.initial?.drafts ?? {
      enabled: true
    }
  }

  sanitizeDraftShape(initialDraft)

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

  function toManagementInput(): FormForgeManagementCreateInput {
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
      category: draft.value.category,
      pages,
      fields: fields as FormForgeFieldSchema[],
      conditions: draft.value.conditions as FormForgeCondition[],
      drafts: draft.value.drafts as FormForgeDraftSettings
    }

    return input
  }

  async function save(idempotencyKey?: string): Promise<void> {
    if (draft.value.title.trim() === '') {
      throw new Error('Title is required to save')
    }

    saving.value = true
    error.value = null

    try {
      const input: FormForgeManagementCreateInput = toManagementInput()

      const mutationIdentifier = resolveMutationIdentifier(draft.value)

      if (mutationIdentifier === null) {
        const hasExistingSlug = typeof draft.value.key === 'string' && draft.value.key !== ''

        if (hasExistingSlug) {
          throw new Error('Form uuid is required for update')
        }

        const created = await client.createForm(input, {
          idempotencyKey,
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
      } else {
        const patchInput: FormForgeManagementPatchInput = input
        const patched = await client.patchForm(mutationIdentifier, patchInput, {
          idempotencyKey,
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

  function addPage(): void {
    const pages = draft.value.pages as FormForgePageSchema[]
    pages.push(createPage())
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

    page.fields.push(createField(type, pageKey))
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
    lastSavedAt,
    publishable,
    addPage,
    removePage,
    mergePageWithPrevious,
    addField,
    duplicateField,
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
