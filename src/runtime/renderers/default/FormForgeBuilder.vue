<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from '#imports'
import { useOverlay } from '@nuxt/ui/composables/useOverlay'
import Draggable from 'vuedraggable'
import {
  FORM_FORGE_BUILDER_CONDITION_ACTIONS,
  FORM_FORGE_BUILDER_CONDITION_MATCHES,
  FORM_FORGE_BUILDER_CONDITION_OPERATORS,
  FORM_FORGE_BUILDER_FIELD_TYPES,
  useFormForgeBuilder
} from '../../composables/useFormForgeBuilder'
import { useFormForgeCategory, useFormForgeCategoryOptions } from '../../composables/useFormForgeCategory'
import { useFormForgeI18n } from '../../composables/useFormForgeI18n'
import type {
  FormForgeBuilderDraft,
  UseFormForgeBuilderOptions
} from '../../composables/useFormForgeBuilder'
import type { FormForgeCondition, FormForgeFieldOption, FormForgeFieldSchema, FormForgeFieldType, FormForgeFormSchema, FormForgePageSchema } from '../../types'
import type { FormForgeCategory, FormForgeCategorySelectOption } from '../../types'
import FormForgeCategoryCreateModal from './FormForgeCategoryCreateModal.vue'

interface Props {
  formUuid?: string
  formKey?: string
  endpoint?: string
  loadFormKey?: string
  loadFormVersion?: string
  locale?: string
  modelValue?: Partial<FormForgeBuilderDraft>
  autosave?: boolean
  autosaveDelay?: number
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  formUuid: undefined,
  formKey: undefined,
  endpoint: undefined,
  loadFormKey: undefined,
  loadFormVersion: undefined,
  locale: undefined,
  modelValue: undefined,
  autosave: true,
  autosaveDelay: 5000,
  readonly: false
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: FormForgeBuilderDraft): void
  (event: 'save', value: FormForgeBuilderDraft): void
  (event: 'publish', value: FormForgeBuilderDraft): void
  (event: 'unpublish', value: FormForgeBuilderDraft): void
  (event: 'error', value: string): void
}>()

const builderOptions: UseFormForgeBuilderOptions = {
  formUuid: props.formUuid,
  formKey: props.formKey,
  endpoint: props.endpoint,
  initial: props.modelValue,
  autosave: props.autosave,
  autosaveDelay: props.autosaveDelay
}

const builder = useFormForgeBuilder(builderOptions)
const { t } = useFormForgeI18n({
  locale: () => props.locale
})
const draft = builder.draft
const isClientReady = ref<boolean>(false)
const saving = builder.saving
const publishing = builder.publishing
const publishable = builder.publishable
const lastSavedAt = builder.lastSavedAt
const builderError = builder.error
const overlay = useOverlay()
const categoryManager = useFormForgeCategory({
  immediate: true,
  initialQuery: {
    per_page: 200
  },
  endpoint: props.endpoint
})
const categoryOptions = useFormForgeCategoryOptions({
  source: categoryManager,
  includeInactive: true
})
const CATEGORY_NONE_VALUE = '__formforge_no_category__'

const fieldElements = new Map<string, HTMLElement>()
const builderRootElement = ref<HTMLElement | null>(null)
const builderColumnElement = ref<HTMLElement | null>(null)
const railTop = ref<number>(120)
const railLeft = ref<number>(0)
const loadingRemoteForm = ref<boolean>(false)
let loadRequestId = 0

const safePages = computed<FormForgePageSchema[]>(() => {
  const pages = draft.value?.pages
  if (!Array.isArray(pages)) {
    return []
  }

  return pages.filter((page): page is FormForgePageSchema => page !== undefined && page !== null)
})

const safeConditions = computed<FormForgeCondition[]>(() => {
  const conditions = draft.value?.conditions
  if (!Array.isArray(conditions)) {
    return []
  }

  return conditions.filter((condition): condition is FormForgeCondition => condition !== undefined && condition !== null)
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
  checkbox_group: { label: t('builder.fieldType.checkbox_group'), icon: 'i-lucide-list-checks' },
  switch: { label: t('builder.fieldType.switch'), icon: 'i-lucide-toggle-left' },
  date: { label: t('builder.fieldType.date'), icon: 'i-lucide-calendar' },
  time: { label: t('builder.fieldType.time'), icon: 'i-lucide-clock-3' },
  datetime: { label: t('builder.fieldType.datetime'), icon: 'i-lucide-calendar-clock' },
  date_range: { label: t('builder.fieldType.date_range'), icon: 'i-lucide-calendar-range' },
  datetime_range: { label: t('builder.fieldType.datetime_range'), icon: 'i-lucide-calendar-range' },
  file: { label: t('builder.fieldType.file'), icon: 'i-lucide-paperclip' }
}))

const fieldTypeItems = computed(() => FORM_FORGE_BUILDER_FIELD_TYPES.map((type) => ({
  label: fieldTypeMeta.value[type].label,
  value: type,
  icon: fieldTypeMeta.value[type].icon
})))

function conditionActionLabel(action: typeof FORM_FORGE_BUILDER_CONDITION_ACTIONS[number]): string {
  const labels: Record<typeof FORM_FORGE_BUILDER_CONDITION_ACTIONS[number], string> = {
    show: t('builder.condition.action.show'),
    hide: t('builder.condition.action.hide'),
    skip: t('builder.condition.action.skip'),
    require: t('builder.condition.action.require'),
    disable: t('builder.condition.action.disable')
  }

  return labels[action]
}

function conditionMatchLabel(match: typeof FORM_FORGE_BUILDER_CONDITION_MATCHES[number]): string {
  const labels: Record<typeof FORM_FORGE_BUILDER_CONDITION_MATCHES[number], string> = {
    all: t('builder.condition.match.all'),
    any: t('builder.condition.match.any')
  }

  return labels[match]
}

function conditionOperatorLabel(operator: typeof FORM_FORGE_BUILDER_CONDITION_OPERATORS[number]): string {
  const labels: Record<typeof FORM_FORGE_BUILDER_CONDITION_OPERATORS[number], string> = {
    eq: t('builder.condition.operator.eq'),
    neq: t('builder.condition.operator.neq'),
    in: t('builder.condition.operator.in'),
    not_in: t('builder.condition.operator.not_in'),
    gt: t('builder.condition.operator.gt'),
    gte: t('builder.condition.operator.gte'),
    lt: t('builder.condition.operator.lt'),
    lte: t('builder.condition.operator.lte'),
    contains: t('builder.condition.operator.contains'),
    not_contains: t('builder.condition.operator.not_contains'),
    is_empty: t('builder.condition.operator.is_empty'),
    not_empty: t('builder.condition.operator.not_empty')
  }

  return labels[operator]
}

const conditionActionItems = computed(() => FORM_FORGE_BUILDER_CONDITION_ACTIONS.map((action) => ({
  label: conditionActionLabel(action),
  value: action
})))

const conditionMatchItems = computed(() => FORM_FORGE_BUILDER_CONDITION_MATCHES.map((match) => ({
  label: conditionMatchLabel(match),
  value: match
})))

const conditionOperatorItems = computed(() => FORM_FORGE_BUILDER_CONDITION_OPERATORS.map((operator) => ({
  label: conditionOperatorLabel(operator),
  value: operator
})))

const targetTypeItems = computed(() => [
  { label: t('builder.targetType.page'), value: 'page' },
  { label: t('builder.targetType.field'), value: 'field' }
])

const pageTargetItems = computed(() => {
  const items: Array<{ label: string, value: string }> = []

  for (const maybePage of safePages.value) {
    const title = typeof maybePage.title === 'string' ? maybePage.title : ''
    items.push({
      label: title === '' ? maybePage.page_key : `${title} (${maybePage.page_key})`,
      value: maybePage.page_key
    })
  }

  return items
})

const fieldTargetItems = computed(() => {
  const items: Array<{ label: string, value: string }> = []

  for (const maybePage of safePages.value) {
    if (!Array.isArray(maybePage.fields)) {
      continue
    }

    for (const maybeField of maybePage.fields) {
      const label = maybeField.label === undefined || maybeField.label === '' ? maybeField.field_key : `${maybeField.label} (${maybeField.field_key})`
      items.push({
        label,
        value: maybeField.field_key
      })
    }
  }

  return items
})

function selectedPage(): FormForgePageSchema | undefined {
  if (selectedPageKey.value === null) {
    return safePages.value[0]
  }

  return safePages.value.find((page) => page.page_key === selectedPageKey.value) ?? safePages.value[0]
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

  const nextField = selectedFieldKey.value === null
    ? fields[0]
    : fields.find((field) => field.field_key === selectedFieldKey.value) ?? fields[0]

  selectedFieldKey.value = nextField.field_key
}

function resolveHTMLElement(element: unknown): HTMLElement | null {
  if (element instanceof HTMLElement) {
    return element
  }

  if (typeof element !== 'object' || element === null || !('$el' in element)) {
    return null
  }

  const componentElement = (element as { $el?: unknown }).$el
  return componentElement instanceof HTMLElement ? componentElement : null
}

function registerFieldElement(fieldKey: string, element: unknown): void {
  const htmlElement = resolveHTMLElement(element)

  if (htmlElement !== null) {
    fieldElements.set(fieldKey, htmlElement)
    if (fieldKey === selectedFieldKey.value) {
      nextTick(() => {
        updateRailPosition()
      })
    }
    return
  }

  fieldElements.delete(fieldKey)
}

function updateRailPosition(): void {
  if (!isClientReady.value || typeof window === 'undefined') {
    return
  }

  const rootElement = builderRootElement.value

  if (rootElement === null) {
    return
  }

  const rootRect = rootElement.getBoundingClientRect()
  const columnRect = builderColumnElement.value?.getBoundingClientRect() ?? rootRect
  const selectedElement = selectedFieldKey.value === null
    ? undefined
    : fieldElements.get(selectedFieldKey.value)
  const selectedRect = selectedElement?.getBoundingClientRect()

  if (window.innerWidth <= 1024) {
    railLeft.value = 0
    return
  }

  const railWidth = 68
  const horizontalGap = 14
  const minLeft = 8
  const maxLeft = window.innerWidth - railWidth - 8
  const horizontalAnchor = selectedRect?.right ?? columnRect.right
  const desiredLeft = horizontalAnchor + horizontalGap

  railLeft.value = Math.min(Math.max(desiredLeft, minLeft), maxLeft)

  const railHeight = 122
  const minTop = Math.max(88, columnRect.top + 8)
  const maxTop = Math.max(minTop, Math.min(window.innerHeight - railHeight - 12, columnRect.bottom - railHeight - 8))

  if (selectedRect === undefined) {
    railTop.value = minTop
    return
  }

  const desiredTop = selectedRect.top + (selectedRect.height / 2) - (railHeight / 2)

  railTop.value = Math.min(Math.max(desiredTop, minTop), maxTop)
}

onMounted(() => {
  isClientReady.value = true
  window.addEventListener('scroll', updateRailPosition, { passive: true })
  window.addEventListener('resize', updateRailPosition)

  nextTick(() => {
    syncSelectionWithDraft(safePages.value)
    updateRailPosition()
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateRailPosition)
  window.removeEventListener('resize', updateRailPosition)
  fieldElements.clear()
})

function selectField(page: FormForgePageSchema, fieldKey: string): void {
  selectedPageKey.value = page.page_key
  selectedFieldKey.value = fieldKey

  nextTick(() => {
    updateRailPosition()
  })
}

function updatePageTitle(page: FormForgePageSchema | undefined, value: string): void {
  if (page === undefined) {
    return
  }

  page.title = value
}

function readPageTitle(page: FormForgePageSchema | undefined): string {
  if (page === undefined || page === null) {
    return ''
  }

  return typeof page.title === 'string' ? page.title : ''
}

function pageOrder(page: FormForgePageSchema): number {
  const index = safePages.value.findIndex((item) => item.page_key === page.page_key)
  return index < 0 ? 1 : index + 1
}

function canMergeWithPreviousPage(page: FormForgePageSchema): boolean {
  return safePages.value.length > 1 && pageOrder(page) > 1
}

function mergePageWithPrevious(page: FormForgePageSchema): void {
  builder.mergePageWithPrevious(page.page_key)

  nextTick(() => {
    syncSelectionWithDraft(safePages.value)
    updateRailPosition()
  })
}

function isFieldSelected(fieldKey: string): boolean {
  return selectedFieldKey.value === fieldKey
}

function showInlinePreview(field: FormForgeFieldSchema): boolean {
  return field.type === 'text' || field.type === 'textarea' || field.type === 'email'
}

function fieldTypeLabel(type: FormForgeFieldType): string {
  return fieldTypeMeta.value[type]?.label ?? type
}

function fieldTypeIcon(type: FormForgeFieldType): string {
  return fieldTypeMeta.value[type]?.icon ?? 'i-lucide-square'
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
    title: schema.title,
    category: schema.category ?? null,
    pages: cloneValue(schema.pages),
    conditions: cloneValue(schema.conditions),
    drafts: cloneValue(schema.drafts)
  }
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
      updateRailPosition()
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

function addField(page: FormForgePageSchema, type: FormForgeFieldType): void {
  builder.addField(page.page_key, type)
  builder.normalizeFieldLocations()

  const nextField = page.fields.at(-1)

  if (nextField !== undefined) {
    selectField(page, nextField.field_key)
  }
}

function onFieldTypeChange(field: FormForgeFieldSchema, nextType: FormForgeFieldType): void {
  field.type = nextType

  if (nextType === 'select' || nextType === 'select_menu' || nextType === 'radio' || nextType === 'checkbox_group') {
    if (field.options === undefined) {
      field.options = []
    }
  } else {
    field.options = undefined
  }

  if (nextType === 'file') {
    field.multiple = false
    if (!('accept' in field)) {
      Object.assign(field, {
        accept: []
      })
    }
  }
}

function addOption(field: FormForgeFieldSchema): void {
  if (field.options === undefined) {
    field.options = []
  }

  field.options.push({
    label: t('builder.optionDefaultLabel'),
    value: `option_${field.options.length + 1}`
  })
}

function removeOption(field: FormForgeFieldSchema, index: number): void {
  if (field.options === undefined) {
    return
  }

  field.options.splice(index, 1)
}

function optionLabel(option: FormForgeFieldOption | undefined): string {
  if (option === undefined || option === null) {
    return ''
  }

  if (typeof option === 'object' && 'label' in option) {
    return typeof option.label === 'string' ? option.label : ''
  }

  return String(option)
}

function setOptionLabel(field: FormForgeFieldSchema, optionIndex: number, value: string): void {
  if (field.options === undefined) {
    return
  }

  const option = field.options[optionIndex]
  if (option === undefined || option === null) {
    return
  }

  if (typeof option === 'object' && 'value' in option) {
    field.options[optionIndex] = {
      ...option,
      label: value
    }
    return
  }

  field.options[optionIndex] = {
    label: value,
    value: option
  }
}

async function save(): Promise<void> {
  try {
    await builder.save()
    emit('save', draft.value)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : t('builder.error.save')
    emit('error', message)
  }
}

async function publish(): Promise<void> {
  try {
    await builder.publish()
    emit('publish', draft.value)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : t('builder.error.publish')
    emit('error', message)
  }
}

async function unpublish(): Promise<void> {
  try {
    await builder.unpublish()
    emit('unpublish', draft.value)
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : t('builder.error.unpublish')
    emit('error', message)
  }
}

function removeField(page: FormForgePageSchema, fieldKey: string): void {
  builder.removeField(page.page_key, fieldKey)
  if (selectedFieldKey.value === fieldKey) {
    selectedFieldKey.value = null
  }
}

function addQuestionFromRail(): void {
  const page = selectedPage()

  if (page === undefined) {
    builder.addPage()

    nextTick(() => {
      syncSelectionWithDraft(safePages.value)
      updateRailPosition()
    })

    return
  }

  addField(page, 'text')
}

function addPageFromRail(): void {
  builder.addPage()

  nextTick(() => {
    syncSelectionWithDraft(safePages.value)
    updateRailPosition()
  })
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
      endpoint: props.endpoint
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

watch(() => [props.loadFormKey, props.loadFormVersion] as const, ([key, version]) => {
  if (typeof key !== 'string' || key === '') {
    return
  }

  loadFormIntoBuilder(key, version)
}, {
  immediate: true
})

watch(() => safePages.value, (pages) => {
  syncSelectionWithDraft(pages)
  nextTick(() => {
    updateRailPosition()
  })
}, {
  deep: true,
  immediate: true
})

watch(() => selectedFieldKey.value, () => {
  nextTick(() => {
    updateRailPosition()
  })
})
</script>

<template>
  <div
    v-if="isClientReady"
    ref="builderRootElement"
    class="builder-root"
  >
    <div class="builder-layout">
      <div
        ref="builderColumnElement"
        class="builder-column"
      >
        <UCard
          variant="subtle"
          class="builder-card"
        >
          <div class="builder-toolbar">
            <div class="builder-toolbar-grid">
              <UInput
                v-model="draftTitle"
                :disabled="readonly"
                :placeholder="t('builder.formTitlePlaceholder')"
              />
              <div class="builder-category-control">
                <USelect
                  v-model="draftCategorySelectValue"
                  :items="categorySelectItems"
                  :disabled="readonly"
                  :placeholder="t('builder.categoryPlaceholder')"
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

            <div class="builder-toolbar-actions">
              <div class="builder-status">
                <span v-if="loadingRemoteForm">{{ t('builder.loadingForm') }}</span>
                <span v-if="formattedLastSavedAt !== null">{{ t('builder.lastSave', { value: formattedLastSavedAt }) }}</span>
                <span
                  v-if="builderError !== null"
                  class="builder-error"
                >{{ builderError }}</span>
              </div>

              <div class="builder-actions">
                <UButton
                  :loading="saving"
                  :disabled="readonly"
                  @click="save"
                >
                  {{ t('builder.save') }}
                </UButton>
                <UButton
                  color="primary"
                  :loading="publishing"
                  :disabled="readonly || !publishable"
                  @click="publish"
                >
                  {{ t('builder.publish') }}
                </UButton>
                <UButton
                  color="neutral"
                  variant="soft"
                  :loading="publishing"
                  :disabled="readonly || draftMutationIdentifier === null"
                  @click="unpublish"
                >
                  {{ t('builder.unpublish') }}
                </UButton>
              </div>
            </div>
          </div>
        </UCard>

        <Draggable
          v-model="draftPages"
          item-key="page_key"
          handle=".page-drag-handle"
          group="formforge-pages"
          class="builder-stack pages-stack"
        >
          <template #item="{ element: page }">
            <div
              v-if="page !== undefined && page !== null"
              class="page-block"
            >
              <UCard
                variant="soft"
                class="builder-card page-meta-card"
              >
                <div class="page-chip-row">
                  <UBadge
                    color="primary"
                    variant="subtle"
                  >
                    {{ t('builder.pageCounter', { current: pageOrder(page), total: safePages.length }) }}
                  </UBadge>
                </div>

                <div class="page-header">
                  <span class="page-drag-handle drag-handle">⋮⋮</span>
                  <div class="page-header-main">
                    <UInput
                      :model-value="readPageTitle(page)"
                      :disabled="readonly"
                      class="grow"
                      :placeholder="t('builder.pageTitlePlaceholder')"
                      @update:model-value="(value: string) => updatePageTitle(page, value)"
                    />
                    <UTextarea
                      v-model="page.description"
                      :rows="2"
                      :disabled="readonly"
                      :placeholder="t('builder.pageDescriptionPlaceholder')"
                    />
                  </div>
                  <div class="page-actions">
                    <UTooltip :text="t('builder.tooltip.mergePage')">
                      <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-arrow-up-to-line"
                        :disabled="readonly || !canMergeWithPreviousPage(page)"
                        @click="mergePageWithPrevious(page)"
                      />
                    </UTooltip>
                    <UTooltip :text="t('builder.tooltip.deletePage')">
                      <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-trash-2"
                        :disabled="readonly || safePages.length <= 1"
                        @click="builder.removePage(page.page_key)"
                      />
                    </UTooltip>
                  </div>
                </div>
              </UCard>

              <Draggable
                v-model="page.fields"
                item-key="field_key"
                handle=".field-drag-handle"
                :group="{ name: 'formforge-fields', pull: true, put: true }"
                class="builder-stack page-questions-stack"
              >
                <template #item="{ element: field }">
                  <UCard
                    v-if="field !== undefined && field !== null"
                    :ref="(element: unknown) => registerFieldElement(field.field_key, element)"
                    variant="subtle"
                    :class="[
                      'field-card',
                      isFieldSelected(field.field_key) ? 'field-card--active' : ''
                    ]"
                    @click="selectField(page, field.field_key)"
                    @focusin="selectField(page, field.field_key)"
                  >
                    <div class="field-shell">
                      <div class="field-head">
                        <span class="field-drag-handle drag-handle">⋮⋮</span>
                        <UInput
                          v-model="field.label"
                          :disabled="readonly"
                          :placeholder="t('builder.questionPlaceholder')"
                        />
                        <USelectMenu
                          :model-value="field.type"
                          :items="fieldTypeItems"
                          value-key="value"
                          label-key="label"
                          :search-input="false"
                          :leading-icon="fieldTypeIcon(field.type)"
                          :disabled="readonly"
                          @update:model-value="(value: FormForgeFieldType) => onFieldTypeChange(field, value)"
                        />
                      </div>

                      <div
                        v-if="isFieldSelected(field.field_key)"
                        class="field-controls"
                      >
                        <UTooltip :text="t('builder.tooltip.duplicateQuestion')">
                          <UButton
                            color="neutral"
                            variant="ghost"
                            icon="i-lucide-copy"
                            :disabled="readonly"
                            @click.stop="duplicateField(page, field.field_key)"
                          />
                        </UTooltip>
                        <UTooltip :text="t('builder.tooltip.deleteQuestion')">
                          <UButton
                            color="error"
                            variant="ghost"
                            icon="i-lucide-trash-2"
                            :disabled="readonly || page.fields.length <= 1"
                            @click.stop="removeField(page, field.field_key)"
                          />
                        </UTooltip>
                        <div class="field-required-switch">
                          <span>{{ t('builder.required') }}</span>
                          <USwitch
                            v-model="field.required"
                            :disabled="readonly"
                          />
                        </div>
                      </div>

                      <div
                        v-if="isFieldSelected(field.field_key) && showInlinePreview(field)"
                        class="field-inline-preview"
                      >
                        <p class="field-inline-preview-label">
                          {{ fieldTypeLabel(field.type) }}
                        </p>
                        <div
                          v-if="field.type === 'textarea'"
                          class="field-inline-preview-textarea"
                        >
                          <span />
                          <span />
                        </div>
                        <div
                          v-else
                          class="field-inline-preview-line"
                        />
                      </div>

                      <div
                        v-if="isFieldSelected(field.field_key) && (field.type === 'select' || field.type === 'select_menu' || field.type === 'radio' || field.type === 'checkbox_group')"
                        class="field-options"
                      >
                        <div
                          v-for="(option, optionIndex) in (field.options as FormForgeFieldOption[])"
                          :key="optionIndex"
                          class="field-option-row"
                        >
                          <UInput
                            :model-value="optionLabel(option)"
                            :disabled="readonly"
                            :placeholder="t('builder.optionLabelPlaceholder')"
                            @update:model-value="(value: string) => setOptionLabel(field, optionIndex, value)"
                          />
                          <UButton
                            color="neutral"
                            variant="ghost"
                            icon="i-lucide-x"
                            :disabled="readonly"
                            @click="removeOption(field, optionIndex)"
                          />
                        </div>
                        <UButton
                          color="neutral"
                          variant="soft"
                          icon="i-lucide-plus"
                          :disabled="readonly"
                          @click="addOption(field)"
                        >
                          {{ t('builder.addOption') }}
                        </UButton>
                      </div>

                      <p
                        v-if="!isFieldSelected(field.field_key)"
                        class="field-preview"
                      >
                        {{ field.placeholder || field.help_text || (field.options?.length ? t('builder.optionsCount', { count: field.options.length }) : fieldTypeLabel(field.type)) }}
                      </p>

                      <details
                        v-if="isFieldSelected(field.field_key)"
                        class="field-advanced"
                      >
                        <summary class="field-advanced-summary">
                          {{ t('builder.advancedSettings') }}
                        </summary>

                        <div class="field-advanced-body">
                          <div class="field-advanced-grid">
                            <UInput
                              v-model="field.placeholder"
                              :disabled="readonly"
                              :placeholder="t('builder.placeholderPlaceholder')"
                            />
                            <UTextarea
                              v-model="field.help_text"
                              :disabled="readonly"
                              :rows="2"
                              :placeholder="t('builder.helpTextPlaceholder')"
                            />
                          </div>

                          <div
                            v-if="field.type === 'number'"
                            class="field-numbers"
                          >
                            <UInput
                              v-model="field.min"
                              :disabled="readonly"
                              :placeholder="t('builder.minPlaceholder')"
                            />
                            <UInput
                              v-model="field.max"
                              :disabled="readonly"
                              :placeholder="t('builder.maxPlaceholder')"
                            />
                            <UInput
                              v-model="field.step"
                              :disabled="readonly"
                              :placeholder="t('builder.stepPlaceholder')"
                            />
                          </div>

                          <div
                            v-if="field.type === 'file'"
                            class="field-file"
                          >
                            <UCheckbox
                              v-model="field.multiple"
                              :disabled="readonly"
                              :label="t('builder.multiple')"
                            />
                            <UInput
                              :model-value="field.accept?.join(',') ?? ''"
                              :disabled="readonly"
                              :placeholder="t('builder.acceptedExtensionsPlaceholder')"
                              @update:model-value="(value: string) => { field.accept = value.split(',').map((item) => item.trim()).filter((item) => item !== '') }"
                            />
                          </div>
                        </div>
                      </details>
                    </div>
                  </UCard>
                </template>
              </Draggable>
            </div>
          </template>
        </Draggable>

        <UCard
          variant="subtle"
          class="builder-card conditions-card"
        >
          <div class="builder-row">
            <h3 class="conditions-title">
              {{ t('builder.conditions') }}
            </h3>
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-plus"
              :disabled="readonly"
              @click="builder.addCondition()"
            >
              {{ t('builder.addCondition') }}
            </UButton>
          </div>

          <div
            v-for="condition in safeConditions"
            :key="condition.condition_key"
            class="condition-card"
          >
            <div class="grid grid-cols-1 gap-2 md:grid-cols-4">
              <USelect
                v-model="condition.target_type"
                :items="targetTypeItems"
                :disabled="readonly"
              />
              <USelect
                v-if="condition.target_type === 'page'"
                v-model="condition.target_key"
                :items="pageTargetItems"
                :disabled="readonly"
              />
              <USelect
                v-else
                v-model="condition.target_key"
                :items="fieldTargetItems"
                :disabled="readonly"
              />
              <USelect
                v-model="condition.action"
                :items="conditionActionItems"
                :disabled="readonly"
              />
              <USelect
                v-model="condition.match"
                :items="conditionMatchItems"
                :disabled="readonly"
              />
            </div>

            <div class="space-y-2">
              <div
                v-for="(clause, clauseIndex) in condition.when"
                :key="`${condition.condition_key}-${clauseIndex}`"
                class="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_1fr_auto]"
              >
                <USelect
                  v-model="clause.field_key"
                  :items="fieldTargetItems"
                  :disabled="readonly"
                />
                <USelect
                  v-model="clause.operator"
                  :items="conditionOperatorItems"
                  :disabled="readonly"
                />
                <UInput
                  v-if="clause.operator !== 'is_empty' && clause.operator !== 'not_empty'"
                  :model-value="typeof clause.value === 'string' ? clause.value : String(clause.value ?? '')"
                  :disabled="readonly"
                  :placeholder="t('builder.valuePlaceholder')"
                  @update:model-value="(value: string) => { clause.value = value }"
                />
                <div v-else />
                <UButton
                  color="neutral"
                  variant="soft"
                  :disabled="readonly || condition.when.length <= 1"
                  @click="builder.removeConditionClause(condition.condition_key, clauseIndex)"
                >
                  {{ t('builder.remove') }}
                </UButton>
              </div>
            </div>

            <div class="condition-actions">
              <UButton
                color="neutral"
                variant="soft"
                :disabled="readonly"
                @click="builder.addConditionClause(condition.condition_key)"
              >
                {{ t('builder.addClause') }}
              </UButton>
              <UButton
                color="error"
                variant="soft"
                :disabled="readonly"
                @click="builder.removeCondition(condition.condition_key)"
              >
                {{ t('builder.deleteCondition') }}
              </UButton>
            </div>
          </div>
        </UCard>
      </div>

      <aside class="builder-rail-column">
        <div
          class="builder-rail"
          :style="{ top: `${railTop}px`, left: `${railLeft}px` }"
        >
          <UTooltip :text="t('builder.rail.addQuestion')">
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-circle-plus"
              class="rail-action"
              :disabled="readonly"
              @click="addQuestionFromRail"
            />
          </UTooltip>
          <UTooltip :text="t('builder.rail.addPage')">
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-file-plus-2"
              class="rail-action"
              :disabled="readonly"
              @click="addPageFromRail"
            />
          </UTooltip>
        </div>
      </aside>
    </div>
  </div>
  <div
    v-else
    class="space-y-6"
  >
    <UCard>
      <div class="text-sm text-muted">
        {{ t('builder.loadingBuilder') }}
      </div>
    </UCard>
  </div>
</template>

<style scoped>
.builder-root {
  width: 100%;
}

.builder-layout {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 1rem;
}

.builder-column {
  min-width: 0;
  width: 100%;
  display: grid;
  gap: 1.5rem;
}

.builder-card {
  border-radius: 16px;
}

.builder-toolbar {
  display: grid;
  gap: 1rem;
}

.builder-toolbar-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: 1fr;
}

.builder-category-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: center;
}

.builder-toolbar-actions {
  border-top: 1px solid var(--ui-border-muted);
  padding-top: 0.85rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.builder-status {
  color: var(--ui-text-muted);
  font-size: 0.82rem;
}

.builder-error {
  color: var(--ui-error);
  margin-left: 0.5rem;
}

.builder-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.builder-stack {
  display: grid;
  gap: 1rem;
}

.pages-stack {
  gap: 2.25rem;
}

.drag-handle {
  color: var(--ui-text-muted);
  cursor: grab;
  user-select: none;
  padding-top: 0.4rem;
}

.page-block {
  display: grid;
  gap: 1rem;
}

.page-meta-card {
  border-radius: 16px;
}

.page-chip-row {
  margin-bottom: 0.65rem;
}

.page-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.75rem;
}

.page-header-main {
  display: grid;
  gap: 0.6rem;
  min-width: 0;
}

.page-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.page-questions-stack {
  gap: 1rem;
}

.field-card {
  border-radius: 14px;
  border-left: 4px solid transparent;
  cursor: pointer;
}

.field-card--active {
  border-left-color: var(--ui-primary);
}

.field-shell {
  display: grid;
  gap: 0.85rem;
}

.field-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(220px, 280px);
  align-items: center;
  gap: 0.75rem;
}

.field-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.field-required-switch {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ui-text-toned);
  font-size: 0.82rem;
}

.field-preview {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.84rem;
}

.field-inline-preview {
  border-radius: 10px;
  background: var(--ui-bg-muted);
  padding: 0.75rem;
  display: grid;
  gap: 0.5rem;
}

.field-inline-preview-label {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ui-text-muted);
}

.field-inline-preview-line {
  width: min(32rem, 100%);
  border-bottom: 1px dashed var(--ui-border-accented);
  height: 1.4rem;
}

.field-inline-preview-textarea {
  width: min(32rem, 100%);
  display: grid;
  gap: 0.5rem;
}

.field-inline-preview-textarea > span {
  display: block;
  border-bottom: 1px dashed var(--ui-border-accented);
  height: 1.2rem;
}

.field-advanced {
  border-top: 1px solid var(--ui-border-muted);
  padding-top: 0.75rem;
}

.field-advanced-summary {
  cursor: pointer;
  color: var(--ui-text-toned);
  font-size: 0.82rem;
  font-weight: 500;
}

.field-advanced-body {
  margin-top: 0.75rem;
  display: grid;
  gap: 0.75rem;
  border-radius: 12px;
  background: var(--ui-bg-elevated);
  padding: 0.75rem;
}

.field-advanced-grid {
  display: grid;
  gap: 0.65rem;
}

.field-toggle-grid {
  display: grid;
  gap: 0.6rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.field-options {
  display: grid;
  gap: 0.6rem;
}

.field-option-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.45rem;
  align-items: center;
}

.field-numbers {
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.field-file {
  display: grid;
  gap: 0.55rem;
}

.conditions-card {
  border-radius: 16px;
}

.builder-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.conditions-title {
  font-size: 0.95rem;
  font-weight: 600;
}

.condition-card {
  border: 1px solid var(--ui-border-muted);
  border-radius: 12px;
  padding: 0.75rem;
  display: grid;
  gap: 0.75rem;
}

.condition-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.builder-rail-column {
  width: 4.25rem;
  display: flex;
  justify-content: center;
}

.builder-rail {
  position: fixed;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid var(--ui-border-muted);
  border-radius: 14px;
  background: var(--ui-bg);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--ui-text) 8%, transparent);
  transition: top 120ms ease, left 120ms ease;
}

.rail-action {
  width: 2.75rem;
  height: 2.75rem;
  justify-content: center;
}

@media (min-width: 1024px) {
  .builder-toolbar-grid {
    grid-template-columns: 1.2fr 0.8fr;
  }
}

@media (max-width: 1024px) {
  .builder-layout {
    display: block;
  }

  .builder-rail {
    position: fixed;
    top: auto !important;
    left: auto !important;
    right: 0.85rem;
    bottom: 0.85rem;
    flex-direction: row;
  }
}

@media (max-width: 768px) {
  .page-header {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .page-drag-handle {
    display: none;
  }

  .field-head {
    grid-template-columns: minmax(0, 1fr);
  }

  .field-drag-handle {
    display: none;
  }

  .field-toggle-grid {
    grid-template-columns: 1fr;
  }

  .field-numbers {
    grid-template-columns: 1fr;
  }

  .field-required-switch {
    margin-left: 0;
  }
}
</style>
