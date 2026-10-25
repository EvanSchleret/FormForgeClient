<script setup lang="ts">
import { computed, nextTick, ref, watch } from '#imports'
import { useToast } from '@nuxt/ui/composables/useToast'
import Draggable from 'vuedraggable'
import {
  FORM_FORGE_BUILDER_FIELD_TYPES,
  isFormForgeBuilderSettingsHidden,
  useFormForgeBuilder
} from '../../composables/useFormForgeBuilder'
import { useFormForgeI18n } from '../../composables/useFormForgeI18n'
import { normalizeFormForgeFieldTypeChange } from '../../utils/field-type'
import type {
  FormForgeBuilderDraft,
  FormForgeBuilderExpose,
  UseFormForgeBuilderOptions
} from '../../composables/useFormForgeBuilder'
import type { FormForgeClient, FormForgeClientConfig, FormForgeFieldSchema, FormForgeFieldType, FormForgeFormSchema, FormForgePageSchema, FormForgeScope, FormForgeSettingsModel } from '../../types'
import {
  ensurePageLogic,
} from '../../utils/page-logic'
import FormForgeBuilderBlockCard from './builder/FormForgeBuilderBlockCard.vue'
import FormForgeSettings from './FormForgeSettings.vue'

interface Props {
  formUuid?: string
  formKey?: string
  endpoint?: string
  scope?: FormForgeScope
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
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
  scope: undefined,
  client: undefined,
  clientConfig: undefined,
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
  scope: props.scope,
  client: props.client,
  clientConfig: props.clientConfig,
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

const loadingRemoteForm = ref<boolean>(false)
const isPublished = ref<boolean>(props.defaultPublished)
let loadRequestId = 0
const settingsHidden = computed<boolean>(() => isFormForgeBuilderSettingsHidden(props.hideSettings, props.disableSettingsTab))

const safePages = computed<FormForgePageSchema[]>(() => {
  const pages = draft.value?.pages
  if (!Array.isArray(pages)) {
    return []
  }

  return pages.filter((page): page is FormForgePageSchema => page !== undefined && page !== null)
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
    ? 'ff:formforge:grid ff:formforge:gap-4'
    : 'ff:formforge:grid ff:formforge:gap-4 ff:formforge:lg:grid-cols-[minmax(0,1fr)_4rem]'
})

const selectedTab = ref<string>('builder')

const settingsModel = computed<FormForgeSettingsModel>(() => ({
  title: draft.value.title,
  category: draft.value.category,
  publish_at: draft.value.publish_at ?? null,
  pause_at: draft.value.pause_at ?? null,
  response_limit: draft.value.response_limit ?? null,
  submission_code_required: draft.value.submission_code_required === true,
  submission_code: typeof draft.value.submission_code === 'string' ? draft.value.submission_code : '',
  has_submission_code: draft.value.uuid !== null && draft.value.submission_code_required === true,
  public_url: draft.value.public_url ?? null,
  drafts: draft.value.drafts,
  api: draft.value.api
}))

function updateSettingsModel(value: FormForgeSettingsModel): void {
  Object.assign(draft.value, {
    title: value.title,
    category: value.category,
    publish_at: value.publish_at,
    pause_at: value.pause_at,
    response_limit: value.response_limit,
    submission_code_required: value.submission_code_required,
    submission_code: value.submission_code,
    public_url: value.public_url,
    drafts: value.drafts,
    api: value.api
  })
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
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
      ? await builder.client.getFormVersion(key, version, { endpoint: props.endpoint, scope: props.scope, locale: props.locale })
      : await builder.client.getForm(key, { endpoint: props.endpoint, scope: props.scope, locale: props.locale })

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
    endpoint: props.endpoint,
    scope: props.scope,
    locale: props.locale
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
  <div class="formforge ff:formforge:w-full">
    <div :class="builderLayoutClass">
      <div
        class="ff:formforge:grid ff:formforge:min-w-0 ff:formforge:gap-6"
      >
        <template v-if="!settingsHidden">
          <UTabs
            v-model="selectedTab"
            :items="builderTabs"
            value-key="slot"
            class="ff:formforge:w-full"
            :ui="{
              list: 'ff:formforge:w-full',
              trigger: 'ff:formforge:flex-1 ff:formforge:justify-center'
            }"
          >
            <template #builder>
              <div class="ff:formforge:grid ff:formforge:gap-6">
                <Draggable
                  v-model="draftPages"
                  item-key="page_key"
                  handle=".formforge-page-drag-handle"
                  group="formforge-pages"
                  class="ff:formforge:grid ff:formforge:gap-6"
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

                <div class="ff:formforge:flex ff:formforge:flex-col ff:formforge:items-center ff:formforge:justify-between ff:formforge:gap-3 ff:formforge:rounded-lg ff:formforge:border-thin ff:formforge:border-dashed-thin ff:formforge:border-muted ff:formforge:p-4 ff:formforge:sm:flex-row">
                  <div class="ff:formforge:stack-1">
                    <p class="ff:formforge:text-sm ff:formforge:weight-600 ff:formforge:text-default">
                      {{ t('builder.block.addNewBlock') }}
                    </p>
                    <p class="ff:formforge:text-sm ff:formforge:text-muted">
                      {{ t('builder.block.addNewBlockDescription') }}
                    </p>
                  </div>
                  <UButton
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-plus"
                    :disabled="readonly"
                    @click="addPage()"
                  >
                    {{ t('builder.rail.addPage') }}
                  </UButton>
                </div>
              </div>
            </template>

            <template #settings>
              <FormForgeSettings
                :model-value="settingsModel"
                :endpoint="props.endpoint"
                :scope="props.scope"
                :client="props.client"
                :client-config="props.clientConfig"
                :locale="props.locale"
                :category-route-key="props.categoryRouteKey"
                :readonly="readonly || loadingRemoteForm"
                :disable-title-input="disableTitleInput"
                :disable-category-control="disableCategoryControl"
                @update:model-value="updateSettingsModel"
                @save="save"
                @error="emit('error', $event)"
              >
                <template #actions>
                  <div class="ff:formforge:flex ff:formforge:flex-wrap ff:formforge:items-center ff:formforge:gap-2">
                    <span v-if="loadingRemoteForm">{{ t('builder.loadingForm') }}</span>
                    <span v-if="formattedLastSavedAt !== null">{{ t('builder.lastSave', { value: formattedLastSavedAt }) }}</span>
                    <span
                      v-if="builderError !== null"
                      class="ff:formforge:text-error"
                    >{{ builderError }}</span>
                    <UButton
                      type="submit"
                      :loading="saving"
                      :disabled="readonly || loadingRemoteForm"
                    >
                      {{ t('builder.save') }}
                    </UButton>
                    <UButton
                      v-if="!disablePublishAction && !defaultPublished"
                      type="button"
                      :color="publishButtonColor"
                      :variant="publishButtonVariant"
                      :loading="publishing"
                      :disabled="!canTogglePublish"
                      @click="togglePublishState"
                    >
                      {{ publishButtonLabel }}
                    </UButton>
                  </div>
                </template>
              </FormForgeSettings>
            </template>
          </UTabs>
        </template>

        <div
          v-else
          class="ff:formforge:grid ff:formforge:gap-6"
        >
          <Draggable
            v-model="draftPages"
            item-key="page_key"
            handle=".formforge-page-drag-handle"
            group="formforge-pages"
            class="ff:formforge:grid ff:formforge:gap-6"
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

          <div class="ff:formforge:flex ff:formforge:flex-col ff:formforge:items-center ff:formforge:justify-between ff:formforge:gap-3 ff:formforge:rounded-lg ff:formforge:border-thin ff:formforge:border-dashed-thin ff:formforge:border-muted ff:formforge:p-4 ff:formforge:sm:flex-row">
            <div class="ff:formforge:stack-1">
              <p class="ff:formforge:text-sm ff:formforge:weight-600 ff:formforge:text-default">
                {{ t('builder.block.addNewBlock') }}
              </p>
              <p class="ff:formforge:text-sm ff:formforge:text-muted">
                {{ t('builder.block.addNewBlockDescription') }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-plus"
              :disabled="readonly"
              @click="addPage()"
            >
              {{ t('builder.rail.addPage') }}
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div
    v-if="loadingRemoteForm"
    class="ff:formforge:stack-6"
  >
    <UCard>
      <div class="ff:formforge:text-sm ff:formforge:text-muted">
        {{ t('builder.loadingBuilder') }}
      </div>
    </UCard>
  </div>
</template>
