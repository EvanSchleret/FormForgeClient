import { z } from 'zod'
import type { FormForgeFieldSchema, FormForgeFormSchema, FormForgeSubmissionPayload } from '../types'

const scalarOptionSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

function applySharedStringRules(baseSchema: z.ZodString, rules: string[]): z.ZodString {
  let schema: z.ZodString = baseSchema

  for (const rawRule of rules) {
    const [ruleName, ruleArgument] = rawRule.split(':')

    if (ruleName === 'email') {
      schema = schema.email()
      continue
    }

    if (ruleName === 'min' && ruleArgument !== undefined) {
      const parsedMin = Number.parseInt(ruleArgument, 10)
      if (!Number.isNaN(parsedMin)) {
        schema = schema.min(parsedMin)
      }
      continue
    }

    if (ruleName === 'max' && ruleArgument !== undefined) {
      const parsedMax = Number.parseInt(ruleArgument, 10)
      if (!Number.isNaN(parsedMax)) {
        schema = schema.max(parsedMax)
      }
      continue
    }
  }

  return schema
}

function applyArrayRules(baseSchema: z.ZodArray<typeof scalarOptionSchema>, rules: string[]): z.ZodArray<typeof scalarOptionSchema> {
  let schema: z.ZodArray<typeof scalarOptionSchema> = baseSchema

  for (const rawRule of rules) {
    const [ruleName, ruleArgument] = rawRule.split(':')

    if (ruleName === 'min' && ruleArgument !== undefined) {
      const parsedMin = Number.parseInt(ruleArgument, 10)
      if (!Number.isNaN(parsedMin)) {
        schema = schema.min(parsedMin)
      }
      continue
    }

    if (ruleName === 'max' && ruleArgument !== undefined) {
      const parsedMax = Number.parseInt(ruleArgument, 10)
      if (!Number.isNaN(parsedMax)) {
        schema = schema.max(parsedMax)
      }
      continue
    }
  }

  return schema
}

function applyNumberRules(baseSchema: z.ZodNumber, rules: string[]): z.ZodNumber {
  let schema: z.ZodNumber = baseSchema

  for (const rawRule of rules) {
    const [ruleName, ruleArgument] = rawRule.split(':')

    if (ruleName === 'min' && ruleArgument !== undefined) {
      const parsedMin = Number.parseFloat(ruleArgument)
      if (!Number.isNaN(parsedMin)) {
        schema = schema.min(parsedMin)
      }
      continue
    }

    if (ruleName === 'max' && ruleArgument !== undefined) {
      const parsedMax = Number.parseFloat(ruleArgument)
      if (!Number.isNaN(parsedMax)) {
        schema = schema.max(parsedMax)
      }
      continue
    }
  }

  return schema
}

function buildFieldBaseSchema(field: FormForgeFieldSchema): z.ZodTypeAny {
  if (field.type === 'text' || field.type === 'textarea' || field.type === 'email') {
    return applySharedStringRules(z.string(), field.rules)
  }

  if (field.type === 'number') {
    return applyNumberRules(z.number(), field.rules)
  }

  if (field.type === 'select' || field.type === 'select_menu' || field.type === 'radio') {
    return scalarOptionSchema
  }

  if (field.type === 'checkbox' || field.type === 'switch') {
    return z.boolean()
  }

  if (field.type === 'checkbox_group') {
    return applyArrayRules(z.array(scalarOptionSchema), field.rules)
  }

  if (field.type === 'date' || field.type === 'time' || field.type === 'datetime') {
    return applySharedStringRules(z.string(), field.rules)
  }

  if (field.type === 'date_range' || field.type === 'datetime_range') {
    return z.object({
      start: z.string().nullable(),
      end: z.string().nullable()
    })
  }

  if (field.type === 'file') {
    const fileSchema = z.custom<File>((value: File): boolean => {
      if (typeof File === 'undefined') {
        return false
      }

      return value instanceof File
    })

    if (field.multiple === true) {
      return z.array(fileSchema)
    }

    return fileSchema
  }

  return scalarOptionSchema
}

function applyRequiredAndNullable(
  schema: z.ZodTypeAny,
  field: FormForgeFieldSchema
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

      if ((field.type === 'date_range' || field.type === 'datetime_range') && typeof value === 'object' && value !== null) {
        const rangeValue = value as { start?: unknown; end?: unknown }
        const isStartEmpty = rangeValue.start === undefined || rangeValue.start === null || rangeValue.start === ''
        const isEndEmpty = rangeValue.end === undefined || rangeValue.end === null || rangeValue.end === ''

        if (isStartEmpty && isEndEmpty) {
          return undefined
        }
      }

      if (field.type === 'checkbox_group' && Array.isArray(value) && value.length === 0) {
        return undefined
      }

      return value
    }, optionalSchema)
  }

  if (field.type === 'text' || field.type === 'textarea' || field.type === 'email' || field.type === 'date' || field.type === 'time' || field.type === 'datetime') {
    return schema.refine((value: unknown): boolean => {
      return typeof value === 'string' && value.trim() !== ''
    }, {
      message: 'Required'
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
      message: 'Required'
    })
  }

  if (field.type === 'checkbox_group') {
    return schema.refine((value: unknown): boolean => {
      return Array.isArray(value) && value.length > 0
    }, {
      message: 'Required'
    })
  }

  if (field.type === 'date_range' || field.type === 'datetime_range') {
    return schema.refine((value: unknown): boolean => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false
      }

      const rangeValue = value as { start?: unknown; end?: unknown }
      const isStartValid = typeof rangeValue.start === 'string' && rangeValue.start !== ''
      const isEndValid = typeof rangeValue.end === 'string' && rangeValue.end !== ''

      return isStartValid && isEndValid
    }, {
      message: 'Required'
    })
  }

  return schema
}

export function createFormForgeZodSchema(form: FormForgeFormSchema): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const field of form.fields) {
    const baseSchema: z.ZodTypeAny = buildFieldBaseSchema(field)
    shape[field.name] = applyRequiredAndNullable(baseSchema, field)
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

export function validateFormForgePayload(schema: z.ZodTypeAny, payload: FormForgeSubmissionPayload): Record<string, string[]> {
  const result = schema.safeParse(payload)

  if (result.success) {
    return {}
  }

  return mapFormForgeZodIssues(result.error)
}
