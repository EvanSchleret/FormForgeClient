import type { FormForgeSubmissionPayload } from '../types'
import type { FormForgeFieldSchema, FormForgeFormSchema } from '../types/schema'

interface RendererFieldAlias {
  name: string
  aliases: string[]
}

function collectSchemaFields(schema: FormForgeFormSchema): FormForgeFieldSchema[] {
  const collected: FormForgeFieldSchema[] = []

  if (Array.isArray(schema.fields)) {
    collected.push(...schema.fields)
  }

  if (Array.isArray(schema.pages)) {
    for (const page of schema.pages) {
      if (!Array.isArray(page.fields)) {
        continue
      }

      collected.push(...page.fields)
    }
  }

  return collected
}

function buildFieldAliases(schema: FormForgeFormSchema): RendererFieldAlias[] {
  const aliasesByName = new Map<string, Set<string>>()

  for (const field of collectSchemaFields(schema)) {
    const name = typeof field.name === 'string' ? field.name.trim() : ''
    const fieldKey = typeof field.field_key === 'string' ? field.field_key.trim() : ''

    if (name === '') {
      continue
    }

    if (!aliasesByName.has(name)) {
      aliasesByName.set(name, new Set<string>())
    }

    const aliases = aliasesByName.get(name)!
    aliases.add(name)

    if (fieldKey !== '') {
      aliases.add(fieldKey)
    }
  }

  return Array.from(aliasesByName.entries()).map(([name, aliases]) => ({
    name,
    aliases: Array.from(aliases)
  }))
}

export function resolveSchemaFieldNames(schema: FormForgeFormSchema): Set<string> {
  const names = new Set<string>()

  for (const field of buildFieldAliases(schema)) {
    for (const alias of field.aliases) {
      names.add(alias)
    }
  }

  return names
}

export function sanitizePayloadWithSchema(value: FormForgeSubmissionPayload, schema: FormForgeFormSchema): FormForgeSubmissionPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }

  const sanitizedPayload: FormForgeSubmissionPayload = {}
  const aliasesByName = buildFieldAliases(schema)

  for (const field of aliasesByName) {
    const nameValue = Object.prototype.hasOwnProperty.call(value, field.name) ? value[field.name] : undefined
    if (nameValue !== undefined) {
      sanitizedPayload[field.name] = nameValue
      continue
    }

    for (const alias of field.aliases) {
      if (alias === field.name) {
        continue
      }

      if (!Object.prototype.hasOwnProperty.call(value, alias)) {
        continue
      }

      sanitizedPayload[field.name] = value[alias]
      break
    }
  }

  return sanitizedPayload
}
