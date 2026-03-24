import { describe, expect, it } from 'vitest'
import { normalizeFormForgeSchema } from '../src/runtime/utils/schema'

describe('normalizeFormForgeSchema', () => {
  it('normalizes schema and preserves field order', () => {
    const schema = normalizeFormForgeSchema({
      key: 'contact-form',
      version: '3',
      title: 'Contact Form',
      is_published: true,
      api: {},
      fields: [
        {
          field_key: 'fk_name',
          type: 'text',
          name: 'name',
          required: true,
          nullable: false,
          default: null,
          rules: ['required', 'string', 'max:120'],
          meta: {}
        },
        {
          field_key: 'fk_email',
          type: 'email',
          name: 'email',
          required: true,
          nullable: false,
          default: null,
          rules: ['required', 'email'],
          meta: {}
        }
      ]
    })

    expect(schema.key).toBe('contact-form')
    expect(schema.fields[0]?.name).toBe('name')
    expect(schema.fields[1]?.name).toBe('email')
    expect(schema.pages.length).toBe(1)
    expect(schema.pages[0]?.fields.length).toBe(2)
    expect(schema.conditions).toEqual([])
    expect(schema.drafts.enabled).toBe(false)
  })
})
