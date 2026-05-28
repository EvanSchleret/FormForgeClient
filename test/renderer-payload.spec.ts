import { describe, expect, it } from 'vitest'
import { sanitizePayloadWithSchema } from '../src/runtime/utils/renderer-payload'
import type { FormForgeFormSchema } from '../src/runtime/types'

function createSchema(): FormForgeFormSchema {
  return {
    key: 'contact',
    version: '1',
    title: 'Contact',
    is_published: true,
    fields: [
      {
        field_key: 'fk_abc',
        type: 'text',
        name: 'short_text',
        page_key: 'page_1',
        required: false,
        nullable: true,
        default: null,
        rules: [],
        meta: {}
      }
    ],
    pages: [],
    conditions: [],
    drafts: { enabled: false },
    api: {}
  }
}

describe('renderer payload sanitation', () => {
  it('hydrates with name keys', () => {
    const schema = createSchema()
    const sanitized = sanitizePayloadWithSchema({ short_text: 'Rue de Lyon' }, schema)
    expect(sanitized).toEqual({ short_text: 'Rue de Lyon' })
  })

  it('hydrates with field_key keys', () => {
    const schema = createSchema()
    const sanitized = sanitizePayloadWithSchema({ fk_abc: 'Rue de Lyon' }, schema)
    expect(sanitized).toEqual({ short_text: 'Rue de Lyon' })
  })

  it('hydrates mixed payload with name priority', () => {
    const schema = createSchema()
    const sanitized = sanitizePayloadWithSchema({
      short_text: 'Name Value',
      fk_abc: 'Field Key Value'
    }, schema)
    expect(sanitized).toEqual({ short_text: 'Name Value' })
  })

  it('rejects unknown fields', () => {
    const schema = createSchema()
    const sanitized = sanitizePayloadWithSchema({
      unknown: 'x',
      fk_other: 'y'
    }, schema)
    expect(sanitized).toEqual({})
  })
})
