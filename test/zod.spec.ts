import { describe, expect, it } from 'vitest'
import { createFormForgeZodSchema, validateFormForgePayload } from '../src/runtime/validation/zod'

describe('createFormForgeZodSchema', () => {
  it('validates required fields and email format', () => {
    const schema = createFormForgeZodSchema({
      key: 'contact',
      version: '1',
      title: 'Contact',
      is_published: true,
      api: {},
      pages: [],
      conditions: [],
      drafts: {
        enabled: false
      },
      fields: [
        {
          field_key: 'fk_name',
          type: 'text',
          name: 'name',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: ['required', 'min:2'],
          meta: {}
        },
        {
          field_key: 'fk_email',
          type: 'email',
          name: 'email',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: ['required', 'email'],
          meta: {}
        }
      ]
    })

    const errors = validateFormForgePayload(schema, {
      name: 'A',
      email: 'invalid'
    })

    expect(Object.keys(errors)).toContain('name')
    expect(Object.keys(errors)).toContain('email')
  })

  it('treats empty string as absent when required is false', () => {
    const schema = createFormForgeZodSchema({
      key: 'profile',
      version: '1',
      title: 'Profile',
      is_published: true,
      api: {},
      pages: [],
      conditions: [],
      drafts: {
        enabled: false
      },
      fields: [
        {
          field_key: 'fk_nickname',
          type: 'text',
          name: 'nickname',
          page_key: 'page_1',
          required: false,
          nullable: false,
          default: null,
          rules: ['min:3'],
          meta: {}
        }
      ]
    })

    const errors = validateFormForgePayload(schema, {
      nickname: ''
    })

    expect(errors).toEqual({})
  })

  it('requires a non-empty value when required is true', () => {
    const schema = createFormForgeZodSchema({
      key: 'profile-required',
      version: '1',
      title: 'Profile',
      is_published: true,
      api: {},
      pages: [],
      conditions: [],
      drafts: {
        enabled: false
      },
      fields: [
        {
          field_key: 'fk_nickname',
          type: 'text',
          name: 'nickname',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: [],
          meta: {}
        }
      ]
    })

    const errors = validateFormForgePayload(schema, {
      nickname: ''
    })

    expect(Object.keys(errors)).toContain('nickname')
  })
})
