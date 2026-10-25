<script setup lang="ts">
import { computed, ref, toRaw, watch } from '#imports'
import { parseDate, parseTime } from '@internationalized/date'
import type { DateValue, Time } from '@internationalized/date'
import { useOverlay } from '@nuxt/ui/composables/useOverlay'
import { useToast } from '@nuxt/ui/composables/useToast'
import * as z from 'zod'
import { useFormForgeCategory, useFormForgeCategoryOptions } from '../../composables/useFormForgeCategory'
import { useFormForgeI18n } from '../../composables/useFormForgeI18n'
import { useFormForgeSettings } from '../../composables/useFormForgeSettings'
import type { FormForgeCategory, FormForgeCategorySelectOption, FormForgeDraftSettings, FormForgeJsonObject, FormForgeSettingsExpose, FormForgeSettingsModel, FormForgeSettingsOptions } from '../../types'
import { isFormForgeJsonObject } from '../../utils/object'
import FormForgeCategoryCreateModal from './FormForgeCategoryCreateModal.vue'

interface Props extends FormForgeSettingsOptions {
  modelValue?: object
  categoryRouteKey?: string
  readonly?: boolean
  disableTitleInput?: boolean
  disableCategoryControl?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  formUuid: undefined,
  formKey: undefined,
  endpoint: undefined,
  scope: undefined,
  locale: undefined,
  client: undefined,
  clientConfig: undefined,
  categoryRouteKey: undefined,
  readonly: false,
  disableTitleInput: false,
  disableCategoryControl: false
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: FormForgeSettingsModel): void
  (event: 'save'): void
  (event: 'error', value: string): void
}>()

const { t } = useFormForgeI18n({
  locale: () => props.locale
})
const toast = useToast()
const overlay = useOverlay()
const settingsState = useFormForgeSettings({
  formUuid: props.formUuid,
  formKey: props.formKey,
  endpoint: props.endpoint,
  scope: props.scope,
  locale: props.locale,
  client: props.client,
  clientConfig: props.clientConfig
})
const settings = settingsState.settings
const error = settingsState.error
const loading = settingsState.loading
const saving = settingsState.saving
const hasChanges = settingsState.hasChanges
const CATEGORY_NONE_VALUE = '__formforge_no_category__'
const saveSucceeded = ref<boolean>(false)

const categoryManager = useFormForgeCategory({
  immediate: !props.disableCategoryControl,
  initialQuery: {
    per_page: 200
  },
  categoryRouteKey: props.categoryRouteKey,
  endpoint: props.endpoint,
  scope: props.scope,
  client: props.client,
  clientConfig: props.clientConfig
})
const categoryOptions = useFormForgeCategoryOptions({
  source: categoryManager,
  includeInactive: true
})

interface DateTimeParts {
  date: DateValue | null
  time: Time | null
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
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
      String(parsed.getFullYear()).padStart(4, '0'),
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

const publishAtParts = computed<DateTimeParts>(() => parseDateTimeValue(settings.value.publish_at))
const pauseAtParts = computed<DateTimeParts>(() => parseDateTimeValue(settings.value.pause_at))

const publishAtDate = computed<DateValue | null>({
  get: () => publishAtParts.value.date,
  set: (value) => {
    settings.value.publish_at = serializeDateTimeValue(value, publishAtParts.value.time)
  }
})

const publishAtTime = computed<Time | null>({
  get: () => publishAtParts.value.time,
  set: (value) => {
    settings.value.publish_at = serializeDateTimeValue(publishAtParts.value.date, value)
  }
})

const pauseAtDate = computed<DateValue | null>({
  get: () => pauseAtParts.value.date,
  set: (value) => {
    settings.value.pause_at = serializeDateTimeValue(value, pauseAtParts.value.time)
  }
})

const pauseAtTime = computed<Time | null>({
  get: () => pauseAtParts.value.time,
  set: (value) => {
    settings.value.pause_at = serializeDateTimeValue(pauseAtParts.value.date, value)
  }
})

const responseLimitValue = computed<number | null>({
  get: () => settings.value.response_limit,
  set: (value) => {
    settings.value.response_limit = typeof value === 'number' && Number.isFinite(value) ? value : null
  }
})

const openingEnabled = computed<boolean>({
  get: () => settings.value.publish_at !== null,
  set: (value) => {
    settings.value.publish_at = value
      ? settings.value.publish_at ?? currentDateTimeValue()
      : null
  }
})

const closingEnabled = computed<boolean>({
  get: () => settings.value.pause_at !== null,
  set: (value) => {
    settings.value.pause_at = value
      ? settings.value.pause_at ?? currentDateTimeValue()
      : null
  }
})

const responseLimitEnabled = computed<boolean>({
  get: () => settings.value.response_limit !== null,
  set: (value) => {
    settings.value.response_limit = value
      ? settings.value.response_limit ?? 1
      : null
  }
})

const submissionPinEnabled = computed<boolean>({
  get: () => settings.value.submission_code_required,
  set: (value) => {
    settings.value.submission_code_required = value
    if (!value) {
      settings.value.submission_code = ''
    }
  }
})

const formAccessCodeEnabled = computed<boolean>({
  get: () => settings.value.access_code_required === true,
  set: (value) => {
    settings.value.access_code_required = value
    if (!value) {
      settings.value.access_code = ''
    }
  }
})

const draftsEnabled = computed<boolean>({
  get: () => (toRaw(settings.value as unknown as FormForgeSettingsModel) as FormForgeSettingsModel).drafts.enabled,
  set: (value) => {
    const current = toRaw(settings.value as unknown as FormForgeSettingsModel) as FormForgeSettingsModel
    settingsState.setSettings({
      ...current,
      drafts: {
        ...current.drafts,
        enabled: value
      }
    })
  }
})

function ensureSubmissionApi(): FormForgeJsonObject {
  if (!isFormForgeJsonObject(settings.value.api.submission)) {
    settings.value.api.submission = {}
  }

  return settings.value.api.submission
}

const submissionIsPublic = computed<boolean>({
  get() {
    const submission = settings.value.api.submission
    if (!isFormForgeJsonObject(submission)) {
      return true
    }

    if (typeof submission.public === 'boolean') {
      return submission.public
    }

    return typeof submission.auth !== 'string' || submission.auth === 'public' || submission.auth === 'optional'
  },
  set(value) {
    const submission = ensureSubmissionApi()
    submission.public = value
    submission.auth = value ? 'public' : 'required'
  }
})

const draftTitle = computed<string>({
  get: () => settings.value.title,
  set: (value) => {
    settings.value.title = value
  }
})

const draftCategory = computed<string | null>({
  get: () => settings.value.category,
  set: (value) => {
    settings.value.category = value
  }
})

const draftCategorySelectValue = computed<string>({
  get: () => draftCategory.value ?? CATEGORY_NONE_VALUE,
  set: (value) => {
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

const validationSchema = computed(() => z.object({
  title: z.string().trim().min(1, t('builder.settings.formTitleRequired')),
  response_limit: z.number().nullable().refine(value => value === null || (Number.isInteger(value) && value > 0), {
    message: t('builder.settings.submissionLimit.validation')
  }),
  submission_code_required: z.boolean(),
  submission_code: z.string(),
  has_submission_code: z.boolean(),
  access_code_required: z.boolean(),
  access_code: z.string().max(255, t('builder.settings.access.accessCodeTooLong')),
  has_access_code: z.boolean()
}).superRefine((value, context) => {
  if (value.submission_code_required && !value.has_submission_code && value.submission_code.trim() === '') {
    context.addIssue({
      code: 'custom',
      path: ['submission_code'],
      message: t('builder.settings.access.pinRequired')
    })
  }

  if (value.access_code_required && !value.has_access_code && value.access_code.trim() === '') {
    context.addIssue({
      code: 'custom',
      path: ['access_code'],
      message: t('builder.settings.access.accessCodeRequired')
    })
  }
}))

const isEmbedded = computed<boolean>(() => props.modelValue !== undefined)

function cloneSettings(value: FormForgeSettingsModel): FormForgeSettingsModel {
  const rawValue = toRaw(value)

  if (typeof structuredClone === 'function') {
    return structuredClone(rawValue)
  }

  return JSON.parse(JSON.stringify(rawValue)) as FormForgeSettingsModel
}

function isSettingsObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeModelValue(value: object): FormForgeSettingsModel {
  const current = toRaw(settings.value as unknown as FormForgeSettingsModel) as FormForgeSettingsModel
  const input = value as Record<string, unknown>

  return {
    title: typeof input.title === 'string' ? input.title : current.title,
    category: typeof input.category === 'string' ? input.category : null,
    publish_at: typeof input.publish_at === 'string' ? input.publish_at : null,
    pause_at: typeof input.pause_at === 'string' ? input.pause_at : null,
    response_limit: typeof input.response_limit === 'number' ? input.response_limit : null,
    submission_code_required: input.submission_code_required === true,
    submission_code: typeof input.submission_code === 'string' ? input.submission_code : '',
    has_submission_code: typeof input.has_submission_code === 'boolean'
      ? input.has_submission_code
      : input.submission_code_required === true,
    access_code_required: input.access_code_required === true,
    access_code: typeof input.access_code === 'string' ? input.access_code : '',
    has_access_code: input.has_access_code === true,
    public_url: typeof input.public_url === 'string' ? input.public_url : null,
    drafts: isSettingsObject(input.drafts)
      ? JSON.parse(JSON.stringify(input.drafts)) as FormForgeDraftSettings
      : current.drafts,
    api: isSettingsObject(input.api)
      ? JSON.parse(JSON.stringify(input.api)) as FormForgeJsonObject
      : current.api
  }
}

function isFormForgeCategory(value: unknown): value is FormForgeCategory {
  if (value === null || typeof value !== 'object') {
    return false
  }

  const candidate = value as FormForgeCategory
  return typeof candidate.key === 'string' && candidate.key !== '' && typeof candidate.name === 'string'
}

async function loadForm(): Promise<void> {
  if (isEmbedded.value) {
    return
  }

  const formIdentifier = props.formKey ?? props.formUuid
  if (typeof formIdentifier !== 'string' || formIdentifier.trim() === '') {
    error.value = t('builder.settings.error.missingForm')
    return
  }

  try {
    await settingsState.load(formIdentifier)
    saveSucceeded.value = false
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : t('builder.settings.error.load')
    error.value = message
    emit('error', message)
  }
}

async function save(): Promise<void> {
  if (isEmbedded.value) {
    emit('save')
    return
  }

  error.value = null
  saveSucceeded.value = false

  try {
    const saved = await settingsState.save()
    if (saved === null) {
      return
    }

    saveSucceeded.value = true
    toast.add({
      title: t('builder.settings.toast.saveSuccess'),
      color: 'success'
    })
    emit('save')
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : t('builder.settings.error.save')
    error.value = message
    emit('error', message)
  }
}

async function submit(): Promise<void> {
  await save()
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
      scope: props.scope,
      client: props.client,
      clientConfig: props.clientConfig,
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

watch(() => props.modelValue, (value) => {
  if (value === undefined) {
    return
  }

  const nextSettings = normalizeModelValue(value)
  if (JSON.stringify(nextSettings) !== JSON.stringify(settings.value)) {
    settingsState.setSettings(nextSettings)
  }
}, {
  immediate: true,
  deep: true
})

watch(() => settings.value, (value) => {
  saveSucceeded.value = false
  if (isEmbedded.value) {
    emit('update:modelValue', cloneSettings(value as unknown as FormForgeSettingsModel))
  }
}, {
  deep: true
})

watch(() => [props.modelValue, props.formUuid, props.formKey, props.endpoint, props.scope] as const, () => {
  if (!isEmbedded.value) {
    void loadForm()
  }
}, {
  immediate: true
})

const settingsExpose = {
  save,
  reload: loadForm
} satisfies FormForgeSettingsExpose

defineExpose(settingsExpose)
</script>

<template>
  <UCard variant="subtle">
    <template #header>
      <div class="ff:formforge:stack-1">
        <p class="ff:formforge:text-sm ff:formforge:weight-600 ff:formforge:text-default">
          {{ t('builder.settings.title') }}
        </p>
        <p class="ff:formforge:text-sm ff:formforge:text-muted">
          {{ t('builder.settings.description') }}
        </p>
      </div>
    </template>

    <UForm
      :schema="validationSchema"
      :state="settings"
      class="ff:formforge:stack-6"
      @submit="submit"
    >
      <UAlert
        v-if="error !== null"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="error"
      />

      <UAlert
        v-if="saveSucceeded"
        color="success"
        variant="soft"
        icon="i-lucide-circle-check"
        :title="t('builder.settings.toast.saveSuccess')"
      />

      <div
        v-if="!disableTitleInput || !disableCategoryControl"
        class="ff:formforge:grid ff:formforge:gap-3 ff:formforge:lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]"
      >
        <UFormField
          v-if="!disableTitleInput"
          name="title"
          :label="t('builder.settings.formTitleLabel')"
          required
        >
          <UInput
            v-model="draftTitle"
            :disabled="readonly || loading || saving"
            :placeholder="t('builder.settings.formTitlePlaceholder')"
            :ui="{ base: 'ff:formforge:w-full' }"
          />
        </UFormField>

        <UFormField
          v-if="!disableCategoryControl"
          :label="t('builder.settings.categoryLabel')"
        >
          <div class="ff:formforge:flex ff:formforge:flex-row ff:formforge:items-center ff:formforge:gap-2">
            <USelect
              v-model="draftCategorySelectValue"
              :items="categorySelectItems"
              :disabled="readonly || loading || saving"
              :placeholder="t('builder.settings.categoryPlaceholder')"
              :ui="{ base: 'ff:formforge:w-full' }"
            />
            <UTooltip :text="t('builder.tooltip.addCategory')">
              <UButton
                color="neutral"
                variant="soft"
                icon="i-lucide-folder-plus"
                :aria-label="t('builder.tooltip.addCategory')"
                :disabled="readonly || loading || saving"
                @click="openCategoryCreateModal"
              />
            </UTooltip>
          </div>
        </UFormField>
      </div>

      <div class="ff:formforge:grid ff:formforge:gap-6">
        <div class="ff:formforge:grid ff:formforge:gap-4 ff:formforge:sm:grid-cols-[minmax(0,1fr)_auto] ff:formforge:sm:items-start">
          <div class="ff:formforge:stack-1">
            <p class="ff:formforge:text-sm ff:formforge:weight-600 ff:formforge:text-default">
              {{ t('builder.settings.opening.title') }}
            </p>
            <p class="ff:formforge:text-sm ff:formforge:text-muted">
              {{ t('builder.settings.opening.description') }}
            </p>
          </div>
          <USwitch
            v-model="openingEnabled"
            :disabled="readonly || loading || saving"
            :aria-label="t('builder.settings.opening.title')"
          />
        </div>

        <div
          v-if="openingEnabled"
          class="ff:formforge:grid ff:formforge:gap-4 ff:formforge:sm:grid-cols-2"
        >
          <UFormField :label="t('builder.settings.opening.date')">
            <UInputDate
              v-model="publishAtDate"
              :disabled="readonly || loading || saving"
              :ui="{ base: 'ff:formforge:w-full' }"
            />
          </UFormField>
          <UFormField :label="t('builder.settings.opening.time')">
            <UInputTime
              v-model="publishAtTime"
              :disabled="readonly || loading || saving"
              :hour-cycle="24"
              :ui="{ base: 'ff:formforge:w-full' }"
            />
          </UFormField>
        </div>
      </div>

      <div class="ff:formforge:grid ff:formforge:gap-6">
        <div class="ff:formforge:grid ff:formforge:gap-4 ff:formforge:sm:grid-cols-[minmax(0,1fr)_auto] ff:formforge:sm:items-start">
          <div class="ff:formforge:stack-1">
            <p class="ff:formforge:text-sm ff:formforge:weight-600 ff:formforge:text-default">
              {{ t('builder.settings.closing.title') }}
            </p>
            <p class="ff:formforge:text-sm ff:formforge:text-muted">
              {{ t('builder.settings.closing.description') }}
            </p>
          </div>
          <USwitch
            v-model="closingEnabled"
            :disabled="readonly || loading || saving"
            :aria-label="t('builder.settings.closing.title')"
          />
        </div>

        <div
          v-if="closingEnabled"
          class="ff:formforge:grid ff:formforge:gap-4 ff:formforge:sm:grid-cols-2"
        >
          <UFormField :label="t('builder.settings.closing.date')">
            <UInputDate
              v-model="pauseAtDate"
              :disabled="readonly || loading || saving"
              :ui="{ base: 'ff:formforge:w-full' }"
            />
          </UFormField>
          <UFormField :label="t('builder.settings.closing.time')">
            <UInputTime
              v-model="pauseAtTime"
              :disabled="readonly || loading || saving"
              :hour-cycle="24"
              :ui="{ base: 'ff:formforge:w-full' }"
            />
          </UFormField>
        </div>
      </div>

      <div class="ff:formforge:grid ff:formforge:gap-6">
        <div class="ff:formforge:grid ff:formforge:gap-4 ff:formforge:sm:grid-cols-[minmax(0,1fr)_auto] ff:formforge:sm:items-start">
          <div class="ff:formforge:stack-1">
            <p class="ff:formforge:text-sm ff:formforge:weight-600 ff:formforge:text-default">
              {{ t('builder.settings.submissionLimit.title') }}
            </p>
            <p class="ff:formforge:text-sm ff:formforge:text-muted">
              {{ t('builder.settings.submissionLimit.description') }}
            </p>
          </div>
          <USwitch
            v-model="responseLimitEnabled"
            :disabled="readonly || loading || saving"
            :aria-label="t('builder.settings.submissionLimit.title')"
          />
        </div>

        <UFormField
          v-if="responseLimitEnabled"
          name="response_limit"
          :label="t('builder.settings.submissionLimit.maximumResponses')"
          required
        >
          <UInputNumber
            v-model="responseLimitValue"
            :disabled="readonly || loading || saving"
            :min="1"
            :ui="{ base: 'ff:formforge:w-full' }"
          />
        </UFormField>
      </div>

      <div class="ff:formforge:grid ff:formforge:gap-6">
        <div class="ff:formforge:stack-1">
          <p class="ff:formforge:text-sm ff:formforge:weight-600 ff:formforge:text-default">
            {{ t('builder.settings.access.title') }}
          </p>
          <p class="ff:formforge:text-sm ff:formforge:text-muted">
            {{ t('builder.settings.access.description') }}
          </p>
        </div>

        <div class="ff:formforge:grid ff:formforge:gap-4">
          <div class="ff:formforge:flex ff:formforge:items-start ff:formforge:justify-between ff:formforge:gap-4">
            <div class="ff:formforge:stack-1">
              <p class="ff:formforge:text-sm ff:formforge:weight-500 ff:formforge:text-default">
                {{ t('builder.settings.access.publicForm.title') }}
              </p>
              <p class="ff:formforge:text-sm ff:formforge:text-muted">
                {{ t('builder.settings.access.publicForm.description') }}
              </p>
            </div>
            <USwitch
              v-model="submissionIsPublic"
              :disabled="readonly || loading || saving"
              :aria-label="t('builder.settings.access.publicForm.title')"
            />
          </div>

          <div v-if="submissionIsPublic">
            <UFormField :label="t('builder.settings.access.publicLink')">
              <UInput
                :model-value="settings.public_url ?? ''"
                disabled
                :placeholder="t('builder.settings.access.publicLinkPlaceholder')"
                :ui="{ base: 'ff:formforge:w-full' }"
              />
            </UFormField>
          </div>

          <div class="ff:formforge:flex ff:formforge:items-start ff:formforge:justify-between ff:formforge:gap-4 ff:formforge:border-top-thin ff:formforge:border-muted ff:formforge:pt-4">
            <div class="ff:formforge:stack-1">
              <p class="ff:formforge:text-sm ff:formforge:weight-500 ff:formforge:text-default">
                {{ t('builder.settings.access.pinProtection.title') }}
              </p>
              <p class="ff:formforge:text-sm ff:formforge:text-muted">
                {{ t('builder.settings.access.pinProtection.description') }}
              </p>
              <p
                v-if="submissionPinEnabled && settings.has_submission_code"
                class="ff:formforge:text-sm ff:formforge:text-success"
              >
                {{ t('builder.settings.access.pinProtection.configured') }}
              </p>
            </div>
            <USwitch
              v-model="submissionPinEnabled"
              :disabled="readonly || loading || saving"
              :aria-label="t('builder.settings.access.pinProtection.title')"
            />
          </div>

          <UFormField
            v-if="submissionPinEnabled"
            name="submission_code"
            :label="t('builder.settings.access.pin')"
            :required="!settings.has_submission_code"
          >
            <UInput
              v-model="settings.submission_code"
              :disabled="readonly || loading || saving"
              type="password"
              :placeholder="settings.has_submission_code
                ? t('builder.settings.access.pinUnchanged')
                : t('builder.settings.access.pinPlaceholder')"
              :ui="{ base: 'ff:formforge:w-full' }"
            />
          </UFormField>

          <div class="ff:formforge:flex ff:formforge:items-start ff:formforge:justify-between ff:formforge:gap-4 ff:formforge:border-top-thin ff:formforge:border-muted ff:formforge:pt-4">
            <div class="ff:formforge:stack-1">
              <p class="ff:formforge:text-sm ff:formforge:weight-500 ff:formforge:text-default">
                {{ t('builder.settings.access.accessCode.title') }}
              </p>
              <p class="ff:formforge:text-sm ff:formforge:text-muted">
                {{ t('builder.settings.access.accessCode.description') }}
              </p>
              <p
                v-if="formAccessCodeEnabled && settings.has_access_code"
                class="ff:formforge:text-sm ff:formforge:text-success"
              >
                {{ t('builder.settings.access.accessCode.configured') }}
              </p>
            </div>
            <USwitch
              v-model="formAccessCodeEnabled"
              :disabled="readonly || loading || saving"
              :aria-label="t('builder.settings.access.accessCode.title')"
            />
          </div>

          <UFormField
            v-if="formAccessCodeEnabled"
            name="access_code"
            :label="t('builder.settings.access.accessCode.label')"
            :required="!settings.has_access_code"
          >
            <UInput
              v-model="settings.access_code"
              :disabled="readonly || loading || saving"
              type="password"
              maxlength="255"
              autocomplete="new-password"
              :placeholder="settings.has_access_code
                ? t('builder.settings.access.accessCode.unchanged')
                : t('builder.settings.access.accessCode.placeholder')"
              :ui="{ base: 'ff:formforge:w-full' }"
            />
          </UFormField>
        </div>
      </div>

      <div class="ff:formforge:grid ff:formforge:gap-4 ff:formforge:border-top-thin ff:formforge:border-muted ff:formforge:pt-4">
        <div class="ff:formforge:flex ff:formforge:items-start ff:formforge:justify-between ff:formforge:gap-4">
          <div class="ff:formforge:stack-1">
            <p class="ff:formforge:text-sm ff:formforge:weight-500 ff:formforge:text-default">
              {{ t('builder.settings.drafts.title') }}
            </p>
            <p class="ff:formforge:text-sm ff:formforge:text-muted">
              {{ t('builder.settings.drafts.description') }}
            </p>
          </div>
          <USwitch
            v-model="draftsEnabled"
            :disabled="readonly || loading || saving"
            :aria-label="t('builder.settings.drafts.title')"
          />
        </div>
      </div>

      <div class="ff:formforge:flex ff:formforge:flex-wrap ff:formforge:items-center ff:formforge:justify-between ff:formforge:gap-3">
        <div class="ff:formforge:flex ff:formforge:flex-wrap ff:formforge:gap-2 ff:formforge:text-sm ff:formforge:text-muted">
          <span v-if="loading">{{ t('builder.settings.loading') }}</span>
          <span v-else-if="saving">{{ t('builder.settings.saving') }}</span>
          <span v-else-if="saveSucceeded">{{ t('builder.settings.saved') }}</span>
        </div>

        <div class="ff:formforge:flex ff:formforge:flex-wrap ff:formforge:items-center ff:formforge:gap-2">
          <slot
            name="actions"
            :loading="loading"
            :saving="saving"
            :has-changes="hasChanges"
            :save="save"
          >
            <UButton
              type="submit"
              :loading="saving"
              :disabled="readonly || loading || saving || !hasChanges"
            >
              {{ t('builder.settings.save') }}
            </UButton>
          </slot>
        </div>
      </div>
    </UForm>
  </UCard>
</template>
