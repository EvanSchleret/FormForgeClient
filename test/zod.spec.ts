import { describe, expect, it } from 'vitest'
import { createFormForgeZodSchema, validateFormForgePayload } from '../src/runtime/validation/zod'
import type { FormForgeFileFieldSchema } from '../src/runtime/types'

describe('createFormForgeZodSchema', () => {
  it('validates file type, per-file size, file count and total size limits', () => {
    const originalFile = globalThis.File

    class TestFile {
      name: string
      type: string
      size: number

      constructor(name: string, type: string, size: number) {
        this.name = name
        this.type = type
        this.size = size
      }
    }

    Object.defineProperty(globalThis, 'File', { configurable: true, value: TestFile })
    const file = (name: string, type: string, size: number): File => new TestFile(name, type, size) as unknown as File

    const field: FormForgeFileFieldSchema = {
      field_key: 'fk_documents',
      type: 'file',
      name: 'documents',
      page_key: 'page_1',
      required: false,
      nullable: false,
      default: null,
      rules: [],
      meta: {},
      multiple: true,
      accept: ['.pdf'],
      max_size: 100,
      max_files: 2,
      max_total_size: 150
    }

    const schema = createFormForgeZodSchema({
      key: 'uploads',
      version: '1',
      schema_version: 2,
      title: 'Uploads',
      is_published: true,
      api: {},
      pages: [],
      conditions: [],
      drafts: { enabled: false },
      fields: [field]
    })

    expect(validateFormForgePayload(schema, {
      documents: [file('one.pdf', 'application/pdf', 80)]
    })).toEqual({})
    expect(Object.keys(validateFormForgePayload(schema, {
      documents: [file('one.txt', 'text/plain', 80)]
    }))).toContain('documents')
    expect(Object.keys(validateFormForgePayload(schema, {
      documents: [file('one.pdf', 'application/pdf', 100), file('two.pdf', 'application/pdf', 100)]
    }))).toContain('documents')
    expect(Object.keys(validateFormForgePayload(schema, {
      documents: [file('one.pdf', 'application/pdf', 40), file('two.pdf', 'application/pdf', 40), file('three.pdf', 'application/pdf', 40)]
    }))).toContain('documents')

    Object.defineProperty(globalThis, 'File', { configurable: true, value: originalFile })
  })

  it('validates required fields and email format', () => {
    const schema = createFormForgeZodSchema({
      key: 'contact',
      version: '1',
      schema_version: 2,
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

  it('translates validation messages for common invalid inputs', () => {
    const schema = createFormForgeZodSchema({
      key: 'localized',
      version: '1',
      schema_version: 2,
      title: 'Localized',
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
          rules: [],
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
          rules: ['email'],
          meta: {}
        },
        {
          field_key: 'fk_age',
          type: 'number',
          name: 'age',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: [],
          meta: {}
        },
        {
          field_key: 'fk_description',
          type: 'text',
          name: 'description',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: [],
          meta: {
            validation: {
              match: 'all',
              rules: [
                {
                  validation_key: 'vr_min',
                  operator: 'min',
                  value: 3,
                  unit: 'characters'
                }
              ]
            }
          }
        },
        {
          field_key: 'fk_choice',
          type: 'radio',
          name: 'choice',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: [],
          meta: {}
        },
        {
          field_key: 'fk_tags',
          type: 'checkbox_group',
          name: 'tags',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: [],
          meta: {}
        },
        {
          field_key: 'fk_trip',
          type: 'date',
          name: 'trip',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: [],
          meta: {}
        },
        {
          field_key: 'fk_address',
          type: 'address',
          name: 'address',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: [],
          address_fields: [
            { key: 'line1', label: 'Line 1', visible: true, required: true }
          ],
          meta: {}
        }
      ]
    }, {
      locale: 'fr'
    })

    const errors = validateFormForgePayload(schema, {
      email: 'invalid',
      age: 'not-a-number',
      description: 'ab',
      choice: { value: 'invalid' } as never,
      tags: { value: 'invalid' } as never,
      trip: 'invalid-date',
      address: 'invalid-address' as never
    }, {
      locale: 'fr'
    })

    expect(errors.name?.[0]).toBe('Ce champ est requis')
    expect(errors.email?.[0]).toBe('Veuillez saisir une adresse e-mail valide')
    expect(errors.age?.[0]).toBe('Veuillez saisir un nombre valide')
    expect(errors.description?.[0]).toBe('Description doit contenir au moins 3 caractères')
    expect(errors.choice?.[0]).toBe('Veuillez sélectionner une option valide')
    expect(errors.tags?.[0]).toBe('Veuillez sélectionner une option valide')
    expect(errors.trip?.[0]).toBe('Veuillez saisir une date valide')
    expect(errors.address?.[0]).toBe('Veuillez saisir une adresse valide')
  })

  it('treats empty string as absent when required is false', () => {
    const schema = createFormForgeZodSchema({
      key: 'profile',
      version: '1',
      schema_version: 2,
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
      schema_version: 2,
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

  it('requires consent to be accepted when required', () => {
    const schema = createFormForgeZodSchema({
      key: 'terms',
      version: '1',
      schema_version: 2,
      title: 'Terms',
      is_published: true,
      api: {},
      pages: [],
      conditions: [],
      drafts: {
        enabled: false
      },
      fields: [
        {
          field_key: 'fk_terms',
          type: 'consent',
          name: 'terms',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: [],
          meta: {},
          consent_label: 'I agree'
        }
      ]
    })

    const rejected = validateFormForgePayload(schema, {
      terms: false
    })

    const accepted = validateFormForgePayload(schema, {
      terms: true
    })

    expect(Object.keys(rejected)).toContain('terms')
    expect(accepted).toEqual({})
  })

  it('applies validation rules from field meta', () => {
    const schema = createFormForgeZodSchema({
      key: 'validation',
      version: '1',
      schema_version: 2,
      title: 'Validation',
      is_published: true,
      api: {},
      pages: [],
      conditions: [],
      drafts: {
        enabled: false
      },
      fields: [
        {
          field_key: 'fk_text',
          type: 'text',
          name: 'text',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: [],
          meta: {
            validation: {
              match: 'all',
              rules: [
                {
                  validation_key: 'vr_min',
                  operator: 'min',
                  value: 3,
                  unit: 'characters'
                },
                {
                  validation_key: 'vr_max',
                  operator: 'max',
                  value: 8,
                  unit: 'characters'
                },
                {
                  validation_key: 'vr_regex',
                  operator: 'regex',
                  value: '^[a-z]+$'
                },
                {
                  validation_key: 'vr_contains',
                  operator: 'contains',
                  value: 'abc'
                },
                {
                  validation_key: 'vr_not_contains',
                  operator: 'not_contains',
                  value: 'zzz'
                },
                {
                  validation_key: 'vr_eq',
                  operator: 'eq',
                  value: 'abcde'
                },
                {
                  validation_key: 'vr_neq',
                  operator: 'neq',
                  value: 'forbidden'
                }
              ]
            }
          }
        }
      ]
    })

    expect(validateFormForgePayload(schema, {
      text: 'abcde'
    })).toEqual({})

    expect(Object.keys(validateFormForgePayload(schema, {
      text: 'ab'
    }))).toContain('text')

    expect(Object.keys(validateFormForgePayload(schema, {
      text: 'abcdefghi'
    }))).toContain('text')

    expect(Object.keys(validateFormForgePayload(schema, {
      text: 'ABCDE'
    }))).toContain('text')

    expect(Object.keys(validateFormForgePayload(schema, {
      text: 'xyzde'
    }))).toContain('text')

    expect(Object.keys(validateFormForgePayload(schema, {
      text: 'abczzz'
    }))).toContain('text')

    expect(Object.keys(validateFormForgePayload(schema, {
      text: 'forbidden'
    }))).toContain('text')
  })

  it('supports temporal date fields through the merged temporal type', () => {
    const schema = createFormForgeZodSchema({
      key: 'temporal',
      version: '1',
      schema_version: 2,
      title: 'Temporal',
      is_published: true,
      api: {},
      pages: [],
      conditions: [],
      drafts: {
        enabled: false
      },
      fields: [
        {
          field_key: 'fk_trip',
          type: 'temporal',
          temporal_mode: 'date',
          name: 'trip',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: {
            start: null,
            end: null
          },
          rules: [],
          meta: {}
        }
      ]
    })

    expect(Object.keys(validateFormForgePayload(schema, {
      trip: ''
    }))).toContain('trip')

    expect(validateFormForgePayload(schema, {
      trip: '2026-01-01'
    })).toEqual({})
  })

  it('applies validation rules to temporal date fields', () => {
    const schema = createFormForgeZodSchema({
      key: 'temporal-validation',
      version: '1',
      schema_version: 2,
      title: 'Temporal validation',
      is_published: true,
      api: {},
      pages: [],
      conditions: [],
      drafts: {
        enabled: false
      },
      fields: [
        {
          field_key: 'fk_event',
          type: 'temporal',
          temporal_mode: 'date',
          name: 'event',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: [],
          meta: {
            validation: {
              match: 'all',
              rules: [
                {
                  validation_key: 'vr_between',
                  operator: 'between',
                  value: {
                    start: '2026-01-01',
                    end: '2026-12-31'
                  },
                  unit: null
                }
              ]
            }
          }
        }
      ]
    })

    expect(validateFormForgePayload(schema, {
      event: '2026-06-15'
    })).toEqual({})

    expect(Object.keys(validateFormForgePayload(schema, {
      event: '2025-12-31'
    }))).toContain('event')

    expect(Object.keys(validateFormForgePayload(schema, {
      event: '2027-01-01'
    }))).toContain('event')
  })

  it('applies not between validation rules to temporal date fields', () => {
    const schema = createFormForgeZodSchema({
      key: 'temporal-not-between-validation',
      version: '1',
      schema_version: 2,
      title: 'Temporal not between validation',
      is_published: true,
      api: {},
      pages: [],
      conditions: [],
      drafts: {
        enabled: false
      },
      fields: [
        {
          field_key: 'fk_event',
          type: 'temporal',
          temporal_mode: 'date',
          name: 'event',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: [],
          meta: {
            validation: {
              match: 'all',
              rules: [
                {
                  validation_key: 'vr_not_between',
                  operator: 'not_between',
                  value: {
                    start: '2026-03-01',
                    end: '2026-09-30'
                  },
                  unit: null
                }
              ]
            }
          }
        }
      ]
    })

    expect(validateFormForgePayload(schema, {
      event: '2026-02-28'
    })).toEqual({})

    expect(validateFormForgePayload(schema, {
      event: '2026-10-01'
    })).toEqual({})

    expect(Object.keys(validateFormForgePayload(schema, {
      event: '2026-06-15'
    }))).toContain('event')
  })

  it('applies validation rules to temporal time fields', () => {
    const schema = createFormForgeZodSchema({
      key: 'temporal-time-validation',
      version: '1',
      schema_version: 2,
      title: 'Temporal time validation',
      is_published: true,
      api: {},
      pages: [],
      conditions: [],
      drafts: {
        enabled: false
      },
      fields: [
        {
          field_key: 'fk_meeting',
          type: 'temporal',
          temporal_mode: 'time',
          name: 'meeting',
          page_key: 'page_1',
          required: true,
          nullable: false,
          default: null,
          rules: [],
          meta: {
            validation: {
              match: 'all',
              rules: [
                {
                  validation_key: 'vr_between',
                  operator: 'between',
                  value: {
                    start: '09:00:00',
                    end: '18:00:00'
                  },
                  unit: null
                }
              ]
            }
          }
        }
      ]
    })

    expect(validateFormForgePayload(schema, {
      meeting: '12:00:00'
    })).toEqual({})

    expect(Object.keys(validateFormForgePayload(schema, {
      meeting: '08:59:59'
    }))).toContain('meeting')

    expect(Object.keys(validateFormForgePayload(schema, {
      meeting: '18:00:01'
    }))).toContain('meeting')
  })
})
