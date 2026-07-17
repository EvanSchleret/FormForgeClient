import type {
  FormForgeFieldSchema,
  FormForgeFieldType,
  FormForgePageLogic,
  FormForgePageLogicClause,
  FormForgePageLogicFallback,
  FormForgePageLogicOperator,
  FormForgePageLogicRule,
  FormForgePageLogicThen,
  FormForgePageSchema
} from '../types'

const TEXT_FIELD_TYPES: FormForgeFieldType[] = ['text', 'textarea', 'email']
const CHOICE_FIELD_TYPES: FormForgeFieldType[] = ['select', 'select_menu', 'radio', 'checkbox_group']
const TEMPORAL_FIELD_TYPES: FormForgeFieldType[] = ['temporal', 'date', 'time']

const TEXT_OPERATORS: FormForgePageLogicOperator[] = [
  'eq',
  'neq',
  'contains',
  'not_contains',
  'starts_with',
  'not_starts_with',
  'ends_with',
  'not_ends_with',
  'is_submitted'
]

const ADDRESS_OPERATORS: FormForgePageLogicOperator[] = [
  'is_submitted',
  'is_not_submitted'
]

const CONSENT_OPERATORS: FormForgePageLogicOperator[] = ['accepted', 'ignored']
const CHOICE_OPERATORS: FormForgePageLogicOperator[] = ['eq', 'neq']

export function isTextLikeFieldType(type: FormForgeFieldType): boolean {
  return TEXT_FIELD_TYPES.includes(type)
}

export function isChoiceFieldType(type: FormForgeFieldType): boolean {
  return CHOICE_FIELD_TYPES.includes(type)
}

export function isConsentFieldType(type: FormForgeFieldType): boolean {
  return type === 'consent'
}

export function pageLogicOperatorsForFieldType(type: FormForgeFieldType): FormForgePageLogicOperator[] {
  if (type === 'address') {
    return ADDRESS_OPERATORS
  }

  if (TEMPORAL_FIELD_TYPES.includes(type)) {
    return ADDRESS_OPERATORS
  }

  if (isConsentFieldType(type)) {
    return CONSENT_OPERATORS
  }

  if (isChoiceFieldType(type)) {
    return CHOICE_OPERATORS
  }

  return TEXT_OPERATORS
}

export function pageLogicOperatorRequiresValue(type: FormForgeFieldType, operator: FormForgePageLogicOperator): boolean {
  if (type === 'address') {
    return false
  }

  if (TEMPORAL_FIELD_TYPES.includes(type)) {
    return false
  }

  if (isConsentFieldType(type)) {
    return false
  }

  if (isChoiceFieldType(type)) {
    return operator === 'eq' || operator === 'neq'
  }

  return operator !== 'is_submitted'
}

export function createPageLogicRule(): FormForgePageLogicRule {
  return {
    rule_key: `lr_${Math.random().toString(36).slice(2, 8)}`,
    match: 'all',
    when: [
      {
        field_key: '',
        operator: 'eq',
        value: null
      }
    ],
    then: [createPageLogicThen()],
    fallback: {
      action: 'next',
      block_index: null
    }
  }
}

export function createPageLogic(): FormForgePageLogic {
  return {
    version: 1,
    rules: []
  }
}

export function normalizePageLogic(value: unknown): FormForgePageLogic {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return createPageLogic()
  }

  const candidate = value as Partial<FormForgePageLogic>
  const rules = Array.isArray(candidate.rules) ? candidate.rules : []

  return {
    version: typeof candidate.version === 'number' && Number.isFinite(candidate.version) ? candidate.version : 1,
    rules: rules
      .filter((rule): rule is FormForgePageLogicRule => rule !== null && typeof rule === 'object' && !Array.isArray(rule))
      .map((rule) => normalizePageLogicRule(rule))
  }
}

export function normalizePageLogicRule(value: Partial<FormForgePageLogicRule>): FormForgePageLogicRule {
  const when = Array.isArray(value.when) ? value.when : []
  const nextWhen = when
    .filter((clause): clause is FormForgePageLogicClause => clause !== null && typeof clause === 'object' && !Array.isArray(clause))
    .map((clause) => normalizePageLogicClause(clause))
  const thenSource = (value as { then?: unknown }).then
  const thenList = Array.isArray(thenSource)
    ? thenSource
    : [thenSource]

  return {
    rule_key: typeof value.rule_key === 'string' && value.rule_key !== ''
      ? value.rule_key
      : `lr_${Math.random().toString(36).slice(2, 8)}`,
    match: value.match === 'any' ? 'any' : 'all',
    when: nextWhen.length > 0 ? nextWhen : [createPageLogicRule().when[0]],
    then: (() => {
      const normalizedThen = thenList
        .filter((entry): entry is Partial<FormForgePageLogicThen> | undefined => entry !== null && entry !== '')
        .map((entry) => normalizePageLogicThen(entry as Partial<FormForgePageLogicThen> | undefined))

      const dedupedThen: FormForgePageLogicThen[] = []
      const seenRequireFieldKeys = new Set<string>()

      for (const thenAction of normalizedThen) {
        if (thenAction.action === 'require' && typeof thenAction.field_key === 'string' && thenAction.field_key !== '') {
          if (seenRequireFieldKeys.has(thenAction.field_key)) {
            continue
          }

          seenRequireFieldKeys.add(thenAction.field_key)
        }

        dedupedThen.push(thenAction)
      }

      return dedupedThen.length > 0 ? dedupedThen : [createPageLogicThen()]
    })(),
    fallback: normalizePageLogicFallback(value.fallback)
  }
}

export function normalizePageLogicClause(value: Partial<FormForgePageLogicClause>): FormForgePageLogicClause {
  return {
    field_key: typeof value.field_key === 'string' ? value.field_key : '',
    operator: isPageLogicOperator(value.operator) ? value.operator : 'eq',
    value: value.value ?? null
  }
}

export function normalizePageLogicThen(value: Partial<FormForgePageLogicThen> | undefined): FormForgePageLogicThen {
  return {
    action: value?.action === 'goto_block' ? 'goto_block' : 'require',
    field_key: typeof value?.field_key === 'string' ? value.field_key : null,
    block_index: normalizeNullableBlockIndex(value?.block_index)
  }
}

export function normalizePageLogicFallback(value: Partial<FormForgePageLogicFallback> | undefined): FormForgePageLogicFallback {
  return {
    action: value?.action === 'goto_block' ? 'goto_block' : 'next',
    block_index: normalizeNullableBlockIndex(value?.block_index)
  }
}

export function createPageLogicThen(): FormForgePageLogicThen {
  return {
    action: 'require',
    field_key: null,
    block_index: null
  }
}

export function ensurePageLogic(page: FormForgePageSchema): FormForgePageLogic {
  const meta = ensurePageMeta(page)

  if (!isPageLogic(meta.logic)) {
    meta.logic = createPageLogic() as unknown
  } else {
    meta.logic = normalizePageLogic(meta.logic) as unknown
  }

  return meta.logic as FormForgePageLogic
}

export function getPageLogic(page: FormForgePageSchema): FormForgePageLogic {
  const meta = ensurePageMeta(page)
  return normalizePageLogic(meta.logic as unknown)
}

export function getPageLogicRuleQuestions(page: FormForgePageSchema): FormForgeFieldSchema[] {
  return Array.isArray(page.fields) ? page.fields : []
}

export function getFuturePageQuestions(pages: FormForgePageSchema[], pageIndex: number): FormForgeFieldSchema[] {
  const fields: FormForgeFieldSchema[] = []

  for (let index = pageIndex + 1; index < pages.length; index += 1) {
    const page = pages[index]
    if (!page || !Array.isArray(page.fields)) {
      continue
    }

    fields.push(...page.fields)
  }

  return fields
}

export function getCurrentAndFuturePageQuestions(pages: FormForgePageSchema[], pageIndex: number): FormForgeFieldSchema[] {
  const fields: FormForgeFieldSchema[] = []

  for (let index = pageIndex; index < pages.length; index += 1) {
    const page = pages[index]
    if (!page || !Array.isArray(page.fields)) {
      continue
    }

    fields.push(...page.fields)
  }

  return fields
}

export function findFieldByKey(page: FormForgePageSchema, fieldKey: string): FormForgeFieldSchema | undefined {
  return Array.isArray(page.fields) ? page.fields.find((field) => field.field_key === fieldKey) : undefined
}

export function evaluatePageLogicClause(
  clause: FormForgePageLogicClause,
  field: FormForgeFieldSchema | undefined,
  actualValue: unknown,
): boolean {
  if (field === undefined) {
    return false
  }

  if (clause.operator === 'accepted') {
    return actualValue === true
  }

  if (clause.operator === 'ignored') {
    return actualValue !== true
  }

  if (clause.operator === 'is_submitted') {
    return !isEmptyValue(actualValue)
  }

  if (clause.operator === 'is_not_submitted') {
    return isEmptyValue(actualValue)
  }

  if (clause.operator === 'eq') {
    return areValuesEqual(actualValue, clause.value)
  }

  if (clause.operator === 'neq') {
    return !areValuesEqual(actualValue, clause.value)
  }

  if (typeof actualValue !== 'string') {
    return false
  }

  const actual = actualValue
  const expected = typeof clause.value === 'string' ? clause.value : String(clause.value ?? '')

  if (clause.operator === 'contains') {
    return actual.includes(expected)
  }

  if (clause.operator === 'not_contains') {
    return !actual.includes(expected)
  }

  if (clause.operator === 'starts_with') {
    return actual.startsWith(expected)
  }

  if (clause.operator === 'not_starts_with') {
    return !actual.startsWith(expected)
  }

  if (clause.operator === 'ends_with') {
    return actual.endsWith(expected)
  }

  if (clause.operator === 'not_ends_with') {
    return !actual.endsWith(expected)
  }

  return false
}

export function evaluatePageLogicRule(
  rule: FormForgePageLogicRule,
  page: FormForgePageSchema,
  getActualValue: (field: FormForgeFieldSchema) => unknown,
): boolean {
  if (!Array.isArray(rule.when) || rule.when.length === 0) {
    return false
  }

  const results = rule.when.map((clause) => {
    const field = findFieldByKey(page, clause.field_key)
    const actualValue = field === undefined ? undefined : getActualValue(field)
    return evaluatePageLogicClause(clause, field, actualValue)
  })

  if (rule.match === 'any') {
    return results.includes(true)
  }

  return !results.includes(false)
}

export function resolvePageLogicJumpTarget(
  rule: FormForgePageLogicRule,
  currentPageIndex: number,
  pageCount: number,
): number | null {
  const fallbackIndex = normalizeJumpIndex(rule.fallback.block_index, currentPageIndex, pageCount)

  for (const thenAction of rule.then) {
    const thenIndex = normalizeJumpIndex(thenAction.block_index, currentPageIndex, pageCount)

    if (thenAction.action === 'goto_block' && thenIndex !== null) {
      return thenIndex
    }
  }

  if (rule.fallback.action === 'goto_block' && fallbackIndex !== null) {
    return fallbackIndex
  }

  return null
}

export function normalizeJumpIndex(value: unknown, currentPageIndex: number, pageCount: number): number | null {
  const numeric = normalizeNullableBlockIndex(value)

  if (numeric === null) {
    return null
  }

  const zeroBased = numeric - 1

  if (zeroBased < 0 || zeroBased >= pageCount) {
    return null
  }

  if (zeroBased <= currentPageIndex) {
    return null
  }

  return zeroBased
}

function normalizeNullableBlockIndex(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  const normalized = Math.trunc(value)
  return normalized > 0 ? normalized : null
}

function ensurePageMeta(page: FormForgePageSchema): Record<string, unknown> {
  if (typeof page.meta !== 'object' || page.meta === null || Array.isArray(page.meta)) {
    page.meta = {}
  }

  return page.meta as Record<string, unknown>
}

function isPageLogic(value: unknown): value is FormForgePageLogic {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Array.isArray((value as FormForgePageLogic).rules)
}

function isPageLogicOperator(value: unknown): value is FormForgePageLogicOperator {
  return typeof value === 'string' && [
    'eq',
    'neq',
    'contains',
    'not_contains',
    'starts_with',
    'not_starts_with',
    'ends_with',
    'not_ends_with',
    'is_submitted',
    'is_not_submitted',
    'accepted',
    'ignored'
  ].includes(value)
}

function areValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false
    }

    return left.every((entry, index) => areValuesEqual(entry, right[index]))
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
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim() === ''
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value)

    if (entries.length === 0) {
      return true
    }

    return entries.every(([, entry]) => isEmptyValue(entry))
  }

  return false
}
