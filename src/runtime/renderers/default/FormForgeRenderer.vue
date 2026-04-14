<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from '#imports'
import { getLocalTimeZone, parseAbsoluteToLocal, parseDate, parseDateTime, parseTime } from '@internationalized/date'
import type { DateValue, Time } from '@internationalized/date'
import UCheckbox from '@nuxt/ui/components/Checkbox.vue'
import UCheckboxGroup from '@nuxt/ui/components/CheckboxGroup.vue'
import UFileUpload from '@nuxt/ui/components/FileUpload.vue'
import UInput from '@nuxt/ui/components/Input.vue'
import UInputDate from '@nuxt/ui/components/InputDate.vue'
import UInputNumber from '@nuxt/ui/components/InputNumber.vue'
import UInputTime from '@nuxt/ui/components/InputTime.vue'
import UProgress from '@nuxt/ui/components/Progress.vue'
import URadioGroup from '@nuxt/ui/components/RadioGroup.vue'
import USelect from '@nuxt/ui/components/Select.vue'
import USelectMenu from '@nuxt/ui/components/SelectMenu.vue'
import UStepper from '@nuxt/ui/components/Stepper.vue'
import USwitch from '@nuxt/ui/components/Switch.vue'
import UTextarea from '@nuxt/ui/components/Textarea.vue'
import type {
  FormForgeClientConfig,
  FormForgeDatetimeMode,
  FormForgeFieldOption,
  FormForgeFieldSchema,
  FormForgeFormSchema,
  FormForgePageSchema,
  FormForgeSubmissionPayload,
  FormForgeSubmissionResponse,
  FormForgeUploadMode
} from '../../types'
import { isFormForgeJsonObject } from '../../utils/object'
import { useFormForgeForm } from '../../composables/useFormForgeForm'
import { useFormForgeI18n } from '../../composables/useFormForgeI18n'
import { useFormForgeSubmit } from '../../composables/useFormForgeSubmit'

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

type FormForgeProgressVariant = 'stepper' | 'progress'
type FormForgeValidateEvent = 'input' | 'change' | 'blur'

interface FormForgeStepperItem {
  title: string
  description?: string
  value: number
}

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
  progressVariant?: FormForgeProgressVariant
  showAlertOnError?: boolean
  validateOn?: FormForgeValidateEvent[]
  validateOnBlur?: boolean
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
  showSubmit: true,
  simulation: false,
  uploadMode: undefined,
  clearAfterSubmit: false,
  showProgress: false,
  progressVariant: 'stepper',
  showAlertOnError: false,
  validateOn: undefined,
  validateOnBlur: undefined
})

const { t } = useFormForgeI18n({
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
  schema: (): FormForgeFormSchema | null => internalForm.schema.value as FormForgeFormSchema | null,
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
    return unwrapZodSchemaProp(props.zodSchema)
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

    return Object.keys(value).length === 0
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

  if (schema === null || !Array.isArray(schema.conditions)) {
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
  return props.showProgress && visiblePages.value.length > 1
})

const stepperItems = computed<FormForgeStepperItem[]>(() => {
  return visiblePages.value.map((page, index) => ({
    title: page.title !== '' ? page.title : t('renderer.pageTitle', { index: index + 1 }),
    description: typeof page.description === 'string' && page.description.trim() !== ''
      ? page.description
      : undefined,
    value: index + 1
  }))
})

const pagedMode = computed<boolean>(() => {
  return shouldShowProgress.value
})

const currentVisiblePage = computed<FormForgePageSchema | null>(() => {
  if (visiblePages.value.length === 0) {
    return null
  }

  const page = visiblePages.value[activePageIndex.value]
  return page ?? null
})

const renderedPages = computed<FormForgePageSchema[]>(() => {
  if (!pagedMode.value) {
    return visiblePages.value
  }

  if (currentVisiblePage.value === null) {
    return []
  }

  return [currentVisiblePage.value]
})

const canGoPrev = computed<boolean>(() => {
  return activePageIndex.value > 0
})

const canGoNext = computed<boolean>(() => {
  return activePageIndex.value < visiblePages.value.length - 1
})

const isLastVisiblePage = computed<boolean>(() => {
  return visiblePages.value.length > 0 && activePageIndex.value === visiblePages.value.length - 1
})

const shouldShowErrorAlert = computed<boolean>(() => {
  return props.showAlertOnError && rendererErrors.value.length > 0
})

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

function onStepperModelUpdate(value: string | number | undefined): void {
  if (typeof value !== 'number') {
    return
  }

  setActivePageIndex(value - 1)
}

function goToPrevPage(): void {
  if (!canGoPrev.value) {
    return
  }

  setActivePageIndex(activePageIndex.value - 1)
}

function goToNextPage(): void {
  if (!canGoNext.value) {
    return
  }

  setActivePageIndex(activePageIndex.value + 1)
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
    await formInstance.validate(options)
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
  if (!shouldValidateFieldOnBlur.value) {
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

function hasDateMethod(value: FormForgeDynamicValue): value is DateValue & { toDate: (timeZone: string) => Date } {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return false
  }

  return typeof (value as { toDate?: (timeZone: string) => Date }).toDate === 'function'
}

function hasToStringMethod(value: FormForgeDynamicValue): value is FormForgeTemporalValue {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return false
  }

  return typeof (value as { toString?: () => string }).toString === 'function'
}

function isRangeInput(value: FormForgeDynamicValue): value is FormForgeRangeInput {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return false
  }

  return 'start' in value && 'end' in value
}

function isFileValue(value: FormForgeDynamicValue): value is File {
  if (typeof File === 'undefined') {
    return false
  }

  return value instanceof File
}

function stripDatetimeOffset(value: string): string {
  if (value.endsWith('Z')) {
    return value.slice(0, -1)
  }

  const match = value.match(/^(.*)([+-]\d{2}:\d{2})$/)
  if (match === null) {
    return value
  }

  return match[1]
}

function formatTwoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

function serializeDateWithOffset(date: Date): string {
  const year = date.getFullYear()
  const month = formatTwoDigits(date.getMonth() + 1)
  const day = formatTwoDigits(date.getDate())
  const hours = formatTwoDigits(date.getHours())
  const minutes = formatTwoDigits(date.getMinutes())
  const seconds = formatTwoDigits(date.getSeconds())

  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absoluteOffset = Math.abs(offsetMinutes)
  const offsetHours = formatTwoDigits(Math.floor(absoluteOffset / 60))
  const offsetRemainder = formatTwoDigits(absoluteOffset % 60)

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetRemainder}`
}

function serializeDateAsUtc(date: Date): string {
  return date.toISOString().replace('.000Z', 'Z')
}

function parseSingleDateValue(type: FormForgeFieldSchema['type'], value: string): FormForgeTemporalValue | null {
  try {
    if (type === 'date') {
      return parseDate(value)
    }

    if (type === 'time') {
      return parseTime(value)
    }

    if (type === 'datetime') {
      if (value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value)) {
        return parseAbsoluteToLocal(value)
      }

      return parseDateTime(stripDatetimeOffset(value))
    }
  } catch {
    return null
  }

  return null
}

function serializeSingleDateValue(
  type: FormForgeFieldSchema['type'],
  value: FormForgeDynamicValue,
  mode: FormForgeDatetimeMode
): string | null {
  if (type === 'date' || type === 'time') {
    if (hasToStringMethod(value)) {
      return value.toString()
    }

    if (typeof value === 'string') {
      return value
    }

    return null
  }

  if (type === 'datetime') {
    if (hasDateMethod(value)) {
      const date = value.toDate(getLocalTimeZone())
      return mode === 'utc' ? serializeDateAsUtc(date) : serializeDateWithOffset(date)
    }

    if (typeof value === 'string') {
      return value
    }

    return null
  }

  return null
}

function parseRangeValue(type: FormForgeFieldSchema['type'], value: FormForgeSubmissionPayload[string]): FormForgeRangeInput | null {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return null
  }

  const rangeValue = value as { start?: FormForgeSubmissionPayload[string]; end?: FormForgeSubmissionPayload[string] }
  const startValue = rangeValue.start
  const endValue = rangeValue.end

  const parsedStart = typeof startValue === 'string'
    ? parseSingleDateValue(type === 'date_range' ? 'date' : 'datetime', startValue) as DateValue | null
    : null
  const parsedEnd = typeof endValue === 'string'
    ? parseSingleDateValue(type === 'date_range' ? 'date' : 'datetime', endValue) as DateValue | null
    : null

  return {
    start: parsedStart,
    end: parsedEnd
  }
}

function serializeRangeValue(type: FormForgeFieldSchema['type'], value: FormForgeDynamicValue): FormForgeSubmissionPayload[string] {
  if (!isRangeInput(value)) {
    return {
      start: null,
      end: null
    }
  }

  const startValue = serializeSingleDateValue(type === 'date_range' ? 'date' : 'datetime', value.start, props.datetimeMode)
  const endValue = serializeSingleDateValue(type === 'date_range' ? 'date' : 'datetime', value.end, props.datetimeMode)

  return {
    start: startValue,
    end: endValue
  }
}

function normalizeSelectOptions(options: FormForgeFieldOption[] | undefined): FormForgeSelectItem[] {
  if (options === undefined) {
    return []
  }

  const items: FormForgeSelectItem[] = []

  for (const option of options) {
    if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean' || option === null) {
      items.push({
        label: String(option ?? ''),
        value: option
      })
      continue
    }

    const label = typeof option.label === 'string' ? option.label : String(option.value ?? '')

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

function getFieldValue(field: FormForgeFieldSchema): FormForgeSubmissionPayload[string] {
  return formState.value[field.name]
}

function setFieldValue(fieldName: string, value: FormForgeSubmissionPayload[string]): void {
  formState.value = {
    ...formState.value,
    [fieldName]: value
  }
}

function getComponentModelValue(field: FormForgeFieldSchema): FormForgeDynamicValue {
  const value = getFieldValue(field)

  if (field.type === 'date' || field.type === 'time' || field.type === 'datetime') {
    if (typeof value === 'string') {
      return parseSingleDateValue(field.type, value)
    }

    return null
  }

  if (field.type === 'date_range' || field.type === 'datetime_range') {
    return parseRangeValue(field.type, value)
  }

  if (field.type === 'checkbox' || field.type === 'switch') {
    return typeof value === 'boolean' ? value : false
  }

  if (field.type === 'checkbox_group') {
    return (Array.isArray(value) ? value : []) as FormForgeDynamicValue
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

  if (field.type === 'select' || field.type === 'select_menu' || field.type === 'radio' || field.type === 'checkbox_group') {
    componentProps.items = normalizeSelectOptions(field.options)
  }

  if (field.type === 'date_range' || field.type === 'datetime_range') {
    componentProps.range = true
  }

  if (field.type === 'datetime' || field.type === 'datetime_range') {
    componentProps.granularity = 'second'
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
  if (field.type === 'date' || field.type === 'time' || field.type === 'datetime') {
    setFieldValue(field.name, serializeSingleDateValue(field.type, value, props.datetimeMode))
    return
  }

  if (field.type === 'date_range' || field.type === 'datetime_range') {
    setFieldValue(field.name, serializeRangeValue(field.type, value))
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
      mode: props.uploadMode
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
      <UStepper
        v-if="shouldShowProgress && progressVariant === 'stepper'"
        class="w-full"
        :items="stepperItems"
        :model-value="activePageIndex + 1"
        :linear="false"
        @update:model-value="onStepperModelUpdate"
      />

      <UProgress
        v-if="shouldShowProgress && progressVariant === 'progress'"
        :model-value="activePageIndex + 1"
        :max="visiblePages.length"
        status
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

      <section
        v-for="page in renderedPages"
        :key="page.page_key"
        class="space-y-4"
        @focusin="setActivePage(page.page_key)"
        @pointerdown="setActivePage(page.page_key)"
      >
        <div
          v-if="page.title !== '' || (typeof page.description === 'string' && page.description !== '')"
          class="space-y-1"
        >
          <h3
            v-if="page.title !== ''"
            class="text-base font-semibold"
          >
            {{ page.title }}
          </h3>
          <p
            v-if="typeof page.description === 'string' && page.description !== ''"
            class="text-sm text-muted"
          >
            {{ page.description }}
          </p>
        </div>

        <div class="space-y-4">
          <UFormField
            v-for="field in page.fields"
            v-show="isFieldVisible(field)"
            :key="field.field_key"
            :name="field.name"
            :label="field.label"
            :help="field.help_text"
            :required="isFieldRequired(field)"
            :ui="getFieldMetaUi(field).formField"
            @focusout="() => onFieldBlur(field.name)"
          >
            <UInput
              v-if="field.type === 'text' || field.type === 'email'"
              :model-value="getLooseModelValue(field)"
              v-bind="getComponentProps(field, page)"
              @update:model-value="(nextValue) => onFieldModelUpdate(field, nextValue)"
            />

            <UTextarea
              v-else-if="field.type === 'textarea'"
              :model-value="getLooseModelValue(field)"
              v-bind="getComponentProps(field, page)"
              @update:model-value="(nextValue) => onFieldModelUpdate(field, nextValue)"
            />

            <UInputNumber
              v-else-if="field.type === 'number'"
              :model-value="getLooseModelValue(field)"
              v-bind="getComponentProps(field, page)"
              @update:model-value="(nextValue) => onFieldModelUpdate(field, nextValue)"
            />

            <USelect
              v-else-if="field.type === 'select'"
              :model-value="getLooseModelValue(field)"
              v-bind="getComponentProps(field, page)"
              @update:model-value="(nextValue) => onFieldModelUpdate(field, nextValue)"
            />

            <USelectMenu
              v-else-if="field.type === 'select_menu'"
              :model-value="getLooseModelValue(field)"
              v-bind="getComponentProps(field, page)"
              @update:model-value="(nextValue) => onFieldModelUpdate(field, nextValue)"
            />

            <URadioGroup
              v-else-if="field.type === 'radio'"
              :model-value="getLooseModelValue(field)"
              v-bind="getComponentProps(field, page)"
              @update:model-value="(nextValue) => onFieldModelUpdate(field, nextValue)"
            />

            <UCheckbox
              v-else-if="field.type === 'checkbox'"
              :model-value="getLooseModelValue(field)"
              v-bind="getComponentProps(field, page)"
              @update:model-value="(nextValue) => onFieldModelUpdate(field, nextValue)"
            />

            <UCheckboxGroup
              v-else-if="field.type === 'checkbox_group'"
              :model-value="getLooseModelValue(field)"
              v-bind="getComponentProps(field, page)"
              @update:model-value="(nextValue) => onFieldModelUpdate(field, nextValue)"
            />

            <USwitch
              v-else-if="field.type === 'switch'"
              :model-value="getLooseModelValue(field)"
              v-bind="getComponentProps(field, page)"
              @update:model-value="(nextValue) => onFieldModelUpdate(field, nextValue)"
            />

            <UInputDate
              v-else-if="field.type === 'date' || field.type === 'datetime' || field.type === 'date_range' || field.type === 'datetime_range'"
              :model-value="getLooseModelValue(field)"
              v-bind="getComponentProps(field, page)"
              @update:model-value="(nextValue) => onFieldModelUpdate(field, nextValue)"
            />

            <UInputTime
              v-else-if="field.type === 'time'"
              :model-value="getLooseModelValue(field)"
              v-bind="getComponentProps(field, page)"
              @update:model-value="(nextValue) => onFieldModelUpdate(field, nextValue)"
            />

            <UFileUpload
              v-else
              :model-value="getLooseModelValue(field)"
              v-bind="getComponentProps(field, page)"
              @update:model-value="(nextValue) => onFieldModelUpdate(field, nextValue)"
            />
          </UFormField>
        </div>
      </section>

      <div
        v-if="pagedMode"
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
          v-else-if="!usesExternalModel && showSubmit"
          type="submit"
          :loading="internalSubmit.submitting.value"
          :disabled="internalForm.loading.value || getResolvedSchema() === null"
        >
          {{ resolvedSubmitLabel }}
        </UButton>
      </div>

      <div
        v-else-if="!usesExternalModel && showSubmit"
        class="flex justify-end"
      >
        <UButton
          type="submit"
          :loading="internalSubmit.submitting.value"
          :disabled="internalForm.loading.value || getResolvedSchema() === null"
        >
          {{ resolvedSubmitLabel }}
        </UButton>
      </div>
    </div>
  </UForm>
</template>
