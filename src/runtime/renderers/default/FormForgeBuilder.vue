<script setup lang="ts">
import { computed, nextTick, ref, watch } from '#imports'
import { parseDate, parseTime } from '@internationalized/date'
import type { DateValue, Time } from '@internationalized/date'
import { useOverlay } from '@nuxt/ui/composables/useOverlay'
import { useToast } from '@nuxt/ui/composables/useToast'
import Draggable from 'vuedraggable'
import {
  FORM_FORGE_BUILDER_FIELD_TYPES,
  useFormForgeBuilder
} from '../../composables/useFormForgeBuilder'
import { useFormForgeCategory, useFormForgeCategoryOptions } from '../../composables/useFormForgeCategory'
import { useFormForgeI18n } from '../../composables/useFormForgeI18n'
import { normalizeFormForgeFieldTypeChange } from '../../utils/field-type'
import type {
  FormForgeBuilderDraft,
  FormForgeBuilderExpose,
  UseFormForgeBuilderOptions
} from '../../composables/useFormForgeBuilder'
import type { FormForgeFieldSchema, FormForgeFieldType, FormForgeFormSchema, FormForgePageSchema } from '../../types'
import type { FormForgeCategory, FormForgeCategorySelectOption } from '../../types'
import {
  ensurePageLogic,
} from '../../utils/page-logic'
import FormForgeCategoryCreateModal from './FormForgeCategoryCreateModal.vue'
import FormForgeBuilderBlockCard from './builder/FormForgeBuilderBlockCard.vue'

interface Props {
  formUuid?: string
  formKey?: string
  endpoint?: string
  loadFormKey?: string
  loadFormVersion?: string
  formRouteKey?: string
  categoryRouteKey?: string
  locale?: string
  modelValue?: Partial<FormForgeBuilderDraft>
  autosave?: boolean
  autosaveDelay?: number
  readonly?: boolean
  disableTitleInput?: boolean
  disableCategoryControl?: boolean
  disablePublishAction?: boolean
  disableSettingsTab?: boolean
  hideSettings?: boolean
  autoPublishOnSave?: boolean
  defaultPublished?: boolean
  standalone?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  formUuid: undefined,
  formKey: undefined,
  endpoint: undefined,
  loadFormKey: undefined,
  loadFormVersion: undefined,
  formRouteKey: undefined,
  categoryRouteKey: undefined,
  locale: undefined,
  modelValue: undefined,
  autosave: true,
  autosaveDelay: 5000,
  readonly: false,
  disableTitleInput: false,
  disableCategoryControl: false,
  disablePublishAction: false,
  disableSettingsTab: false,
  hideSettings: false,
  autoPublishOnSave: false,
  defaultPublished: false,
  standalone: false
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: FormForgeBuilderDraft): void
  (event: 'save', value: FormForgeBuilderDraft): void
  (event: 'publish', value: FormForgeBuilderDraft): void
  (event: 'unpublish', value: FormForgeBuilderDraft): void
  (event: 'error', value: string): void
  (event: 'selection-change', pageKey: string | null, fieldKey: string | null): void
}>()

const builderOptions: UseFormForgeBuilderOptions = {
  formUuid: props.formUuid,
  formKey: props.formKey,
  endpoint: props.endpoint,
  locale: props.locale,
  initial: props.modelValue,
  autosave: props.autosave,
  autosaveDelay: props.autosaveDelay,
  autoPublishOnSave: props.autoPublishOnSave
}

const builder = useFormForgeBuilder(builderOptions)
const { t, locale } = useFormForgeI18n({
  locale: () => props.locale
})
const toast = useToast()
const draft = builder.draft
const saving = builder.saving
const publishing = builder.publishing
const publishable = builder.publishable
const lastSavedAt = builder.lastSavedAt
const builderError = builder.error
const overlay = useOverlay()
const categoryManager = useFormForgeCategory({
  immediate: !props.disableCategoryControl,
  initialQuery: {
    per_page: 200
  },
  endpoint: props.endpoint,
  categoryRouteKey: props.categoryRouteKey
})
const categoryOptions = useFormForgeCategoryOptions({
  source: categoryManager,
  includeInactive: true
})
const CATEGORY_NONE_VALUE = '__formforge_no_category__'

const loadingRemoteForm = ref<boolean>(false)
const isPublished = ref<boolean>(props.defaultPublished)
let loadRequestId = 0
const settingsHidden = computed<boolean>(() => props.hideSettings || props.disableSettingsTab)

const safePages = computed<FormForgePageSchema[]>(() => {
  const pages = draft.value?.pages
  if (!Array.isArray(pages)) {
    return []
  }

  return pages.filter((page): page is FormForgePageSchema => page !== undefined && page !== null)
})

const draftTitle = computed<string>({
  get() {
    return typeof draft.value?.title === 'string' ? draft.value.title : ''
  },
  set(value: string) {
    if (draft.value === undefined || draft.value === null) {
      return
    }

    draft.value.title = value
  }
})

const draftCategory = computed<string | null>({
  get() {
    return typeof draft.value?.category === 'string' ? draft.value.category : null
  },
  set(value: string | null) {
    if (draft.value === undefined || draft.value === null) {
      return
    }

    draft.value.category = value
  }
})

const draftCategorySelectValue = computed<string>({
  get() {
    return draftCategory.value ?? CATEGORY_NONE_VALUE
  },
  set(value: string) {
    draftCategory.value = value === CATEGORY_NONE_VALUE ? null : value
  }
})

const categorySelectItems = computed<FormForgeCategorySelectOption[]>(() => {
  const items: FormForgeCategorySelectOption[] = [
    {
      label: t('builder.categoryNone'),
      value: CATEGORY_NONE_VALUE,
      disabled: false
    },
    ...categoryOptions.value
  ]

  if (
    typeof draftCategory.value === 'string'
    && draftCategory.value !== ''
    && !items.some((item) => item.value === draftCategory.value)
  ) {
    items.push({
      label: draftCategory.value,
      value: draftCategory.value,
      disabled: false
    })
  }

  return items
})

const draftPages = computed<FormForgePageSchema[]>({
  get() {
    return safePages.value
  },
  set(value: FormForgePageSchema[]) {
    if (draft.value === undefined || draft.value === null) {
      return
    }

    draft.value.pages = value
  }
})

const draftMutationIdentifier = computed<string | null>(() => {
  if (typeof draft.value?.uuid === 'string' && draft.value.uuid !== '') {
    return draft.value.uuid
  }

  return null
})

const builderLayoutClass = computed<string>(() => {
  return props.standalone
    ? 'grid gap-4'
    : 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_4rem]'
})

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

function isFormForgeCategory(value: unknown): value is FormForgeCategory {
  if (value === null || typeof value !== 'object') {
    return false
  }

  const candidate = value as FormForgeCategory
  return typeof candidate.key === 'string' && candidate.key !== '' && typeof candidate.name === 'string'
}

const formattedLastSavedAt = computed<string | null>(() => {
  if (lastSavedAt.value === null) {
    return null
  }

  const parsed = new Date(lastSavedAt.value)

  if (Number.isNaN(parsed.getTime())) {
    return lastSavedAt.value
  }

  const day = twoDigits(parsed.getDate())
  const month = twoDigits(parsed.getMonth() + 1)
  const year = parsed.getFullYear()
  const hours = twoDigits(parsed.getHours())
  const minutes = twoDigits(parsed.getMinutes())

  return `${day}.${month}.${year} à ${hours}:${minutes}`
})

interface DateTimeParts {
  date: DateValue | null
  time: Time | null
}

function parseDateTimeValue(value: string | null | undefined): DateTimeParts {
  if (typeof value !== 'string' || value.trim() === '') {
    return {
      date: null,
      time: null
    }
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return {
      date: null,
      time: null
    }
  }

  return {
    date: parseDate([
      parsed.getFullYear(),
      twoDigits(parsed.getMonth() + 1),
      twoDigits(parsed.getDate())
    ].join('-')),
    time: parseTime([
      twoDigits(parsed.getHours()),
      twoDigits(parsed.getMinutes()),
      twoDigits(parsed.getSeconds())
    ].join(':'))
  }
}

function serializeDateTimeValue(date: DateValue | null, time: Time | null): string | null {
  if (date === null) {
    return null
  }

  const year = date.year
  const month = twoDigits(date.month)
  const day = twoDigits(date.day)
  const hours = time !== null ? twoDigits(time.hour) : '00'
  const minutes = time !== null ? twoDigits(time.minute) : '00'
  const seconds = time !== null ? twoDigits(time.second) : '00'

  return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`).toISOString()
}

function currentDateTimeValue(): string {
  return new Date().toISOString()
}

const selectedTab = ref<string>('builder')
const publishAtParts = computed<DateTimeParts>(() => parseDateTimeValue(draft.value?.publish_at))
const pauseAtParts = computed<DateTimeParts>(() => parseDateTimeValue(draft.value?.pause_at))

const publishAtDate = computed<DateValue | null>({
  get() {
    return publishAtParts.value.date
  },
  set(value: DateValue | null) {
    if (draft.value === undefined || draft.value === null) {
      return
    }

    draft.value.publish_at = serializeDateTimeValue(value, publishAtParts.value.time)
  }
})

const publishAtTime = computed<Time | null>({
  get() {
    return publishAtParts.value.time
  },
  set(value: Time | null) {
    if (draft.value === undefined || draft.value === null) {
      return
    }

    draft.value.publish_at = serializeDateTimeValue(publishAtParts.value.date, value)
  }
})

const pauseAtDate = computed<DateValue | null>({
  get() {
    return pauseAtParts.value.date
  },
  set(value: DateValue | null) {
    if (draft.value === undefined || draft.value === null) {
      return
    }

    draft.value.pause_at = serializeDateTimeValue(value, pauseAtParts.value.time)
  }
})

const pauseAtTime = computed<Time | null>({
  get() {
    return pauseAtParts.value.time
  },
  set(value: Time | null) {
    if (draft.value === undefined || draft.value === null) {
      return
    }

    draft.value.pause_at = serializeDateTimeValue(pauseAtParts.value.date, value)
  }
})

const responseLimitValue = computed<number | null>({
  get() {
    return typeof draft.value?.response_limit === 'number' ? draft.value.response_limit : null
  },
  set(value: number | null) {
    if (draft.value === undefined || draft.value === null) {
      return
    }

    draft.value.response_limit = typeof value === 'number' && Number.isFinite(value) ? value : null
  }
})

const openingEnabled = computed<boolean>({
  get() {
    return draft.value?.publish_at !== null && draft.value?.publish_at !== undefined
  },
  set(value: boolean) {
    if (draft.value === undefined || draft.value === null) {
      return
    }

    if (value && (draft.value.publish_at === null || draft.value.publish_at === undefined)) {
      draft.value.publish_at = currentDateTimeValue()
      return
    }

    if (!value) {
      draft.value.publish_at = null
    }
  }
})

const closingEnabled = computed<boolean>({
  get() {
    return draft.value?.pause_at !== null && draft.value?.pause_at !== undefined
  },
  set(value: boolean) {
    if (draft.value === undefined || draft.value === null) {
      return
    }

    if (value && (draft.value.pause_at === null || draft.value.pause_at === undefined)) {
      draft.value.pause_at = currentDateTimeValue()
      return
    }

    if (!value) {
      draft.value.pause_at = null
    }
  }
})

const responseLimitEnabled = computed<boolean>({
  get() {
    return draft.value?.response_limit !== null && draft.value?.response_limit !== undefined
  },
  set(value: boolean) {
    if (draft.value === undefined || draft.value === null) {
      return
    }

    if (value && (draft.value.response_limit === null || draft.value.response_limit === undefined)) {
      draft.value.response_limit = 1
      return
    }

    if (!value) {
      draft.value.response_limit = null
    }
  }
})

const submissionPinEnabled = computed<boolean>({
  get() {
    return draft.value?.submission_code_required === true
  },
  set(value: boolean) {
    if (draft.value === undefined || draft.value === null) {
      return
    }

    draft.value.submission_code_required = value

    if (!value) {
      draft.value.submission_code = null
    }
  }
})

const submissionPinValue = computed<string>({
  get() {
    return typeof draft.value?.submission_code === 'string' ? draft.value.submission_code : ''
  },
  set(value: string) {
    if (draft.value === undefined || draft.value === null) {
      return
    }

    draft.value.submission_code = value
  }
})

const publicUrlValue = computed<string>(() => {
  return typeof draft.value?.public_url === 'string' ? draft.value.public_url : ''
})

function ensureSubmissionApi(): Record<string, unknown> {
  if (draft.value === undefined || draft.value === null) {
    return {}
  }

  if (typeof draft.value.api !== 'object' || draft.value.api === null || Array.isArray(draft.value.api)) {
    draft.value.api = {}
  }

  const api = draft.value.api as Record<string, unknown>

  if (typeof api.submission !== 'object' || api.submission === null || Array.isArray(api.submission)) {
    api.submission = {}
  }

  return api.submission as Record<string, unknown>
}

const submissionIsPublic = computed<boolean>({
  get() {
    const api = draft.value?.api

    if (typeof api !== 'object' || api === null || Array.isArray(api)) {
      return true
    }

    const submission = api.submission

    if (typeof submission !== 'object' || submission === null || Array.isArray(submission)) {
      return true
    }

    if (typeof submission.public === 'boolean') {
      return submission.public
    }

    if (typeof submission.auth === 'string') {
      return submission.auth === 'public'
    }

    return true
  },
  set(value: boolean) {
    const submission = ensureSubmissionApi()
    submission.public = value
    submission.auth = value ? 'public' : 'required'
  }
})

const builderTabs = computed<Array<{ label: string, icon: string, slot: 'builder' | 'settings' }>>(() => {
  const items: Array<{ label: string, icon: string, slot: 'builder' | 'settings' }> = [
    {
      label: t('builder.tabs.builder'),
      icon: 'i-lucide-layout-grid',
      slot: 'builder'
    }
  ]

  if (!settingsHidden.value) {
    items.push({
      label: t('builder.tabs.settings'),
      icon: 'i-lucide-settings-2',
      slot: 'settings'
    })
  }

  return items
})

const selectedPageKey = ref<string | null>(safePages.value[0]?.page_key ?? null)
const selectedFieldKey = ref<string | null>(safePages.value[0]?.fields[0]?.field_key ?? null)

const fieldTypeMeta = computed<Record<FormForgeFieldType, { label: string, icon: string }>>(() => ({
  text: { label: t('builder.fieldType.text'), icon: 'i-lucide-text-cursor-input' },
  textarea: { label: t('builder.fieldType.textarea'), icon: 'i-lucide-align-left' },
  email: { label: t('builder.fieldType.email'), icon: 'i-lucide-mail' },
  number: { label: t('builder.fieldType.number'), icon: 'i-lucide-hash' },
  select: { label: t('builder.fieldType.select'), icon: 'i-lucide-list' },
  select_menu: { label: t('builder.fieldType.select_menu'), icon: 'i-lucide-list-filter' },
  radio: { label: t('builder.fieldType.radio'), icon: 'i-lucide-circle-dot' },
  checkbox: { label: t('builder.fieldType.checkbox'), icon: 'i-lucide-check-square' },
  consent: { label: t('builder.fieldType.consent'), icon: 'i-lucide-badge-check' },
  checkbox_group: { label: t('builder.fieldType.checkbox_group'), icon: 'i-lucide-list-checks' },
  address: { label: t('builder.fieldType.address'), icon: 'i-lucide-house' },
  switch: { label: t('builder.fieldType.switch'), icon: 'i-lucide-toggle-left' },
  temporal: { label: t('builder.fieldType.temporal'), icon: 'i-lucide-calendar-clock' },
  date: { label: t('builder.fieldType.date'), icon: 'i-lucide-calendar' },
  time: { label: t('builder.fieldType.time'), icon: 'i-lucide-clock-3' },
  file: { label: t('builder.fieldType.file'), icon: 'i-lucide-paperclip' }
}))

const fieldTypeItems = computed(() => FORM_FORGE_BUILDER_FIELD_TYPES.map((type) => ({
  label: fieldTypeMeta.value[type].label,
  value: type,
  icon: fieldTypeMeta.value[type].icon
})))

function normalizeLoadedPageLogic(pages: FormForgePageSchema[]): void {
  if (!Array.isArray(pages)) {
    return
  }

  for (const page of pages) {
    if (page === undefined || page === null) {
      continue
    }

    ensurePageLogic(page)
  }
}

function syncSelectionWithDraft(pages: FormForgePageSchema[]): void {
  if (pages.length === 0) {
    selectedPageKey.value = null
    selectedFieldKey.value = null
    return
  }

  const nextPage = selectedPageKey.value === null
    ? pages[0]
    : pages.find((page) => page.page_key === selectedPageKey.value) ?? pages[0]

  selectedPageKey.value = nextPage.page_key

  const fields = Array.isArray(nextPage.fields)
    ? nextPage.fields.filter((field) => field !== undefined && field !== null)
    : []

  if (fields.length === 0) {
    selectedFieldKey.value = null
    return
  }

  if (selectedFieldKey.value === null) {
    return
  }

  const nextField = fields.find((field) => field.field_key === selectedFieldKey.value) ?? fields[0]

  selectedFieldKey.value = nextField.field_key
}

function selectField(page: FormForgePageSchema, fieldKey: string): void {
  selectedPageKey.value = page.page_key
  selectedFieldKey.value = fieldKey
}

function findPage(pageKey: string): FormForgePageSchema | undefined {
  return safePages.value.find((page) => page.page_key === pageKey)
}

function selectFieldByKey(pageKey: string, fieldKey: string): void {
  const page = findPage(pageKey)

  if (page === undefined) {
    return
  }

  if (selectedPageKey.value === pageKey && selectedFieldKey.value === fieldKey) {
    selectedFieldKey.value = null

    return
  }

  selectField(page, fieldKey)
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

function resolveLoadedFormUuid(): string | null {
  const fromProps = typeof props.formUuid === 'string' && props.formUuid !== '' ? props.formUuid : null
  if (fromProps !== null) {
    return fromProps
  }

  const fromLoadKey = typeof props.loadFormKey === 'string' && isUuidLike(props.loadFormKey)
    ? props.loadFormKey
    : null

  if (fromLoadKey !== null) {
    return fromLoadKey
  }

  return typeof draft.value?.uuid === 'string' && draft.value.uuid !== '' ? draft.value.uuid : null
}

function applyLoadedForm(schema: FormForgeFormSchema): void {
  const nextUuid = resolveLoadedFormUuid()

  draft.value = {
    uuid: nextUuid,
    key: schema.key,
    schema_version: schema.schema_version ?? 1,
    title: schema.title,
    publish_at: schema.publish_at ?? null,
    pause_at: schema.pause_at ?? null,
    response_limit: schema.response_limit ?? null,
    submission_code_required: schema.submission_code_required === true,
    submission_code: null,
    public_url: schema.public_url ?? null,
    category: schema.category ?? null,
    pages: cloneValue(schema.pages),
    conditions: cloneValue(schema.conditions),
    drafts: cloneValue(schema.drafts),
    api: cloneValue(schema.api ?? {})
  }

  normalizeLoadedPageLogic(draft.value.pages)

  isPublished.value = schema.is_published === true
}

async function loadFormIntoBuilder(key: string, version?: string): Promise<void> {
  const requestId = ++loadRequestId
  loadingRemoteForm.value = true

  try {
    const schema = version !== undefined && version !== ''
      ? await builder.client.getFormVersion(key, version, { endpoint: props.endpoint })
      : await builder.client.getForm(key, { endpoint: props.endpoint })

    if (requestId !== loadRequestId) {
      return
    }

    applyLoadedForm(schema)

    nextTick(() => {
      syncSelectionWithDraft(safePages.value)
    })
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : t('builder.error.loadForm')
    emit('error', message)
  } finally {
    if (requestId === loadRequestId) {
      loadingRemoteForm.value = false
    }
  }
}

async function loadFormRouteIntoBuilder(routeKey: string, version?: string): Promise<void> {
  const forms = await builder.client.listFormRoute(routeKey, {
    endpoint: props.endpoint
  })
  const first = forms[0]
  const key = typeof first?.key === 'string' ? first.key : ''
  if (key === '') {
    return
  }
  await loadFormIntoBuilder(key, version)
}

function addField(pageKey: string, type: FormForgeFieldType): void {
  builder.addField(pageKey, type)
  builder.normalizeFieldLocations()

  const page = safePages.value.find((candidate) => candidate.page_key === pageKey)
  const nextField = page?.fields.at(-1)

  if (page !== undefined && nextField !== undefined) {
    selectField(page, nextField.field_key)
  }
}

function addPage(type: FormForgeFieldType = 'text'): void {
  const page = builder.addPage(type)
  const firstField = page.fields[0]

  selectedPageKey.value = page.page_key
  selectedFieldKey.value = firstField?.field_key ?? null
}

function onFieldTypeChange(field: FormForgeFieldSchema, nextType: FormForgeFieldType): void {
  if (field.type === nextType) {
    return
  }

  normalizeFormForgeFieldTypeChange(field, nextType, locale.value)
}

async function save(): Promise<void> {
  try {
    const shouldAutoPublish = props.defaultPublished || props.autoPublishOnSave
    await builder.save({
      autoPublish: shouldAutoPublish
    })

    if (shouldAutoPublish) {
      const wasPublished = isPublished.value
      isPublished.value = true
      if (!wasPublished) {
        emit('publish', draft.value)
      }
    }

    emit('save', draft.value)
    toast.add({
      title: t('builder.toast.saveSuccess'),
      color: 'success'
    })
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : t('builder.error.save')
    emit('error', message)
  }
}

async function publish(): Promise<void> {
  try {
    await builder.publish()
    isPublished.value = true
    emit('publish', draft.value)
    toast.add({
      title: t('builder.toast.publishSuccess'),
      color: 'success'
    })
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : t('builder.error.publish')
    emit('error', message)
  }
}

async function unpublish(): Promise<void> {
  try {
    await builder.unpublish()
    isPublished.value = false
    emit('unpublish', draft.value)
    toast.add({
      title: t('builder.toast.unpublishSuccess'),
      color: 'success'
    })
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : t('builder.error.unpublish')
    emit('error', message)
  }
}

const publishButtonLabel = computed<string>(() => {
  if (props.defaultPublished) {
    return t('builder.publish')
  }

  return isPublished.value ? t('builder.unpublish') : t('builder.publish')
})

const publishButtonColor = computed<'primary' | 'neutral'>(() => {
  if (props.defaultPublished) {
    return 'primary'
  }

  return isPublished.value ? 'neutral' : 'primary'
})

const publishButtonVariant = computed<'solid' | 'soft'>(() => {
  if (props.defaultPublished) {
    return 'solid'
  }

  return isPublished.value ? 'soft' : 'solid'
})

const canTogglePublish = computed<boolean>(() => {
  if (props.readonly) {
    return false
  }

  if (props.defaultPublished && isPublished.value) {
    return false
  }

  if (draftMutationIdentifier.value === null) {
    return false
  }

  if (!isPublished.value && !publishable.value) {
    return false
  }

  return true
})

async function togglePublishState(): Promise<void> {
  if (!props.defaultPublished && isPublished.value) {
    await unpublish()
    return
  }

  await publish()
}

function removeField(page: FormForgePageSchema, fieldKey: string): void {
  builder.removeField(page.page_key, fieldKey)
  if (selectedFieldKey.value === fieldKey) {
    selectedFieldKey.value = null
  }
}

function removeFieldByKey(pageKey: string, fieldKey: string): void {
  const page = findPage(pageKey)
  if (page === undefined) {
    return
  }

  removeField(page, fieldKey)
}

function duplicateFieldByKey(pageKey: string, fieldKey: string): void {
  const page = findPage(pageKey)
  if (page === undefined) {
    return
  }

  duplicateField(page, fieldKey)
}

function moveFieldByKey(pageKey: string, fieldKey: string, direction: -1 | 1): void {
  builder.moveField(pageKey, fieldKey, direction)
}

function changeFieldTypeByKey(pageKey: string, fieldKey: string, nextType: FormForgeFieldType): void {
  const page = findPage(pageKey)
  if (page === undefined) {
    return
  }

  const field = page.fields.find((item) => item.field_key === fieldKey)
  if (field === undefined) {
    return
  }

  onFieldTypeChange(field, nextType)
}

function addFieldBelowByKey(pageKey: string, fieldKey: string, type: FormForgeFieldType): void {
  builder.insertFieldAfter(pageKey, fieldKey, type)
  builder.normalizeFieldLocations()
}

function moveFieldToBlockByKey(pageKey: string, fieldKey: string, targetPageKey: string): void {
  builder.moveFieldToPage(pageKey, fieldKey, targetPageKey)
  builder.normalizeFieldLocations()
}

async function openCategoryCreateModal(): Promise<void> {
  if (props.readonly) {
    return
  }

  try {
    const createCategoryModal = overlay.create(FormForgeCategoryCreateModal, {
      destroyOnClose: true
    })
    const result = await createCategoryModal.open({
      locale: props.locale,
      endpoint: props.endpoint,
      categoryRouteKey: props.categoryRouteKey
    })

    if (!isFormForgeCategory(result)) {
      return
    }

    categoryManager.list.value = [result, ...categoryManager.list.value.filter((item) => item.key !== result.key)]
    draftCategory.value = result.key
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : t('builder.error.categoryCreate')
    emit('error', message)
  }
}

function duplicateField(page: FormForgePageSchema, fieldKey: string): void {
  builder.duplicateField(page.page_key, fieldKey)
  builder.normalizeFieldLocations()
}

watch(() => props.modelValue, (value) => {
  if (value === null || value === undefined || typeof value !== 'object') {
    isPublished.value = props.defaultPublished
    return
  }

  const candidate = value as Record<string, unknown>
  if (candidate.is_published === true) {
    isPublished.value = true
    return
  }

  if (candidate.is_published === false) {
    isPublished.value = false
    return
  }

  isPublished.value = props.defaultPublished
}, {
  immediate: true,
  deep: false
})

watch(() => props.defaultPublished, (value) => {
  if (typeof props.modelValue === 'object' && props.modelValue !== null && 'is_published' in props.modelValue) {
    return
  }

  isPublished.value = value
})

watch(() => draft.value, (value) => {
  emit('update:modelValue', value)
}, {
  deep: true
})

watch(() => props.autosave, (value) => {
  builder.autosaveEnabled.value = value
  if (!value) {
    builder.clearAutosave()
  }
}, {
  immediate: true
})

watch(() => props.autosaveDelay, (value) => {
  builder.autosaveDelay.value = value
}, {
  immediate: true
})

watch(() => props.autoPublishOnSave, (value) => {
  builder.autoPublishOnSave.value = value
}, {
  immediate: true
})

watch(() => [props.loadFormKey, props.loadFormVersion] as const, ([key, version]) => {
  if (typeof key !== 'string' || key === '') {
    return
  }

  loadFormIntoBuilder(key, version)
}, {
  immediate: true
})

watch(() => [props.formRouteKey, props.loadFormKey, props.loadFormVersion] as const, ([routeKey, loadKey, version]) => {
  if (typeof loadKey === 'string' && loadKey !== '') {
    return
  }
  if (typeof routeKey !== 'string' || routeKey === '') {
    return
  }
  loadFormRouteIntoBuilder(routeKey, version)
}, {
  immediate: true
})

watch(() => safePages.value, (pages) => {
  syncSelectionWithDraft(pages)
}, {
  deep: true,
  immediate: true
})

watch(
  () => [selectedPageKey.value, selectedFieldKey.value] as const,
  ([pageKey, fieldKey]) => {
    emit('selection-change', pageKey, fieldKey)
  },
  {
    immediate: true
  }
)

watch(settingsHidden, (value) => {
  if (value) {
    selectedTab.value = 'builder'
  }
}, {
  immediate: true
})

const builderExpose = {
  save,
  publish,
  unpublish,
  togglePublishState
} satisfies FormForgeBuilderExpose

defineExpose(builderExpose)
</script>

<template>
  <div
    class="w-full"
  >
    <div :class="builderLayoutClass">
      <div
        class="grid min-w-0 gap-6"
      >
        <template v-if="!settingsHidden">
          <UTabs
            v-model="selectedTab"
            :items="builderTabs"
            value-key="slot"
            class="w-full"
            :ui="{
              list: 'w-full',
              trigger: 'flex-1 justify-center'
            }"
          >
            <template #builder>
              <div class="grid gap-6">
                <Draggable
                  v-model="draftPages"
                  item-key="page_key"
                  handle=".page-drag-handle"
                  group="formforge-pages"
                  class="grid gap-6"
                >
                  <template #item="{ element: page, index }">
                    <FormForgeBuilderBlockCard
                      :page="page"
                      :pages="safePages"
                      :page-index="index"
                      :total-pages="safePages.length"
                      :selected-field-key="selectedFieldKey"
                      :readonly="readonly"
                      :field-type-items="fieldTypeItems"
                      @select-field="selectFieldByKey"
                      @move-page="builder.movePage"
                      @duplicate-page="builder.duplicatePage"
                      @remove-page="builder.removePage"
                      @add-question="addField"
                      @move-field="moveFieldByKey"
                      @duplicate-field="duplicateFieldByKey"
                      @remove-field="removeFieldByKey"
                      @change-field-type="changeFieldTypeByKey"
                      @add-field-below="addFieldBelowByKey"
                      @move-field-to-block="moveFieldToBlockByKey"
                    />
                  </template>
                </Draggable>
              </div>
            </template>

            <template #settings>
              <UCard variant="subtle">
                <template #header>
                  <div class="space-y-1">
                    <p class="text-sm font-semibold text-default">
                      {{ t('builder.settings.title') }}
                    </p>
                    <p class="text-sm text-muted">
                      {{ t('builder.settings.description') }}
                    </p>
                  </div>
                </template>

                <div class="space-y-6">
                  <div
                    v-if="!disableTitleInput || !disableCategoryControl"
                    class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]"
                  >
                    <UInput
                      v-if="!disableTitleInput"
                      v-model="draftTitle"
                      :disabled="readonly"
                      :placeholder="t('builder.settings.formTitlePlaceholder')"
                      :ui="{ base: 'w-full' }"
                    />
                    <div
                      v-if="!disableCategoryControl"
                      class="flex flex-row items-center gap-2"
                    >
                      <USelect
                        v-model="draftCategorySelectValue"
                        :items="categorySelectItems"
                        :disabled="readonly"
                        :placeholder="t('builder.settings.categoryPlaceholder')"
                        :ui="{
                          base: 'w-full'
                        }"
                      />
                      <UTooltip :text="t('builder.tooltip.addCategory')">
                        <UButton
                          color="neutral"
                          variant="soft"
                          icon="i-lucide-folder-plus"
                          :disabled="readonly"
                          @click="openCategoryCreateModal"
                        />
                      </UTooltip>
                    </div>
                  </div>

                  <div class="grid gap-6">
                    <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div class="space-y-1">
                        <p class="text-sm font-semibold text-default">
                          {{ t('builder.settings.opening.title') }}
                        </p>
                        <p class="text-sm text-muted">
                          {{ t('builder.settings.opening.description') }}
                        </p>
                      </div>
                      <USwitch
                        v-model="openingEnabled"
                        :disabled="readonly"
                      />
                    </div>

                    <div
                      v-if="openingEnabled"
                      class="grid gap-4 sm:grid-cols-2"
                    >
                      <UFormField :label="t('builder.settings.opening.date')">
                        <UInputDate
                          v-model="publishAtDate"
                          :disabled="readonly"
                          :ui="{ base: 'w-full' }"
                        />
                      </UFormField>
                      <UFormField :label="t('builder.settings.opening.time')">
                        <UInputTime
                          v-model="publishAtTime"
                          :disabled="readonly"
                          :hour-cycle="24"
                          :ui="{ base: 'w-full' }"
                        />
                      </UFormField>
                    </div>
                  </div>

                  <div class="grid gap-6">
                    <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div class="space-y-1">
                        <p class="text-sm font-semibold text-default">
                          {{ t('builder.settings.closing.title') }}
                        </p>
                        <p class="text-sm text-muted">
                          {{ t('builder.settings.closing.description') }}
                        </p>
                      </div>
                      <USwitch
                        v-model="closingEnabled"
                        :disabled="readonly"
                      />
                    </div>

                    <div
                      v-if="closingEnabled"
                      class="grid gap-4 sm:grid-cols-2"
                    >
                      <UFormField :label="t('builder.settings.closing.date')">
                        <UInputDate
                          v-model="pauseAtDate"
                          :disabled="readonly"
                          :ui="{ base: 'w-full' }"
                        />
                      </UFormField>
                      <UFormField :label="t('builder.settings.closing.time')">
                        <UInputTime
                          v-model="pauseAtTime"
                          :disabled="readonly"
                          :hour-cycle="24"
                          :ui="{ base: 'w-full' }"
                        />
                      </UFormField>
                    </div>
                  </div>

                  <div class="grid gap-6">
                    <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div class="space-y-1">
                        <p class="text-sm font-semibold text-default">
                          {{ t('builder.settings.submissionLimit.title') }}
                        </p>
                        <p class="text-sm text-muted">
                          {{ t('builder.settings.submissionLimit.description') }}
                        </p>
                      </div>
                      <USwitch
                        v-model="responseLimitEnabled"
                        :disabled="readonly"
                      />
                    </div>

                    <UFormField
                      v-if="responseLimitEnabled"
                      :label="t('builder.settings.submissionLimit.maximumResponses')"
                    >
                      <UInputNumber
                        v-model="responseLimitValue"
                        :disabled="readonly"
                        :min="1"
                        :ui="{ base: 'w-full' }"
                      />
                    </UFormField>
                  </div>

                  <div class="grid gap-6">
                    <div class="space-y-1">
                      <p class="text-sm font-semibold text-default">
                        {{ t('builder.settings.access.title') }}
                      </p>
                      <p class="text-sm text-muted">
                        {{ t('builder.settings.access.description') }}
                      </p>
                    </div>

                    <div class="grid gap-4">
                      <div class="flex items-start justify-between gap-4">
                        <div class="space-y-1">
                          <p class="text-sm font-medium text-default">
                            {{ t('builder.settings.access.publicForm.title') }}
                          </p>
                          <p class="text-sm text-muted">
                            {{ t('builder.settings.access.publicForm.description') }}
                          </p>
                        </div>
                        <USwitch
                          v-model="submissionIsPublic"
                          :disabled="readonly"
                        />
                      </div>

                      <div v-if="submissionIsPublic">
                        <UFormField :label="t('builder.settings.access.publicLink')">
                          <UInput
                            :model-value="publicUrlValue"
                            disabled
                            :placeholder="t('builder.settings.access.publicLinkPlaceholder')"
                            :ui="{ base: 'w-full' }"
                          />
                        </UFormField>
                      </div>

                      <div class="flex items-start justify-between gap-4 border-t border-muted pt-4">
                        <div class="space-y-1">
                          <p class="text-sm font-medium text-default">
                            {{ t('builder.settings.access.pinProtection.title') }}
                          </p>
                          <p class="text-sm text-muted">
                            {{ t('builder.settings.access.pinProtection.description') }}
                          </p>
                        </div>
                        <USwitch
                          v-model="submissionPinEnabled"
                          :disabled="readonly"
                        />
                      </div>

                      <div v-if="submissionPinEnabled">
                        <UFormField :label="t('builder.settings.access.pin')">
                          <UInput
                            v-model="submissionPinValue"
                            :disabled="readonly"
                            type="password"
                            :placeholder="t('builder.settings.access.pinPlaceholder')"
                            :ui="{ base: 'w-full' }"
                          />
                        </UFormField>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-muted pt-4">
                    <div class="flex flex-wrap gap-2 text-sm text-muted">
                      <span v-if="loadingRemoteForm">{{ t('builder.loadingForm') }}</span>
                      <span v-if="formattedLastSavedAt !== null">{{ t('builder.lastSave', { value: formattedLastSavedAt }) }}</span>
                      <span
                        v-if="builderError !== null"
                        class="text-error"
                      >{{ builderError }}</span>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                      <UButton
                        :loading="saving"
                        :disabled="readonly"
                        @click="save"
                      >
                        {{ t('builder.save') }}
                      </UButton>
                      <UButton
                        v-if="!disablePublishAction && !defaultPublished"
                        :color="publishButtonColor"
                        :variant="publishButtonVariant"
                        :loading="publishing"
                        :disabled="!canTogglePublish"
                        @click="togglePublishState"
                      >
                        {{ publishButtonLabel }}
                      </UButton>
                    </div>
                  </div>
                </div>
              </UCard>
            </template>
          </UTabs>
        </template>

        <div
          v-else
          class="grid gap-6"
        >
          <Draggable
            v-model="draftPages"
            item-key="page_key"
            handle=".page-drag-handle"
            group="formforge-pages"
            class="grid gap-6"
          >
            <template #item="{ element: page, index }">
              <FormForgeBuilderBlockCard
                :page="page"
                :pages="safePages"
                :page-index="index"
                :total-pages="safePages.length"
                :selected-field-key="selectedFieldKey"
                :readonly="readonly"
                :field-type-items="fieldTypeItems"
                @select-field="selectFieldByKey"
                @move-page="builder.movePage"
                @duplicate-page="builder.duplicatePage"
                @remove-page="builder.removePage"
                @add-question="addField"
                @move-field="moveFieldByKey"
                @duplicate-field="duplicateFieldByKey"
                @remove-field="removeFieldByKey"
                @change-field-type="changeFieldTypeByKey"
                @add-field-below="addFieldBelowByKey"
                @move-field-to-block="moveFieldToBlockByKey"
              />
            </template>
          </Draggable>
        </div>
      </div>
    </div>
  </div>
  <div
    v-if="loadingRemoteForm"
    class="space-y-6"
  >
    <UCard>
      <div class="text-sm text-gray-500">
        {{ t('builder.loadingBuilder') }}
      </div>
    </UCard>
  </div>
</template>
