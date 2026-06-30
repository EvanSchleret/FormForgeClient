import { z } from 'zod'
import type {
  FormForgeFieldSchema,
  FormForgeFieldValidationConfig,
  FormForgeFieldValidationRule,
  FormForgeFormSchema,
  FormForgeTemporalValidationRangeValue,
  FormForgeSubmissionPayload
} from '../types'
import type { FormForgeSubmissionScalarValue } from '../types/api'
import { createDefaultAddressFields } from '../utils/defaults'
import { resolveTemporalMode } from '../utils/temporal'

export interface FormForgeZodValidationOptions {
  locale?: string
}

interface FormForgeZodValidationMessages {
  required: string
  validationFailed: string
  invalidString: string
  invalidNumber: string
  invalidBoolean: string
  invalidSelection: string
  invalidAddress: string
  invalidFile: string
  invalidDate: string
  invalidTime: string
  invalidEmail: string
  minLength: (value: number) => string
  maxLength: (value: number) => string
  minItems: (value: number) => string
  maxItems: (value: number) => string
  minValue: (value: number) => string
  maxValue: (value: number) => string
  textMin: (label: string, value: number) => string
  textMax: (label: string, value: number) => string
  textRegex: (label: string) => string
  textEquals: (label: string, value: string) => string
  textNotEquals: (label: string, value: string) => string
  textContains: (label: string, value: string) => string
  textNotContains: (label: string, value: string) => string
  temporalAfter: (label: string, value: string) => string
  temporalBefore: (label: string, value: string) => string
  temporalBetween: (label: string, start: string, end: string) => string
  temporalNotBetween: (label: string, start: string, end: string) => string
}

function normalizeLocale(locale: string | undefined): 'en' | 'fr' {
  if (locale === undefined || locale === '') {
    return 'en'
  }

  return locale.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

function resolveLocaleMessages(locale: string | undefined): FormForgeZodValidationMessages {
  const normalizedLocale = normalizeLocale(locale)

  if (normalizedLocale === 'fr') {
    return {
      required: 'Ce champ est requis',
      validationFailed: 'La valeur ne respecte pas les règles de validation',
      invalidString: 'Veuillez saisir un texte valide',
      invalidNumber: 'Veuillez saisir un nombre valide',
      invalidBoolean: 'Veuillez saisir une réponse valide',
      invalidSelection: 'Veuillez sélectionner une option valide',
      invalidAddress: 'Veuillez saisir une adresse valide',
      invalidFile: 'Veuillez sélectionner un fichier valide',
      invalidDate: 'Veuillez saisir une date valide',
      invalidTime: 'Veuillez saisir une heure valide',
      invalidEmail: 'Veuillez saisir une adresse e-mail valide',
      minLength: (value: number) => `Veuillez saisir au moins ${value} caractères`,
      maxLength: (value: number) => `Veuillez saisir au plus ${value} caractères`,
      minItems: (value: number) => `Veuillez sélectionner au moins ${value} éléments`,
      maxItems: (value: number) => `Veuillez sélectionner au plus ${value} éléments`,
      minValue: (value: number) => `Veuillez saisir une valeur supérieure ou égale à ${value}`,
      maxValue: (value: number) => `Veuillez saisir une valeur inférieure ou égale à ${value}`,
      textMin: (label: string, value: number) => `${label} doit contenir au moins ${value} caractères`,
      textMax: (label: string, value: number) => `${label} doit contenir au plus ${value} caractères`,
      textRegex: (label: string) => `${label} doit respecter le format attendu`,
      textEquals: (label: string, value: string) => `${label} doit être égal à ${value}`,
      textNotEquals: (label: string, value: string) => `${label} ne doit pas être égal à ${value}`,
      textContains: (label: string, value: string) => `${label} doit contenir ${value}`,
      textNotContains: (label: string, value: string) => `${label} ne doit pas contenir ${value}`,
      temporalAfter: (label: string, value: string) => `${label} doit être postérieur à ${value}`,
      temporalBefore: (label: string, value: string) => `${label} doit être antérieur à ${value}`,
      temporalBetween: (label: string, start: string, end: string) => `${label} doit être compris entre ${start} et ${end}`,
      temporalNotBetween: (label: string, start: string, end: string) => `${label} ne doit pas être compris entre ${start} et ${end}`
    }
  }

  return {
    required: 'This field is required',
    validationFailed: 'The value does not meet the validation rules',
    invalidString: 'Please enter a valid text value',
    invalidNumber: 'Please enter a valid number',
    invalidBoolean: 'Please enter a valid response',
    invalidSelection: 'Please select a valid option',
    invalidAddress: 'Please enter a valid address',
    invalidFile: 'Please select a valid file',
    invalidDate: 'Please enter a valid date',
    invalidTime: 'Please enter a valid time',
    invalidEmail: 'Please enter a valid email address',
    minLength: (value: number) => `Please enter at least ${value} characters`,
    maxLength: (value: number) => `Please enter no more than ${value} characters`,
    minItems: (value: number) => `Please select at least ${value} items`,
    maxItems: (value: number) => `Please select no more than ${value} items`,
    minValue: (value: number) => `Please enter a value greater than or equal to ${value}`,
    maxValue: (value: number) => `Please enter a value less than or equal to ${value}`,
    textMin: (label: string, value: number) => `${label} must contain at least ${value} characters`,
    textMax: (label: string, value: number) => `${label} must contain no more than ${value} characters`,
    textRegex: (label: string) => `${label} must match the expected format`,
    textEquals: (label: string, value: string) => `${label} must be equal to ${value}`,
    textNotEquals: (label: string, value: string) => `${label} must not be equal to ${value}`,
    textContains: (label: string, value: string) => `${label} must contain ${value}`,
    textNotContains: (label: string, value: string) => `${label} must not contain ${value}`,
    temporalAfter: (label: string, value: string) => `${label} must be after ${value}`,
    temporalBefore: (label: string, value: string) => `${label} must be before ${value}`,
    temporalBetween: (label: string, start: string, end: string) => `${label} must be between ${start} and ${end}`,
    temporalNotBetween: (label: string, start: string, end: string) => `${label} must not be between ${start} and ${end}`
  }
}

function plainTextLabel(value: string | null | undefined, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback.replaceAll(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
  }

  const cleaned = value.replace(/<[^>]*>/g, '').trim()
  if (cleaned !== '') {
    return cleaned
  }

  return fallback.replaceAll(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function isMissingValue(value: unknown): boolean {
  return value === undefined || value === null
}

function typeError(requiredMessage: string, invalidMessage: string): (issue: { input?: unknown }) => string {
  return (issue: { input?: unknown }) => {
    if (isMissingValue(issue.input)) {
      return requiredMessage
    }

    return invalidMessage
  }
}

function buildScalarOptionSchema(messages: FormForgeZodValidationMessages): z.ZodType<FormForgeSubmissionScalarValue> {
  return z.union([z.string(), z.number(), z.boolean(), z.null()], {
    error: typeError(messages.required, messages.invalidSelection)
  })
}

function resolveLocaleErrorMap(locale: string | undefined) {
  const normalizedLocale = normalizeLocale(locale)

  if (normalizedLocale === 'fr') {
    return z.locales.fr().localeError
  }

  return z.locales.en().localeError
}

function isBlankAddressValue(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  return Object.values(value as Record<string, unknown>).every((item) => {
    if (item === undefined || item === null) {
      return true
    }

    if (typeof item === 'string') {
      return item.trim() === ''
    }

    return false
  })
}

function addressFieldDefinitions(
  field: FormForgeFieldSchema,
  locale?: string
): Array<{ key: string, label: string, visible: boolean, required: boolean }> {
  if (!Array.isArray(field.address_fields) || field.address_fields.length === 0) {
    return createDefaultAddressFields(locale)
  }

  const defaults = createDefaultAddressFields(locale)

  return field.address_fields.map((candidate, index) => ({
    key: candidate.key,
    label: typeof candidate.label === 'string' && candidate.label !== '' ? candidate.label : (defaults[index]?.label ?? `Field ${index + 1}`),
    visible: candidate.visible !== false,
    required: candidate.required === true
  }))
}

function fieldValidationConfig(field: FormForgeFieldSchema): FormForgeFieldValidationConfig | null {
  if (typeof field.meta !== 'object' || field.meta === null || Array.isArray(field.meta)) {
    return null
  }

  const validation = field.meta.validation
  if (validation === undefined || validation === null || Array.isArray(validation) || typeof validation !== 'object') {
    return null
  }

  const candidate = validation as { match?: unknown, rules?: unknown }
  if ((candidate.match !== 'all' && candidate.match !== 'any') || !Array.isArray(candidate.rules)) {
    return null
  }

  return {
    match: candidate.match,
    rules: candidate.rules as FormForgeFieldValidationRule[]
  }
}

function isValidationRuleNumeric(rule: FormForgeFieldValidationRule): boolean {
  return rule.operator === 'min' || rule.operator === 'max'
}

function validationFieldLabel(field: FormForgeFieldSchema): string {
  return plainTextLabel(field.label, field.name)
}

function validationAddressFieldLabel(field: FormForgeFieldSchema, target: string, locale?: string): string {
  const addressField = addressFieldDefinitions(field, locale).find((candidate) => candidate.key === target)

  if (addressField === undefined) {
    return target
  }

  return plainTextLabel(addressField.label, target)
}

function validationRuleMessage(
  subjectLabel: string,
  rule: FormForgeFieldValidationRule,
  messages: FormForgeZodValidationMessages
): string {
  if (rule.operator === 'min') {
    const value = Number.parseFloat(String(rule.value ?? 0))
    return messages.textMin(subjectLabel, Number.isNaN(value) ? 0 : value)
  }

  if (rule.operator === 'max') {
    const value = Number.parseFloat(String(rule.value ?? 0))
    return messages.textMax(subjectLabel, Number.isNaN(value) ? 0 : value)
  }

  if (rule.operator === 'regex') {
    return messages.textRegex(subjectLabel)
  }

  if (rule.operator === 'eq') {
    return messages.textEquals(subjectLabel, String(rule.value ?? ''))
  }

  if (rule.operator === 'neq') {
    return messages.textNotEquals(subjectLabel, String(rule.value ?? ''))
  }

  if (rule.operator === 'contains') {
    return messages.textContains(subjectLabel, String(rule.value ?? ''))
  }

  if (rule.operator === 'not_contains') {
    return messages.textNotContains(subjectLabel, String(rule.value ?? ''))
  }

  if (rule.operator === 'after') {
    return messages.temporalAfter(subjectLabel, String(rule.value ?? ''))
  }

  if (rule.operator === 'before') {
    return messages.temporalBefore(subjectLabel, String(rule.value ?? ''))
  }

  if (rule.operator === 'between' || rule.operator === 'not_between') {
    const rangeValue = temporalValidationRangeValue(rule.value)
    const start = rangeValue?.start ?? ''
    const end = rangeValue?.end ?? ''

    if (rule.operator === 'between') {
      return messages.temporalBetween(subjectLabel, start, end)
    }

    return messages.temporalNotBetween(subjectLabel, start, end)
  }

  return messages.validationFailed
}

function parseValidationRuleValue(rule: FormForgeFieldValidationRule): string | number {
  if (isValidationRuleNumeric(rule)) {
    const parsed = typeof rule.value === 'number' ? rule.value : Number.parseFloat(String(rule.value))
    return Number.isNaN(parsed) ? 0 : parsed
  }

  return typeof rule.value === 'string' ? rule.value : String(rule.value ?? '')
}

function evaluateTextValidationRule(value: string, rule: FormForgeFieldValidationRule): boolean | null {
  const ruleValue = parseValidationRuleValue(rule)

  if (rule.operator === 'min') {
    return value.length >= Number(ruleValue)
  }

  if (rule.operator === 'max') {
    return value.length <= Number(ruleValue)
  }

  if (rule.operator === 'eq') {
    return value === String(ruleValue)
  }

  if (rule.operator === 'neq') {
    return value !== String(ruleValue)
  }

  if (rule.operator === 'contains') {
    return value.includes(String(ruleValue))
  }

  if (rule.operator === 'not_contains') {
    return !value.includes(String(ruleValue))
  }

  if (rule.operator === 'regex') {
    try {
      return new RegExp(String(ruleValue)).test(value)
    }
    catch {
      return false
    }
  }

  return null
}

function parseTemporalComparable(value: string, temporalMode: string): number | null {
  if (temporalMode === 'time') {
    const match = value.trim().match(/^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/)
    if (match === null) {
      return null
    }

    const hours = Number.parseInt(match[1] ?? '0', 10)
    const minutes = Number.parseInt(match[2] ?? '0', 10)
    const seconds = Number.parseInt(match[3] ?? '0', 10)
    const milliseconds = Number.parseInt((match[4] ?? '0').padEnd(3, '0'), 10)

    return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds
  }

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match === null) {
    return null
  }

  const year = Number.parseInt(match[1] ?? '0', 10)
  const month = Number.parseInt(match[2] ?? '0', 10)
  const day = Number.parseInt(match[3] ?? '0', 10)

  return Date.UTC(year, month - 1, day)
}

function temporalValidationRangeValue(value: unknown): FormForgeTemporalValidationRangeValue | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  const candidate = value as { start?: unknown; end?: unknown }

  return {
    start: typeof candidate.start === 'string' ? candidate.start : null,
    end: typeof candidate.end === 'string' ? candidate.end : null
  }
}

function evaluateTemporalValidationRule(value: string, rule: FormForgeFieldValidationRule, temporalMode: string): boolean | null {
  const actualComparable = parseTemporalComparable(value, temporalMode)
  const operator = rule.operator

  if (operator === 'between' || operator === 'not_between') {
    const rangeValue = temporalValidationRangeValue(rule.value)
    if (rangeValue === null) {
      return null
    }

    const startComparable = rangeValue.start === null ? null : parseTemporalComparable(rangeValue.start, temporalMode)
    const endComparable = rangeValue.end === null ? null : parseTemporalComparable(rangeValue.end, temporalMode)

    if (actualComparable === null || startComparable === null || endComparable === null) {
      return null
    }

    const isBetween = actualComparable >= startComparable && actualComparable <= endComparable
    return operator === 'between' ? isBetween : !isBetween
  }

  const ruleComparable = parseTemporalComparable(typeof rule.value === 'string' ? rule.value : String(rule.value ?? ''), temporalMode)

  if (actualComparable === null || ruleComparable === null) {
    return null
  }

  if (operator === 'after') {
    return actualComparable > ruleComparable
  }

  if (operator === 'before') {
    return actualComparable < ruleComparable
  }

  if (operator === 'min') {
    return actualComparable >= ruleComparable
  }

  if (operator === 'max') {
    return actualComparable <= ruleComparable
  }

  if (operator === 'eq') {
    return actualComparable === ruleComparable
  }

  if (operator === 'neq') {
    return actualComparable !== ruleComparable
  }

  return null
}

function applyTextValidationRules(
  baseSchema: z.ZodString,
  field: FormForgeFieldSchema,
  messages: FormForgeZodValidationMessages
): z.ZodTypeAny {
  const config = fieldValidationConfig(field)
  if (config === null || config.rules.length === 0) {
    return baseSchema
  }

  return baseSchema.superRefine((value: string, context) => {
    const results = config.rules.map((rule) => ({
      rule,
      result: evaluateTextValidationRule(value, rule)
    }))
    const validResults = results.filter((candidate) => candidate.result !== null)

    if (validResults.length === 0) {
      return
    }

    if (config.match === 'any') {
      if (validResults.some((candidate) => candidate.result === true)) {
        return
      }

      for (const candidate of validResults) {
        if (candidate.result === false) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: validationRuleMessage(validationFieldLabel(field), candidate.rule, messages)
          })
        }
      }

      return
    }

    for (const candidate of validResults) {
      if (candidate.result === false) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: validationRuleMessage(validationFieldLabel(field), candidate.rule, messages)
        })
      }
    }
  })
}

function applyAddressValidationRules(
  baseSchema: z.ZodObject<Record<string, z.ZodTypeAny>>,
  field: FormForgeFieldSchema,
  messages: FormForgeZodValidationMessages,
  locale?: string
): z.ZodTypeAny {
  const config = fieldValidationConfig(field)
  if (config === null || config.rules.length === 0) {
    return baseSchema
  }

  return baseSchema.superRefine((value: Record<string, unknown>, context) => {
    const results = config.rules.map((rule) => {
      const target = typeof rule.target === 'string' ? rule.target : ''
      if (target === '') {
        return {
          rule,
          result: null
        }
      }

      const actualValue = value[target]
      if (typeof actualValue !== 'string') {
        return {
          rule,
          result: false
        }
      }

      return {
        rule,
        result: evaluateTextValidationRule(actualValue, rule)
      }
    })

    const validResults = results.filter((candidate) => candidate.result !== null)
    if (validResults.length === 0) {
      return
    }

    if (config.match === 'any') {
      if (validResults.some((candidate) => candidate.result === true)) {
        return
      }
    }

    for (const candidate of validResults) {
      if (candidate.result === false) {
        const target = typeof candidate.rule.target === 'string' ? candidate.rule.target : ''
        const message = validationRuleMessage(
          validationAddressFieldLabel(field, target, locale),
          candidate.rule,
          messages
        )

        if (target === '') {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message
          })
          continue
        }

        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [target],
          message
        })
      }
    }
  })
}

function applySharedStringRules(baseSchema: z.ZodString, rules: string[], messages: FormForgeZodValidationMessages): z.ZodString {
  let schema: z.ZodString = baseSchema

  for (const rawRule of rules) {
    const [ruleName, ruleArgument] = rawRule.split(':')

    if (ruleName === 'email') {
      schema = schema.email({
        error: messages.invalidEmail
      })
      continue
    }

    if (ruleName === 'min' && ruleArgument !== undefined) {
      const parsedMin = Number.parseInt(ruleArgument, 10)
      if (!Number.isNaN(parsedMin)) {
        schema = schema.min(parsedMin, {
          error: messages.minLength(parsedMin)
        })
      }
      continue
    }

    if (ruleName === 'max' && ruleArgument !== undefined) {
      const parsedMax = Number.parseInt(ruleArgument, 10)
      if (!Number.isNaN(parsedMax)) {
        schema = schema.max(parsedMax, {
          error: messages.maxLength(parsedMax)
        })
      }
      continue
    }
  }

  return schema
}

function applyArrayRules(baseSchema: z.ZodArray<z.ZodTypeAny>, rules: string[], messages: FormForgeZodValidationMessages): z.ZodArray<z.ZodTypeAny> {
  let schema: z.ZodArray<z.ZodTypeAny> = baseSchema

  for (const rawRule of rules) {
    const [ruleName, ruleArgument] = rawRule.split(':')

    if (ruleName === 'min' && ruleArgument !== undefined) {
      const parsedMin = Number.parseInt(ruleArgument, 10)
      if (!Number.isNaN(parsedMin)) {
        schema = schema.min(parsedMin, {
          error: messages.minItems(parsedMin)
        })
      }
      continue
    }

    if (ruleName === 'max' && ruleArgument !== undefined) {
      const parsedMax = Number.parseInt(ruleArgument, 10)
      if (!Number.isNaN(parsedMax)) {
        schema = schema.max(parsedMax, {
          error: messages.maxItems(parsedMax)
        })
      }
      continue
    }
  }

  return schema
}

function applyNumberRules(baseSchema: z.ZodNumber, rules: string[], messages: FormForgeZodValidationMessages): z.ZodNumber {
  let schema: z.ZodNumber = baseSchema

  for (const rawRule of rules) {
    const [ruleName, ruleArgument] = rawRule.split(':')

    if (ruleName === 'min' && ruleArgument !== undefined) {
      const parsedMin = Number.parseFloat(ruleArgument)
      if (!Number.isNaN(parsedMin)) {
        schema = schema.min(parsedMin, {
          error: messages.minValue(parsedMin)
        })
      }
      continue
    }

    if (ruleName === 'max' && ruleArgument !== undefined) {
      const parsedMax = Number.parseFloat(ruleArgument)
      if (!Number.isNaN(parsedMax)) {
        schema = schema.max(parsedMax, {
          error: messages.maxValue(parsedMax)
        })
      }
      continue
    }
  }

  return schema
}

function buildFieldBaseSchema(
  field: FormForgeFieldSchema,
  messages: FormForgeZodValidationMessages,
  locale?: string
): z.ZodTypeAny {
  if (field.type === 'text' || field.type === 'textarea' || field.type === 'email') {
    const baseSchema = applySharedStringRules(z.string({
      error: typeError(messages.required, messages.invalidString)
    }), field.rules, messages)

    if (field.type === 'email') {
      return applyTextValidationRules(baseSchema.email({
        error: messages.invalidEmail
      }), field, messages)
    }

    return applyTextValidationRules(baseSchema, field, messages)
  }

  if (field.type === 'number') {
    return applyNumberRules(z.number({
      error: typeError(messages.required, messages.invalidNumber)
    }), field.rules, messages)
  }

  if (field.type === 'select' || field.type === 'select_menu' || field.type === 'radio') {
    return buildScalarOptionSchema(messages)
  }

  if (field.type === 'checkbox' || field.type === 'consent' || field.type === 'switch') {
    return z.boolean({
      error: typeError(messages.required, messages.invalidBoolean)
    })
  }

  if (field.type === 'checkbox_group') {
    return applyArrayRules(z.array(buildScalarOptionSchema(messages), {
      error: typeError(messages.required, messages.invalidSelection)
    }), field.rules, messages)
  }

  if (field.type === 'temporal' || field.type === 'date' || field.type === 'time') {
    const temporalMode = resolveTemporalMode(field)
    const invalidMessage = temporalMode === 'time' ? messages.invalidTime : messages.invalidDate
    const baseSchema = applySharedStringRules(z.string({
      error: typeError(messages.required, invalidMessage)
    }), field.rules, messages)

    return baseSchema.refine((value: string) => {
      return parseTemporalComparable(value, temporalMode) !== null
    }, {
      message: invalidMessage
    }).superRefine((value: string, context) => {
      const config = fieldValidationConfig(field)
      if (config === null || config.rules.length === 0) {
        return
      }

      const results = config.rules.map((rule) => ({
        rule,
        result: evaluateTemporalValidationRule(value, rule, temporalMode)
      }))
      const validResults = results.filter((candidate) => candidate.result !== null)

      if (validResults.length === 0) {
        return
      }

      if (config.match === 'any') {
        if (validResults.some((candidate) => candidate.result === true)) {
          return
        }
      }

      for (const candidate of validResults) {
        if (candidate.result === false) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: validationRuleMessage(validationFieldLabel(field), candidate.rule, messages)
          })
        }
      }
    })
  }

  if (field.type === 'file') {
    const fileSchema = z.custom<File>((value: unknown): value is File => {
      if (typeof File === 'undefined') {
        return false
      }

      return value instanceof File
    }, {
      error: typeError(messages.required, messages.invalidFile)
    })

    if (field.multiple === true) {
      return z.array(fileSchema, {
        error: typeError(messages.required, messages.invalidFile)
      })
    }

    return fileSchema
  }

  if (field.type === 'address') {
    const shape: Record<string, z.ZodTypeAny> = {}

    for (const addressField of addressFieldDefinitions(field, locale)) {
      if (!addressField.visible) {
        continue
      }

      shape[addressField.key] = z.union([z.string(), z.null()]).optional()
    }

    return applyAddressValidationRules(z.object(shape, {
      error: typeError(messages.required, messages.invalidAddress)
    }).superRefine((value, context) => {
      const topLevelRequired = field.required === true

      for (const addressField of addressFieldDefinitions(field, locale)) {
        if (!addressField.visible) {
          continue
        }

        const effectiveRequired = topLevelRequired || addressField.required

        if (!effectiveRequired) {
          continue
        }

        const fieldValue = value[addressField.key]
        const isEmpty = fieldValue === undefined || fieldValue === null || (typeof fieldValue === 'string' && fieldValue.trim() === '')

        if (isEmpty) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [addressField.key],
            message: messages.required
          })
        }
      }
    }), field, messages, locale)
  }

  return buildScalarOptionSchema(messages)
}

function applyRequiredAndNullable(
  schema: z.ZodTypeAny,
  field: FormForgeFieldSchema,
  messages: FormForgeZodValidationMessages,
  locale?: string
): z.ZodTypeAny {
  const optionalSchema = schema.optional()

  if (field.required === false) {
    return z.preprocess((value: unknown): unknown => {
      if (value === undefined || value === null) {
        return undefined
      }

      if (typeof value === 'string' && value.trim() === '') {
        return undefined
      }

      if (field.type === 'checkbox_group' && Array.isArray(value) && value.length === 0) {
        return undefined
      }

      if (field.type === 'address' && isBlankAddressValue(value)) {
        const addressFields = addressFieldDefinitions(field, locale)
        const hasRequiredAddressField = addressFields.some((candidate) => candidate.visible !== false && (field.required || candidate.required))

        if (hasRequiredAddressField) {
          return value
        }

        return undefined
      }

      return value
    }, optionalSchema)
  }

  if (field.type === 'number') {
    return z.preprocess((value: unknown): unknown => {
      if (typeof value === 'string' && value.trim() === '') {
        return undefined
      }

      return value
    }, schema)
  }

  if (field.type === 'text' || field.type === 'textarea' || field.type === 'email') {
    return schema.refine((value: unknown): boolean => {
      return typeof value === 'string' && value.trim() !== ''
    }, {
      message: messages.required
    })
  }

  if (field.type === 'consent') {
    return schema.refine((value: unknown): boolean => value === true, {
      message: messages.required
    })
  }

  if (field.type === 'select' || field.type === 'select_menu' || field.type === 'radio') {
    return schema.refine((value: unknown): boolean => {
      if (value === null || value === undefined) {
        return false
      }

      if (typeof value === 'string' && value.trim() === '') {
        return false
      }

      return true
    }, {
      message: messages.required
    })
  }

  if (field.type === 'checkbox_group') {
    return schema.refine((value: unknown): boolean => {
      return Array.isArray(value) && value.length > 0
    }, {
      message: messages.required
    })
  }

  if (field.type === 'date' || field.type === 'time' || field.type === 'temporal') {
    return schema.refine((value: unknown): boolean => {
      return typeof value === 'string' && value.trim() !== ''
    }, {
      message: messages.required
    })
  }

  return schema
}

export function createFormForgeZodSchema(form: FormForgeFormSchema, options: FormForgeZodValidationOptions = {}): z.ZodTypeAny {
  const messages = resolveLocaleMessages(options.locale)
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const field of form.fields) {
    const baseSchema: z.ZodTypeAny = buildFieldBaseSchema(field, messages, options.locale)
    shape[field.name] = applyRequiredAndNullable(baseSchema, field, messages, options.locale)
  }

  return z.object(shape)
}

export function mapFormForgeZodIssues(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}

  for (const issue of error.issues) {
    const [fieldName] = issue.path

    if (typeof fieldName !== 'string') {
      continue
    }

    if (fieldErrors[fieldName] === undefined) {
      fieldErrors[fieldName] = []
    }

    fieldErrors[fieldName].push(issue.message)
  }

  return fieldErrors
}

export function validateFormForgePayload(
  schema: z.ZodTypeAny,
  payload: FormForgeSubmissionPayload,
  options: FormForgeZodValidationOptions = {}
): Record<string, string[]> {
  const result = schema.safeParse(payload, {
    error: resolveLocaleErrorMap(options.locale)
  })

  if (result.success) {
    return {}
  }

  return mapFormForgeZodIssues(result.error)
}
