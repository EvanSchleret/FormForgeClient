<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from '#imports'
import { parseDate, parseTime } from '@internationalized/date'
import type { DateValue, Time } from '@internationalized/date'
import UInput from '@nuxt/ui/components/Input.vue'
import UProgress from '@nuxt/ui/components/Progress.vue'
import type {
  FormForgeAddressFieldSchema,
  FormForgeClientConfig,
  FormForgeDatetimeMode,
  FormForgeFieldOption,
  FormForgeFieldSchema,
  FormForgeFormSchema,
  FormForgePageSchema,
  FormForgeRendererPagination,
  FormForgeTemporalMode,
  FormForgeSubmissionPayload,
  FormForgeSubmissionResponse,
  FormForgeUploadMode
} from '../../types'
import { isFormForgeJsonObject } from '../../utils/object'
import { createDefaultAddressFields } from '../../utils/defaults'
import { resolveTemporalMode } from '../../utils/temporal'
import { sanitizePayloadWithSchema } from '../../utils/renderer-payload'
import { resolveFormForgeSubmitVisibility } from '../../utils/submit-visibility'
import {
  resolveFormForgeRenderedPages,
  shouldShowFormForgeNavigation,
  shouldShowFormForgeProgress
} from '../../utils/renderer-pagination'
import { useFormForgeForm } from '../../composables/useFormForgeForm'
import { useFormForgeI18n } from '../../composables/useFormForgeI18n'
import { useFormForgeSubmit } from '../../composables/useFormForgeSubmit'
import { createFormForgeZodSchema } from '../../validation/zod'
import {
  evaluatePageLogicRule,
  getPageLogic,
  resolvePageLogicJumpTarget
} from '../../utils/page-logic'
import FormForgeRendererField from './FormForgeRendererField.vue'
import FormForgeRendererPage from './FormForgeRendererPage.vue'

interface FormForgeValidationError {
  name: string
  message: string
}

interface FormForgeRuntimeErrorItem {
  id?: string
  name?: string
  message: string
}

interface FormForgeRuntimeErrorEvent {
  errors: FormForgeRuntimeErrorItem[]
}

type FormForgeValidationHandler = (state: FormForgeSubmissionPayload) => FormForgeValidationError[] | Promise<FormForgeValidationError[]>

type FormForgeDynamicPrimitive = string | number | boolean | null | undefined

type FormForgeRangeInput = {
  start: DateValue | null
  end: DateValue | null
}

interface FormForgeSelectItem {
  label: string
  value: string | number | boolean | null
  description?: string
  disabled?: boolean
}

interface FormForgePageRuntimeState {
  visible: boolean
  disabled: boolean
}

interface FormForgeFieldRuntimeState {
  visible: boolean
  disabled: boolean
  required: boolean
}

type FormForgeTemporalValue = DateValue | Time

type FormForgeDynamicValue =
  | FormForgeDynamicPrimitive
  | FormForgeTemporalValue
  | FormForgeRangeInput
  | FormForgeSelectItem
  | File
  | File[]
  | { [key: string]: FormForgeDynamicValue }
  | FormForgeDynamicValue[]

type FormForgeDynamicObject = { [key: string]: FormForgeDynamicValue }

type FormForgeValidateEvent = 'input' | 'change' | 'blur'

interface FormForgeExposedError {
  id?: string
  name?: string
  message: string
}

interface Props {
  schema?: FormForgeFormSchema | { value: FormForgeFormSchema | null }
  modelValue?: FormForgeSubmissionPayload | { value: FormForgeSubmissionPayload }
  disabled?: boolean
  zodSchema?: object | { value: object | undefined }
  validate?: FormForgeValidationHandler
  datetimeMode?: FormForgeDatetimeMode
  formKey?: string
  formVersion?: string
  endpoint?: string
  clientConfig?: FormForgeClientConfig
  submitLabel?: string
  showSubmit?: boolean
  simulation?: boolean
  uploadMode?: FormForgeUploadMode
  clearAfterSubmit?: boolean
  showProgress?: boolean
  pagination?: FormForgeRendererPagination
  showAlertOnError?: boolean
  validateOn?: FormForgeValidateEvent[]
  validateOnBlur?: boolean
  previewPageKey?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  schema: undefined,
  modelValue: undefined,
  disabled: false,
  zodSchema: undefined,
  validate: undefined,
  datetimeMode: 'offset',
  formKey: undefined,
  formVersion: undefined,
  endpoint: undefined,
  clientConfig: undefined,
  submitLabel: undefined,
  showSubmit: undefined,
  simulation: false,
  uploadMode: undefined,
  clearAfterSubmit: false,
  showProgress: false,
  pagination: 'auto',
  showAlertOnError: false,
  validateOn: undefined,
  validateOnBlur: undefined,
  previewPageKey: null
})

const { t, locale } = useFormForgeI18n({
  locale: () => props.clientConfig?.locale
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: FormForgeSubmissionPayload): void
  (event: 'submit', value: FormForgeSubmissionPayload): void
  (event: 'submitted', value: FormForgeSubmissionResponse): void
  (event: 'error', value: string): void
}>()

const rendererForm = useTemplateRef('rendererForm')

function isRefLike(value: unknown): value is { value: unknown; __v_isRef?: boolean } {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  if (!('__v_isRef' in value) || !('value' in value)) {
    return false
  }

  return (value as { __v_isRef?: boolean }).__v_isRef === true
}

function unwrapSchemaProp(value: Props['schema']): FormForgeFormSchema | null {
  if (value === undefined) {
    return null
  }

  if (isRefLike(value)) {
    return value.value as FormForgeFormSchema | null
  }

  return value as FormForgeFormSchema | null
}

function unwrapModelValueProp(value: Props['modelValue']): FormForgeSubmissionPayload {
  if (value === undefined) {
    return {}
  }

  if (isRefLike(value)) {
    return value.value as FormForgeSubmissionPayload
  }

  return value as FormForgeSubmissionPayload
}

function unwrapZodSchemaProp(value: Props['zodSchema']): object | undefined {
  if (value === undefined) {
    return undefined
  }

  if (isRefLike(value)) {
    return value.value as object | undefined
  }

  return value
}

const usesExternalModel = computed<boolean>(() => {
  return props.modelValue !== undefined
})

const shouldShowSubmit = computed<boolean>(() => {
  return resolveFormForgeSubmitVisibility(props.showSubmit, usesExternalModel.value)
})

const usesExternalSchema = computed<boolean>(() => {
  return props.schema !== undefined
})

const internalFormKey = computed<string>(() => {
  if (props.formKey === undefined || props.formKey.trim() === '') {
    return ''
  }

  return props.formKey.trim()
})

const internalForm = useFormForgeForm({
  key: internalFormKey.value === '' ? '__missing_form_key__' : internalFormKey.value,
  version: props.formVersion,
  endpoint: props.endpoint,
  immediate: false,
  clientConfig: props.clientConfig
})

const internalSubmit = useFormForgeSubmit({
  key: internalFormKey.value === '' ? '__missing_form_key__' : internalFormKey.value,
  version: props.formVersion,
  endpoint: props.endpoint,
  schema: (): FormForgeFormSchema | null => getResolvedSchema(),
  state: (): FormForgeSubmissionPayload => internalForm.state.value as FormForgeSubmissionPayload,
  clientConfig: props.clientConfig
})

const submittedResponse = ref<FormForgeSubmissionResponse | null>(null)
const rendererErrors = ref<FormForgeRuntimeErrorItem[]>([])

watch(
  () => [usesExternalSchema.value, internalFormKey.value, props.formVersion] as const,
  async ([externalSchema, formKey]) => {
    submittedResponse.value = null

    if (externalSchema || formKey === '') {
      return
    }

    await internalForm.fetchSchema().catch(() => {})
  },
  {
    immediate: true
  }
)

function getResolvedSchema(): FormForgeFormSchema | null {
  if (usesExternalSchema.value) {
    return unwrapSchemaProp(props.schema)
  }

  return internalForm.schema.value as FormForgeFormSchema | null
}

function getResolvedZodSchema(): object | undefined {
  if (usesExternalSchema.value) {
    const schema = unwrapSchemaProp(props.schema)
    if (schema === null) {
      return undefined
    }

    return unwrapZodSchemaProp(props.zodSchema) ?? createFormForgeZodSchema(schema, {
      locale: locale.value
    })
  }

  return internalForm.zodSchema.value as object | undefined
}

const formState = computed<FormForgeSubmissionPayload>({
  get: () => {
    const value = usesExternalModel.value
      ? unwrapModelValueProp(props.modelValue)
      : internalForm.state.value

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {}
    }

    if (usesExternalModel.value) {
      const schema = getResolvedSchema()
      if (schema !== null) {
        return sanitizePayloadWithSchema(value, schema)
      }
    }

    return value
  },
  set: (value: FormForgeSubmissionPayload): void => {
    if (usesExternalModel.value) {
      emit('update:modelValue', value)
      return
    }

    internalForm.replaceState(value)
  }
})

const submissionCode = ref<string>('')
const isPreviewMode = computed<boolean>(() => {
  return typeof props.previewPageKey === 'string' && props.previewPageKey.trim() !== ''
})

const requiresSubmissionCode = computed<boolean>(() => {
  const schema = getResolvedSchema()

  if (schema === null) {
    return false
  }

  return schema.submission_code_required === true
})

const availabilityAlert = computed<string | null>(() => {
  const schema = getResolvedSchema()

  if (schema === null) {
    return null
  }

  const publishAt = typeof schema.publish_at === 'string' ? Date.parse(schema.publish_at) : Number.NaN
  if (!Number.isNaN(publishAt) && publishAt > Date.now()) {
    return t('renderer.formNotAvailableYet')
  }

  const pauseAt = typeof schema.pause_at === 'string' ? Date.parse(schema.pause_at) : Number.NaN
  if (!Number.isNaN(pauseAt) && pauseAt <= Date.now()) {
    return t('renderer.formPaused')
  }

  return null
})

watch(
  () => [usesExternalModel.value, getResolvedSchema(), unwrapModelValueProp(props.modelValue)] as const,
  ([externalModel, schema, modelValue]) => {
    if (!externalModel || schema === null) {
      return
    }

    const sanitizedValue = sanitizePayloadWithSchema(modelValue, schema)
    if (areValuesEqual(modelValue, sanitizedValue)) {
      return
    }

    emit('update:modelValue', sanitizedValue)
  },
  {
    immediate: true,
    deep: true
  }
)

const displayPages = computed<FormForgePageSchema[]>(() => {
  const schema = getResolvedSchema()
  if (schema === null) {
    return []
  }

  const pages = Array.isArray(schema.pages) ? schema.pages : []

  if (pages.length > 0) {
    return pages.map((page) => ({
      ...page,
      fields: Array.isArray(page.fields) ? page.fields : []
    }))
  }

  const fallbackFields = Array.isArray(schema.fields) ? schema.fields : []

  return [
    {
      page_key: 'page_1',
      title: '',
      description: null,
      meta: {},
      fields: fallbackFields
    }
  ]
})

const previewPage = computed<FormForgePageSchema | null>(() => {
  if (!isPreviewMode.value) {
    return null
  }

  const pageKey = props.previewPageKey?.trim()

  if (typeof pageKey !== 'string' || pageKey === '') {
    return displayPages.value[0] ?? null
  }

  return displayPages.value.find((page) => page.page_key === pageKey) ?? displayPages.value[0] ?? null
})

const pageLogicByKey = computed<Record<string, ReturnType<typeof getPageLogic>>>(() => {
  const map: Record<string, ReturnType<typeof getPageLogic>> = {}

  for (const page of displayPages.value) {
    map[page.page_key] = getPageLogic(page)
  }

  return map
})

const hasPageLogicRules = computed<boolean>(() => {
  return Object.values(pageLogicByKey.value).some((logic) => logic.rules.length > 0)
})

const fieldsByKey = computed<Record<string, FormForgeFieldSchema>>(() => {
  const map: Record<string, FormForgeFieldSchema> = {}

  for (const page of displayPages.value) {
    for (const field of page.fields) {
      map[field.field_key] = field
    }
  }

  return map
})

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  if (typeof File !== 'undefined' && value instanceof File) {
    return false
  }

  return true
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim() === ''
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  if (isPlainObject(value)) {
    if ('start' in value || 'end' in value) {
      const rangeValue = value as { start?: unknown; end?: unknown }
      return isEmptyValue(rangeValue.start) && isEmptyValue(rangeValue.end)
    }

    return Object.values(value).every((entry) => isEmptyValue(entry))
  }

  return false
}

function areValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false
    }

    return left.every((leftItem, index) => areValuesEqual(leftItem, right[index]))
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)

    if (leftKeys.length !== rightKeys.length) {
      return false
    }

    for (const key of leftKeys) {
      if (!areValuesEqual(left[key], right[key])) {
        return false
      }
    }

    return true
  }

  return false
}

function compareValues(left: unknown, right: unknown): number | null {
  if (typeof left === 'number' && typeof right === 'number') {
    if (left < right) {
      return -1
    }

    if (left > right) {
      return 1
    }

    return 0
  }

  if (typeof left === 'string' && typeof right === 'string') {
    const leftAsNumber = Number(left)
    const rightAsNumber = Number(right)
    if (Number.isFinite(leftAsNumber) && Number.isFinite(rightAsNumber)) {
      if (leftAsNumber < rightAsNumber) {
        return -1
      }

      if (leftAsNumber > rightAsNumber) {
        return 1
      }

      return 0
    }

    const leftTime = Date.parse(left)
    const rightTime = Date.parse(right)
    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) {
      if (leftTime < rightTime) {
        return -1
      }

      if (leftTime > rightTime) {
        return 1
      }

      return 0
    }

    if (left < right) {
      return -1
    }

    if (left > right) {
      return 1
    }

    return 0
  }

  return null
}

function getFieldStateValueByFieldKey(fieldKey: string): unknown {
  const field = fieldsByKey.value[fieldKey]
  if (field === undefined) {
    return undefined
  }

  return formState.value[field.name]
}

function evaluateConditionClause(
  clause: { field_key: string; operator: string; value: unknown }
): boolean {
  const actualValue = getFieldStateValueByFieldKey(clause.field_key)
  const expectedValue = clause.value

  if (clause.operator === 'eq') {
    return areValuesEqual(actualValue, expectedValue)
  }

  if (clause.operator === 'neq') {
    return !areValuesEqual(actualValue, expectedValue)
  }

  if (clause.operator === 'in') {
    if (Array.isArray(expectedValue)) {
      if (Array.isArray(actualValue)) {
        return actualValue.some((item) => expectedValue.some((entry) => areValuesEqual(item, entry)))
      }

      return expectedValue.some((entry) => areValuesEqual(actualValue, entry))
    }

    if (Array.isArray(actualValue)) {
      return actualValue.some((entry) => areValuesEqual(entry, expectedValue))
    }

    return areValuesEqual(actualValue, expectedValue)
  }

  if (clause.operator === 'not_in') {
    return !evaluateConditionClause({
      ...clause,
      operator: 'in'
    })
  }

  if (clause.operator === 'gt' || clause.operator === 'gte' || clause.operator === 'lt' || clause.operator === 'lte') {
    const comparison = compareValues(actualValue, expectedValue)
    if (comparison === null) {
      return false
    }

    if (clause.operator === 'gt') {
      return comparison > 0
    }

    if (clause.operator === 'gte') {
      return comparison >= 0
    }

    if (clause.operator === 'lt') {
      return comparison < 0
    }

    return comparison <= 0
  }

  if (clause.operator === 'contains') {
    if (typeof actualValue === 'string') {
      return actualValue.includes(String(expectedValue ?? ''))
    }

    if (Array.isArray(actualValue)) {
      return actualValue.some((entry) => areValuesEqual(entry, expectedValue))
    }

    if (isPlainObject(actualValue) && typeof expectedValue === 'string') {
      return expectedValue in actualValue
    }

    return false
  }

  if (clause.operator === 'not_contains') {
    return !evaluateConditionClause({
      ...clause,
      operator: 'contains'
    })
  }

  if (clause.operator === 'is_empty') {
    return isEmptyValue(actualValue)
  }

  if (clause.operator === 'not_empty') {
    return !isEmptyValue(actualValue)
  }

  return false
}

function evaluateCondition(
  condition: { match: 'all' | 'any'; when: Array<{ field_key: string; operator: string; value: unknown }> }
): boolean {
  if (!Array.isArray(condition.when) || condition.when.length === 0) {
    return false
  }

  if (condition.match === 'any') {
    return condition.when.some((clause) => evaluateConditionClause(clause))
  }

  return condition.when.every((clause) => evaluateConditionClause(clause))
}

const runtimeConditions = computed<{
  pages: Record<string, FormForgePageRuntimeState>
  fields: Record<string, FormForgeFieldRuntimeState>
}>(() => {
  const schema = getResolvedSchema()
  const pagesState: Record<string, FormForgePageRuntimeState> = {}
  const fieldsState: Record<string, FormForgeFieldRuntimeState> = {}

  for (const page of displayPages.value) {
    pagesState[page.page_key] = {
      visible: true,
      disabled: false
    }

    for (const field of page.fields) {
      fieldsState[field.field_key] = {
        visible: true,
        disabled: field.disabled === true,
        required: field.required === true
      }
    }
  }

  const requiredByLogic = new Set<string>()

  if (schema === null || hasPageLogicRules.value || !Array.isArray(schema.conditions)) {
    for (const [pageKey, logic] of Object.entries(pageLogicByKey.value)) {
      const page = displayPages.value.find((item) => item.page_key === pageKey)
      if (page === undefined) {
        continue
      }

      for (const rule of logic.rules) {
        if (!evaluatePageLogicRule(rule, page, (field) => formState.value[field.name])) {
          continue
        }

        for (const thenAction of rule.then) {
          if (thenAction.action === 'require' && typeof thenAction.field_key === 'string' && thenAction.field_key !== '') {
            requiredByLogic.add(thenAction.field_key)
          }
        }
      }
    }

    for (const fieldKey of requiredByLogic) {
      const fieldState = fieldsState[fieldKey]
      if (fieldState !== undefined) {
        fieldState.required = true
      }
    }

    return {
      pages: pagesState,
      fields: fieldsState
    }
  }

  const hasShowByPageKey = new Set<string>()
  const hasShowByFieldKey = new Set<string>()

  for (const condition of schema.conditions) {
    if (condition.action !== 'show') {
      continue
    }

    if (condition.target_type === 'page') {
      hasShowByPageKey.add(condition.target_key)
      continue
    }

    if (condition.target_type === 'field') {
      hasShowByFieldKey.add(condition.target_key)
    }
  }

  for (const pageKey of hasShowByPageKey) {
    const pageState = pagesState[pageKey]
    if (pageState !== undefined) {
      pageState.visible = false
    }
  }

  for (const fieldKey of hasShowByFieldKey) {
    const fieldState = fieldsState[fieldKey]
    if (fieldState !== undefined) {
      fieldState.visible = false
    }
  }

  for (const condition of schema.conditions) {
    if (!evaluateCondition(condition)) {
      continue
    }

    if (condition.target_type === 'page') {
      const pageState = pagesState[condition.target_key]
      if (pageState === undefined) {
        continue
      }

      if (condition.action === 'show') {
        pageState.visible = true
      }

      if (condition.action === 'hide' || condition.action === 'skip') {
        pageState.visible = false
      }

      if (condition.action === 'disable') {
        pageState.disabled = true
      }

      continue
    }

    if (condition.target_type !== 'field') {
      continue
    }

    const fieldState = fieldsState[condition.target_key]
    if (fieldState === undefined) {
      continue
    }

    if (condition.action === 'show') {
      fieldState.visible = true
    }

    if (condition.action === 'hide' || condition.action === 'skip') {
      fieldState.visible = false
    }

    if (condition.action === 'disable') {
      fieldState.disabled = true
    }

    if (condition.action === 'require') {
      fieldState.required = true
    }
  }

  for (const [pageKey, logic] of Object.entries(pageLogicByKey.value)) {
    const page = displayPages.value.find((item) => item.page_key === pageKey)
    if (page === undefined) {
      continue
    }

    for (const rule of logic.rules) {
      if (!evaluatePageLogicRule(rule, page, (field) => formState.value[field.name])) {
        continue
      }

      for (const thenAction of rule.then) {
        if (thenAction.action === 'require' && typeof thenAction.field_key === 'string' && thenAction.field_key !== '') {
          requiredByLogic.add(thenAction.field_key)
        }
      }
    }
  }

  for (const fieldKey of requiredByLogic) {
    const fieldState = fieldsState[fieldKey]
    if (fieldState !== undefined) {
      fieldState.required = true
    }
  }

  return {
    pages: pagesState,
    fields: fieldsState
  }
})

const visiblePages = computed<FormForgePageSchema[]>(() => {
  return displayPages.value.filter((page) => isPageVisible(page))
})

const pageKeyByFieldName = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}

  for (const page of displayPages.value) {
    for (const field of page.fields) {
      map[field.name] = page.page_key
    }
  }

  return map
})

const activePageKey = ref<string | null>(null)
const isPageTransitioning = ref(false)

watch(
  () => [isPreviewMode.value, props.previewPageKey, displayPages.value.map((page) => page.page_key)] as const,
  ([previewMode, previewPageKey, pageKeys]) => {
    if (!previewMode) {
      return
    }

    const pageKey = typeof previewPageKey === 'string' ? previewPageKey.trim() : ''
    if (pageKey !== '' && pageKeys.includes(pageKey)) {
      activePageKey.value = pageKey
      return
    }

    if (pageKeys.length > 0 && (activePageKey.value === null || !pageKeys.includes(activePageKey.value))) {
      activePageKey.value = pageKeys[0]
    }
  },
  {
    immediate: true
  }
)

watch(
  () => visiblePages.value.map((page) => page.page_key),
  (pageKeys) => {
    if (pageKeys.length === 0) {
      activePageKey.value = null
      return
    }

    if (activePageKey.value === null || !pageKeys.includes(activePageKey.value)) {
      activePageKey.value = pageKeys[0]
    }
  },
  {
    immediate: true
  }
)

const activePageIndex = computed<number>(() => {
  if (visiblePages.value.length === 0) {
    return 0
  }

  const currentPageKey = activePageKey.value
  if (currentPageKey === null) {
    return 0
  }

  const index = visiblePages.value.findIndex((page) => page.page_key === currentPageKey)
  if (index < 0) {
    return 0
  }

  return index
})

const shouldShowProgress = computed<boolean>(() => {
  return shouldShowFormForgeProgress(
    props.pagination,
    props.showProgress,
    visiblePages.value.length,
    isPreviewMode.value,
    props.simulation
  )
})

const currentVisiblePage = computed<FormForgePageSchema | null>(() => {
  if (visiblePages.value.length === 0) {
    return null
  }

  const page = visiblePages.value[activePageIndex.value]
  return page ?? null
})

const progressValue = computed<number>(() => {
  if (visiblePages.value.length === 0) {
    return 0
  }

  return ((activePageIndex.value + 1) / visiblePages.value.length) * 100
})

const shouldShowNavigation = computed<boolean>(() => {
  return shouldShowFormForgeNavigation(
    props.pagination,
    visiblePages.value.length,
    isPreviewMode.value,
    props.simulation
  )
})

function resolveNextPageKey(): string | null {
  const currentKey = activePageKey.value

  if (currentKey === null) {
    return null
  }

  const currentDisplayIndex = displayPages.value.findIndex((page) => page.page_key === currentKey)

  if (currentDisplayIndex < 0) {
    return null
  }

  const currentPage = displayPages.value[currentDisplayIndex]
  const logic = pageLogicByKey.value[currentPage.page_key]

  if (logic !== undefined) {
    for (const rule of logic.rules) {
      if (!evaluatePageLogicRule(rule, currentPage, (field) => formState.value[field.name])) {
        continue
      }

      const gotoTarget = resolvePageLogicJumpTarget(rule, currentDisplayIndex, displayPages.value.length)
      if (gotoTarget !== null) {
        const targetPage = displayPages.value[gotoTarget]
        if (targetPage !== undefined && isPageVisible(targetPage)) {
          return targetPage.page_key
        }
      }
    }
  }

  for (let index = currentDisplayIndex + 1; index < displayPages.value.length; index += 1) {
    const page = displayPages.value[index]
    if (page !== undefined && isPageVisible(page)) {
      return page.page_key
    }
  }

  return null
}

const renderedPages = computed<FormForgePageSchema[]>(() => {
  if (isPreviewMode.value && props.simulation) {
    if (currentVisiblePage.value !== null) {
      return [currentVisiblePage.value]
    }

    return []
  }

  if (previewPage.value !== null) {
    return [previewPage.value]
  }

  return resolveFormForgeRenderedPages(
    props.pagination,
    visiblePages.value,
    currentVisiblePage.value
  )
})

const canGoPrev = computed<boolean>(() => {
  return activePageIndex.value > 0
})

const canGoNext = computed<boolean>(() => {
  return resolveNextPageKey() !== null
})

const isLastVisiblePage = computed<boolean>(() => {
  return resolveNextPageKey() === null
})

const shouldShowErrorAlert = computed<boolean>(() => {
  return props.showAlertOnError && rendererErrors.value.length > 0
})

function filterErrorsByFieldNames(errors: FormForgeExposedError[], fieldNames: string[]): FormForgeExposedError[] {
  if (fieldNames.length === 0) {
    return errors
  }

  const fieldNameSet = new Set(fieldNames)

  return errors.filter((error) => typeof error.name === 'string' && fieldNameSet.has(error.name))
}

const resolvedSubmitLabel = computed<string>(() => {
  if (typeof props.submitLabel === 'string' && props.submitLabel.trim() !== '') {
    return props.submitLabel
  }

  return t('renderer.submit')
})

function isPageVisible(page: FormForgePageSchema): boolean {
  const runtimePage = runtimeConditions.value.pages[page.page_key]
  if (runtimePage === undefined) {
    return true
  }

  return runtimePage.visible
}

function isPageDisabled(page: FormForgePageSchema): boolean {
  const runtimePage = runtimeConditions.value.pages[page.page_key]
  if (runtimePage === undefined) {
    return false
  }

  return runtimePage.disabled
}

function isFieldVisible(field: FormForgeFieldSchema): boolean {
  const runtimeField = runtimeConditions.value.fields[field.field_key]
  if (runtimeField === undefined) {
    return true
  }

  return runtimeField.visible
}

function isFieldRequired(field: FormForgeFieldSchema): boolean {
  if (field.type === 'address') {
    return addressFieldDefinitions(field).some((addressField) => addressField.visible && addressField.required)
  }

  const runtimeField = runtimeConditions.value.fields[field.field_key]
  if (runtimeField === undefined) {
    return field.required === true
  }

  return runtimeField.required
}

function isFieldDisabled(field: FormForgeFieldSchema, page: FormForgePageSchema): boolean {
  const runtimeField = runtimeConditions.value.fields[field.field_key]
  const fieldDisabled = runtimeField?.disabled ?? field.disabled === true

  return fieldDisabled || isPageDisabled(page)
}

function setActivePage(pageKey: string): void {
  activePageKey.value = pageKey
}

function setActivePageIndex(index: number): void {
  if (visiblePages.value.length === 0) {
    activePageKey.value = null
    return
  }

  const safeIndex = Math.max(0, Math.min(index, visiblePages.value.length - 1))
  const page = visiblePages.value[safeIndex]
  activePageKey.value = page.page_key
}

async function goToPrevPage(): Promise<void> {
  if (!canGoPrev.value) {
    return
  }

  isPageTransitioning.value = true

  try {
    setActivePageIndex(activePageIndex.value - 1)
  } finally {
    await Promise.resolve()
    isPageTransitioning.value = false
  }
}

async function goToNextPage(): Promise<void> {
  isPageTransitioning.value = true

  try {
    const currentPage = currentVisiblePage.value
    if (currentPage !== null) {
      const fieldNames = currentPage.fields
        .map((field) => field.name)
        .filter((fieldName) => fieldName.trim() !== '')

      if (fieldNames.length > 0) {
        const isValid = await validateForm({
          name: fieldNames,
          nested: true
        })

        if (!isValid) {
          return
        }
      }
    }

    const nextPageKey = resolveNextPageKey()

    if (nextPageKey === null) {
      return
    }

    setActivePage(nextPageKey)
  } finally {
    await Promise.resolve()
    isPageTransitioning.value = false
  }
}

function resolvePageIndexByFieldName(fieldName: string): number {
  const pageKey = pageKeyByFieldName.value[fieldName]
  if (pageKey === undefined) {
    return -1
  }

  const visibleIndex = visiblePages.value.findIndex((page) => page.page_key === pageKey)
  if (visibleIndex >= 0) {
    return visibleIndex
  }

  const allIndex = displayPages.value.findIndex((page) => page.page_key === pageKey)
  return allIndex
}

function navigateToFirstErrorPage(errors: FormForgeRuntimeErrorItem[]): void {
  for (const error of errors) {
    if (typeof error.name !== 'string' || error.name === '') {
      continue
    }

    const pageIndex = resolvePageIndexByFieldName(error.name)
    if (pageIndex >= 0) {
      setActivePageIndex(pageIndex)
      return
    }
  }
}

function onFormError(event: FormForgeRuntimeErrorEvent): void {
  const errors = Array.isArray(event.errors)
    ? event.errors.filter((error) => typeof error.message === 'string' && error.message !== '')
    : []

  rendererErrors.value = errors
  navigateToFirstErrorPage(errors)
}

type FormForgeValidateOptions = {
  name?: string | string[]
  silent?: boolean
  nested?: boolean
  transform?: boolean
}

type FormForgeFormRef = {
  validate: (options?: FormForgeValidateOptions) => Promise<unknown>
  clear: (path?: string | RegExp) => void
  getErrors: (path?: string | RegExp) => FormForgeExposedError[]
}

async function validateForm(options: FormForgeValidateOptions = {}): Promise<boolean> {
  const formInstance = rendererForm.value as FormForgeFormRef | undefined
  if (formInstance === undefined) {
    return true
  }

  try {
    const result = await formInstance.validate(options)
    if (result === false) {
      const requestedFieldNames = Array.isArray(options.name)
        ? options.name
        : typeof options.name === 'string'
          ? [options.name]
          : []

      const errors = filterErrorsByFieldNames(formInstance.getErrors(), requestedFieldNames)
      rendererErrors.value = errors.map((error) => ({
        id: error.id,
        name: error.name,
        message: error.message
      }))
      navigateToFirstErrorPage(rendererErrors.value)
      return false
    }

    rendererErrors.value = []
    return true
  } catch {
    const errors = formInstance.getErrors()
    rendererErrors.value = errors.map((error) => ({
      id: error.id,
      name: error.name,
      message: error.message
    }))
    navigateToFirstErrorPage(rendererErrors.value)
    return false
  }
}

async function validateField(name: string): Promise<boolean> {
  return validateForm({
    name
  })
}

function clearErrors(path?: string | RegExp): void {
  const formInstance = rendererForm.value as FormForgeFormRef | undefined
  if (formInstance === undefined) {
    return
  }

  formInstance.clear(path)
  rendererErrors.value = []
}

function getErrors(path?: string | RegExp): FormForgeExposedError[] {
  const formInstance = rendererForm.value as FormForgeFormRef | undefined
  if (formInstance === undefined) {
    return []
  }

  return formInstance.getErrors(path)
}

const shouldValidateFieldOnBlur = computed<boolean>(() => {
  if (props.validateOnBlur !== undefined) {
    return props.validateOnBlur
  }

  if (Array.isArray(props.validateOn)) {
    return props.validateOn.includes('blur')
  }

  return usesExternalModel.value
})

function onFieldBlur(fieldName: string): void {
  if (!shouldValidateFieldOnBlur.value || isPageTransitioning.value) {
    return
  }

  validateField(fieldName).catch(() => {})
}

defineExpose({
  validate: validateForm,
  validateField,
  clearErrors,
  getErrors
})

function hasToStringMethod(value: FormForgeDynamicValue): value is FormForgeTemporalValue {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return false
  }

  return typeof (value as { toString?: () => string }).toString === 'function'
}

function isFileValue(value: FormForgeDynamicValue): value is File {
  if (typeof File === 'undefined') {
    return false
  }

  return value instanceof File
}

function parseSingleDateValue(mode: FormForgeTemporalMode, value: string): FormForgeTemporalValue | null {
  try {
    if (mode === 'date') {
      return parseDate(value)
    }

    if (mode === 'time') {
      return parseTime(value)
    }
  } catch {
    return null
  }

  return null
}

function serializeSingleDateValue(
  mode: FormForgeTemporalMode,
  value: FormForgeDynamicValue
): string | null {
  if (mode === 'date' || mode === 'time') {
    if (hasToStringMethod(value)) {
      return value.toString()
    }

    if (typeof value === 'string') {
      return value
    }

    return null
  }

  return null
}

function choiceDisplayValue(field: FormForgeFieldSchema): 'list' | 'menu' {
  if (field.display === 'list' || field.display === 'menu') {
    return field.display
  }

  if (field.type === 'radio' || field.type === 'checkbox_group') {
    return 'list'
  }

  return 'menu'
}

function normalizeSelectOptions(options: FormForgeFieldOption[] | undefined): FormForgeSelectItem[] {
  if (options === undefined) {
    return []
  }

  const items: FormForgeSelectItem[] = []

  for (const [index, option] of options.entries()) {
    if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean' || option === null) {
      const primitiveLabel = option === null ? '' : String(option)
      items.push({
        label: primitiveLabel.trim() === '' ? `Option ${index + 1}` : primitiveLabel,
        value: option
      })
      continue
    }

    const label = typeof option.label === 'string' && option.label.trim() !== ''
      ? option.label
      : `Option ${index + 1}`

    items.push({
      label,
      value: option.value,
      description: typeof option.description === 'string' ? option.description : undefined,
      disabled: typeof option.disabled === 'boolean' ? option.disabled : undefined
    })
  }

  return items
}

function getFieldMetaUi(field: FormForgeFieldSchema): { formField?: FormForgeDynamicObject; component?: FormForgeDynamicObject } {
  const uiValue = field.meta.ui
  if (!isFormForgeJsonObject(uiValue)) {
    return {}
  }

  const formFieldUi = isFormForgeJsonObject(uiValue.formField) ? (uiValue.formField as FormForgeDynamicObject) : undefined
  const componentUi = isFormForgeJsonObject(uiValue.component) ? (uiValue.component as FormForgeDynamicObject) : (uiValue as FormForgeDynamicObject)

  return {
    formField: formFieldUi,
    component: componentUi
  }
}

function mergeUiClass(defaultClass: string, value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return defaultClass
  }

  return `${defaultClass} ${value}`
}

function getResolvedFormFieldUi(field: FormForgeFieldSchema): FormForgeDynamicObject {
  const metaUi = getFieldMetaUi(field).formField

  return {
    ...metaUi,
    label: mergeUiClass('text-default', metaUi?.label),
    help: mergeUiClass('text-muted', metaUi?.help)
  }
}

function getFieldValue(field: FormForgeFieldSchema): FormForgeSubmissionPayload[string] {
  return formState.value[field.name]
}

function addressFieldDefinitions(field: FormForgeFieldSchema): FormForgeAddressFieldSchema[] {
  if (field.type !== 'address') {
    return []
  }

  if (!Array.isArray(field.address_fields) || field.address_fields.length === 0) {
    return createDefaultAddressFields(locale.value)
  }

  return field.address_fields
}

function setFieldValue(fieldName: string, value: FormForgeSubmissionPayload[string]): void {
  formState.value = {
    ...formState.value,
    [fieldName]: value
  }
}

function getComponentModelValue(field: FormForgeFieldSchema): FormForgeDynamicValue {
  const value = getFieldValue(field)
  const temporalMode = resolveTemporalMode(field)

  if (field.type === 'temporal' || field.type === 'date' || field.type === 'time') {
    if (typeof value === 'string') {
      return parseSingleDateValue(temporalMode, value)
    }

    return null
  }

  if (field.type === 'checkbox' || field.type === 'consent' || field.type === 'switch') {
    return typeof value === 'boolean' ? value : false
  }

  if (field.type === 'checkbox_group') {
    return (Array.isArray(value) ? value : []) as FormForgeDynamicValue
  }

  if (field.type === 'address') {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as FormForgeDynamicValue
    }

    const nextValue: Record<string, string | null> = {}

    for (const addressField of addressFieldDefinitions(field)) {
      nextValue[addressField.key] = null
    }

    return nextValue as FormForgeDynamicValue
  }

  if (field.type === 'file') {
    if (field.multiple === true) {
      if (Array.isArray(value)) {
        const files: File[] = []

        for (const item of value) {
          if (isFileValue(item as FormForgeDynamicValue)) {
            files.push(item as File)
          }
        }

        return files
      }

      return []
    }

    if (isFileValue(value as FormForgeDynamicValue)) {
      return value as File
    }

    return null
  }

  return value as FormForgeDynamicValue
}

function getComponentProps(field: FormForgeFieldSchema, page: FormForgePageSchema): FormForgeDynamicObject {
  const metaUi = getFieldMetaUi(field)
  const isDisabled =
    props.disabled
    || (!usesExternalModel.value && internalSubmit.submitting.value)
    || isFieldDisabled(field, page)

  const componentProps: FormForgeDynamicObject = {
    name: field.name,
    required: isFieldRequired(field),
    disabled: isDisabled,
    placeholder: field.placeholder
  }

  if (field.type === 'text') {
    componentProps.type = 'text'
  }

  if (field.type === 'email') {
    componentProps.type = 'email'
  }

  if (field.type === 'number') {
    componentProps.min = field.min ?? undefined
    componentProps.max = field.max ?? undefined
    componentProps.step = field.step ?? undefined
  }

  if (field.type === 'consent') {
    componentProps.label = field.consent_label ?? field.label ?? ''
    componentProps.required = false
  }

  if (field.type === 'select' || field.type === 'select_menu' || field.type === 'radio' || field.type === 'checkbox_group') {
    componentProps.items = normalizeSelectOptions(field.options)
    if (field.type === 'checkbox_group' && choiceDisplayValue(field) === 'menu') {
      componentProps.multiple = true
    }
  }

  if (field.type === 'file') {
    componentProps.multiple = field.multiple === true
    componentProps.accept = field.accept?.join(',')
  }

  if (metaUi.component !== undefined) {
    return {
      ...componentProps,
      ...metaUi.component
    }
  }

  return componentProps
}

function onFieldUpdate(field: FormForgeFieldSchema, value: FormForgeDynamicValue): void {
  const temporalMode = resolveTemporalMode(field)

  if (field.type === 'temporal' || field.type === 'date' || field.type === 'time') {
    setFieldValue(field.name, serializeSingleDateValue(temporalMode, value))
    return
  }

  setFieldValue(field.name, value as FormForgeSubmissionPayload[string])
}

function getLooseModelValue(field: FormForgeFieldSchema): never {
  return getComponentModelValue(field) as never
}

function onFieldModelUpdate(field: FormForgeFieldSchema, nextValue: unknown): void {
  onFieldUpdate(field, nextValue as FormForgeDynamicValue)
}

async function onSubmit(): Promise<void> {
  rendererErrors.value = []
  emit('submit', formState.value)

  if (usesExternalModel.value) {
    return
  }

  if (internalFormKey.value === '') {
    emit('error', t('renderer.error.missingFormKey'))
    return
  }

  try {
    const response = await internalSubmit.submit({
      test: props.simulation,
      version: props.formVersion,
      mode: props.uploadMode,
      meta: requiresSubmissionCode.value
        ? { submission_code: submissionCode.value }
        : (submissionCode.value.trim() !== '' ? { submission_code: submissionCode.value } : undefined)
    })

    submittedResponse.value = response

    if (props.clearAfterSubmit) {
      internalForm.resetState()
    }

    emit('submitted', response)
  } catch (error) {
    const submitErrors: FormForgeRuntimeErrorItem[] = []
    for (const [fieldName, messages] of Object.entries(internalSubmit.fieldErrors.value)) {
      if (!Array.isArray(messages)) {
        continue
      }

      for (const message of messages) {
        submitErrors.push({
          name: fieldName,
          message
        })
      }
    }

    if (submitErrors.length > 0) {
      rendererErrors.value = submitErrors
      navigateToFirstErrorPage(submitErrors)
    }

    const message = error instanceof Error ? error.message : t('renderer.error.submit')
    emit('error', message)
  }
}
</script>

<template>
  <UForm
    ref="rendererForm"
    :state="formState"
    :schema="getResolvedZodSchema()"
    :validate="props.validate"
    :validate-on="props.validateOn"
    @submit="onSubmit"
    @error="onFormError"
  >
    <div class="space-y-6">
      <UProgress
        v-if="shouldShowProgress"
        :model-value="progressValue"
        :max="100"
      />

      <UAlert
        v-if="!usesExternalSchema && internalForm.loading.value"
        color="neutral"
        variant="soft"
        :title="t('renderer.loadingForm')"
      />

      <UAlert
        v-if="!usesExternalSchema && internalForm.error.value"
        color="error"
        variant="soft"
        :title="t('renderer.error.loadForm')"
        :description="internalForm.error.value"
      />

      <UAlert
        v-if="!usesExternalModel && internalSubmit.error.value"
        color="error"
        variant="soft"
        :title="t('renderer.error.submit')"
        :description="internalSubmit.error.value.message"
      />

      <UAlert
        v-if="shouldShowErrorAlert"
        color="error"
        variant="soft"
        :title="t('renderer.alert.fixFields')"
      >
        <template #description>
          <ul class="list-disc space-y-1 pl-5">
            <li
              v-for="(error, index) in rendererErrors"
              :key="`${error.name ?? error.id ?? 'form'}-${index}`"
            >
              <span v-if="typeof error.name === 'string' && error.name !== ''">{{ error.name }}:</span>
              {{ error.message }}
            </li>
          </ul>
        </template>
      </UAlert>

      <UAlert
        v-if="!usesExternalModel && submittedResponse !== null"
        color="success"
        variant="soft"
        :title="t('renderer.alert.submitted')"
      />

      <UAlert
        v-if="availabilityAlert !== null"
        color="warning"
        variant="soft"
        :title="availabilityAlert"
      />

      <div
        v-if="requiresSubmissionCode"
        class="space-y-2 rounded-xl border border-muted bg-elevated/40 p-4"
      >
        <p class="text-sm font-medium text-default">
          {{ t('renderer.submissionCodeLabel') }}
        </p>
        <UInput
          v-model="submissionCode"
          type="password"
          autocomplete="one-time-code"
          :placeholder="t('renderer.submissionCodePlaceholder')"
        />
      </div>

      <FormForgeRendererPage
        v-for="page in renderedPages"
        :key="page.page_key"
        :page="page"
        class="space-y-4"
        @focusin="setActivePage(page.page_key)"
        @pointerdown="setActivePage(page.page_key)"
      >
        <FormForgeRendererField
          v-for="field in page.fields"
          v-show="isFieldVisible(field)"
          :key="field.field_key"
          :field="field"
          :model-value="getLooseModelValue(field)"
          :component-props="getComponentProps(field, page)"
          :field-ui="getResolvedFormFieldUi(field)"
          :address-fields="addressFieldDefinitions(field)"
          :required="isFieldRequired(field)"
          :disabled="isFieldDisabled(field, page)"
          @update:model-value="(nextValue) => onFieldModelUpdate(field, nextValue)"
          @blur="() => onFieldBlur(field.name)"
        />
      </FormForgeRendererPage>

      <div
        v-if="shouldShowNavigation"
        class="flex items-center justify-between gap-2"
      >
        <UButton
          type="button"
          variant="outline"
          color="neutral"
          :disabled="!canGoPrev"
          @click="goToPrevPage"
        >
          {{ t('renderer.navigation.previous') }}
        </UButton>

        <UButton
          v-if="!isLastVisiblePage"
          type="button"
          :disabled="!canGoNext"
          @click="goToNextPage"
        >
          {{ t('renderer.navigation.next') }}
        </UButton>

        <UButton
          v-else-if="shouldShowSubmit"
          type="submit"
          :loading="internalSubmit.submitting.value"
          :disabled="internalForm.loading.value || getResolvedSchema() === null || availabilityAlert !== null || (requiresSubmissionCode && submissionCode.trim() === '')"
        >
          {{ resolvedSubmitLabel }}
        </UButton>
      </div>

      <div
        v-else-if="shouldShowSubmit"
        class="flex justify-end"
      >
        <UButton
          type="submit"
          :loading="internalSubmit.submitting.value"
          :disabled="internalForm.loading.value || getResolvedSchema() === null || availabilityAlert !== null"
        >
          {{ resolvedSubmitLabel }}
        </UButton>
      </div>
    </div>
  </UForm>
</template>

<style scoped>
.formforge-rich-text :deep(p) {
  margin: 0.25rem 0;
}

.formforge-rich-text :deep(p:first-child) {
  margin-top: 0;
}

.formforge-rich-text :deep(p:last-child) {
  margin-bottom: 0;
}

.formforge-rich-text :deep(ul),
.formforge-rich-text :deep(ol) {
  margin: 0.25rem 0;
  padding-left: 1.25rem;
}

.formforge-rich-text :deep(a) {
  text-decoration: underline;
}
</style>
