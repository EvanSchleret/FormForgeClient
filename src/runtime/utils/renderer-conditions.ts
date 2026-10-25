import type {
  FormForgeConditionClause,
  FormForgeFieldSchema,
  FormForgeFormSchema,
  FormForgePageLogic,
  FormForgePageSchema,
  FormForgeSubmissionPayload
} from '../types'
import { evaluatePageLogicRule } from './page-logic'

export interface FormForgePageRuntimeState {
  visible: boolean
  disabled: boolean
}

export interface FormForgeFieldRuntimeState {
  visible: boolean
  disabled: boolean
  required: boolean
}

type FormForgeRuntimeConditionState = {
  pages: Record<string, FormForgePageRuntimeState>
  fields: Record<string, FormForgeFieldRuntimeState>
}

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
      const rangeValue = value as { start?: unknown, end?: unknown }
      return isEmptyValue(rangeValue.start) && isEmptyValue(rangeValue.end)
    }

    return Object.values(value).every((entry) => isEmptyValue(entry))
  }

  return false
}

export function areFormForgeRuntimeValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false
    }

    return left.every((leftItem, index) => areFormForgeRuntimeValuesEqual(leftItem, right[index]))
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)

    if (leftKeys.length !== rightKeys.length) {
      return false
    }

    for (const key of leftKeys) {
      if (!areFormForgeRuntimeValuesEqual(left[key], right[key])) {
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

function evaluateConditionClause(
  clause: FormForgeConditionClause,
  fieldsByKey: Record<string, FormForgeFieldSchema>,
  payload: FormForgeSubmissionPayload
): boolean {
  const field = fieldsByKey[clause.field_key]
  const actualValue = field === undefined ? undefined : payload[field.name]
  const expectedValue = clause.value

  if (clause.operator === 'eq') {
    return areFormForgeRuntimeValuesEqual(actualValue, expectedValue)
  }

  if (clause.operator === 'neq') {
    return !areFormForgeRuntimeValuesEqual(actualValue, expectedValue)
  }

  if (clause.operator === 'in') {
    if (Array.isArray(expectedValue)) {
      if (Array.isArray(actualValue)) {
        return actualValue.some((item) => expectedValue.some((entry) => areFormForgeRuntimeValuesEqual(item, entry)))
      }

      return expectedValue.some((entry) => areFormForgeRuntimeValuesEqual(actualValue, entry))
    }

    if (Array.isArray(actualValue)) {
      return actualValue.some((entry) => areFormForgeRuntimeValuesEqual(entry, expectedValue))
    }

    return areFormForgeRuntimeValuesEqual(actualValue, expectedValue)
  }

  if (clause.operator === 'not_in') {
    return !evaluateConditionClause({ ...clause, operator: 'in' }, fieldsByKey, payload)
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
      return actualValue.some((entry) => areFormForgeRuntimeValuesEqual(entry, expectedValue))
    }

    if (isPlainObject(actualValue) && typeof expectedValue === 'string') {
      return expectedValue in actualValue
    }

    return false
  }

  if (clause.operator === 'not_contains') {
    return !evaluateConditionClause({ ...clause, operator: 'contains' }, fieldsByKey, payload)
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
  condition: NonNullable<FormForgeFormSchema['conditions']>[number],
  fieldsByKey: Record<string, FormForgeFieldSchema>,
  payload: FormForgeSubmissionPayload
): boolean {
  if (!Array.isArray(condition.when) || condition.when.length === 0) {
    return false
  }

  const evaluateClause = (clause: FormForgeConditionClause): boolean => evaluateConditionClause(clause, fieldsByKey, payload)

  return condition.match === 'any'
    ? condition.when.some(evaluateClause)
    : condition.when.every(evaluateClause)
}

function applyPageLogicRequirements(
  pages: FormForgePageSchema[],
  pageLogicByKey: Record<string, FormForgePageLogic>,
  payload: FormForgeSubmissionPayload,
  fields: Record<string, FormForgeFieldRuntimeState>
): void {
  const requiredByLogic = new Set<string>()

  for (const [pageKey, logic] of Object.entries(pageLogicByKey)) {
    const page = pages.find((item) => item.page_key === pageKey)
    if (page === undefined) {
      continue
    }

    for (const rule of logic.rules) {
      if (!evaluatePageLogicRule(rule, page, (field) => payload[field.name])) {
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
    const fieldState = fields[fieldKey]
    if (fieldState !== undefined) {
      fieldState.required = true
    }
  }
}

export function resolveFormForgeRendererConditions(
  schema: FormForgeFormSchema | null,
  pages: FormForgePageSchema[],
  pageLogicByKey: Record<string, FormForgePageLogic>,
  payload: FormForgeSubmissionPayload
): FormForgeRuntimeConditionState {
  const pagesState: Record<string, FormForgePageRuntimeState> = {}
  const fieldsState: Record<string, FormForgeFieldRuntimeState> = {}
  const fieldsByKey: Record<string, FormForgeFieldSchema> = {}

  for (const page of pages) {
    pagesState[page.page_key] = {
      visible: true,
      disabled: false
    }

    for (const field of page.fields) {
      fieldsByKey[field.field_key] = field
      fieldsState[field.field_key] = {
        visible: true,
        disabled: field.disabled === true,
        required: field.required === true
      }
    }
  }

  if (
    schema === null
    || Object.values(pageLogicByKey).some((logic) => logic.rules.length > 0)
    || !Array.isArray(schema.conditions)
  ) {
    applyPageLogicRequirements(pages, pageLogicByKey, payload, fieldsState)
    return { pages: pagesState, fields: fieldsState }
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
    if (!evaluateCondition(condition, fieldsByKey, payload)) {
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

  applyPageLogicRequirements(pages, pageLogicByKey, payload, fieldsState)

  return { pages: pagesState, fields: fieldsState }
}
