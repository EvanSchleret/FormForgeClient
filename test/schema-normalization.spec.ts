import { describe, expect, it } from 'vitest'
import { normalizeFormForgeSchema } from '../src/runtime/utils/schema'

describe('normalizeFormForgeSchema', () => {
  it('normalizes schema and preserves field order', () => {
    const schema = normalizeFormForgeSchema({
      key: 'contact-form',
      version: '3',
      schema_version: 2,
      title: 'Contact Form',
      publish_at: '2026-01-01T00:00:00Z',
      pause_at: null,
      response_limit: 10,
      submission_code_required: true,
      category: 'survey',
      category_item: {
        id: 10,
        key: 'survey',
        name: 'Survey',
        description: null,
        is_active: true,
        meta: {},
        created_at: null,
        updated_at: null
      },
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
        },
        {
          field_key: 'fk_country',
          type: 'select',
          name: 'country',
          display: 'menu',
          required: false,
          nullable: false,
          default: null,
          rules: [],
          meta: {},
          options: [
            {
              label: '',
              value: 'fr'
            }
          ]
        }
      ]
    })

    expect(schema.key).toBe('contact-form')
    expect(schema.schema_version).toBe(2)
    expect(schema.publish_at).toBe('2026-01-01T00:00:00Z')
    expect(schema.pause_at).toBeNull()
    expect(schema.response_limit).toBe(10)
    expect(schema.submission_code_required).toBe(true)
    expect(schema.category).toBe('survey')
    expect(schema.category_item?.key).toBe('survey')
    expect(schema.fields[0]?.name).toBe('name')
    expect(schema.fields[1]?.name).toBe('email')
    expect(schema.fields[2]?.display).toBe('menu')
    expect(schema.pages.length).toBe(1)
    expect(schema.pages[0]?.fields.length).toBe(3)
    expect(schema.conditions).toEqual([])
    expect(schema.drafts.enabled).toBe(false)
  })

  it('normalizes legacy temporal field types to the temporal schema', () => {
    const schema = normalizeFormForgeSchema({
      key: 'legacy-temporal',
      version: '1',
      schema_version: 2,
      title: 'Legacy temporal',
      is_published: true,
      api: {},
      fields: [
        {
          field_key: 'fk_event',
          type: 'date',
          name: 'event',
          required: false,
          nullable: false,
          default: null,
          rules: [],
          meta: {}
        }
      ]
    })

    expect(schema.fields[0]?.type).toBe('temporal')
    expect(schema.fields[0]?.temporal_mode).toBe('date')
  })

  it('defaults time temporal fields to a 24-hour cycle', () => {
    const schema = normalizeFormForgeSchema({
      key: 'time-temporal',
      version: '1',
      schema_version: 2,
      title: 'Time temporal',
      is_published: true,
      api: {},
      fields: [
        {
          field_key: 'fk_meeting',
          type: 'temporal',
          temporal_mode: 'time',
          name: 'meeting',
          required: false,
          nullable: false,
          default: null,
          rules: [],
          meta: {}
        }
      ]
    })

    expect(schema.fields[0]?.type).toBe('temporal')
    expect(schema.fields[0]?.temporal_mode).toBe('time')
    expect(schema.fields[0]?.hour_cycle).toBe(24)
  })

  it('preserves custom address field definitions', () => {
    const schema = normalizeFormForgeSchema({
      key: 'address-schema',
      version: '1',
      schema_version: 2,
      title: 'Address schema',
      is_published: true,
      api: {},
      fields: [
        {
          field_key: 'fk_address',
          type: 'address',
          name: 'address',
          required: false,
          nullable: false,
          default: {
            line1: null,
            line2: null,
            city: null,
            state: null,
            zip: null,
            country: null
          },
          rules: [],
          meta: {},
          address_fields: [
            { key: 'line1', label: 'Adresse', visible: true, required: true },
            { key: 'line2', label: 'Complement', visible: false, required: false },
            { key: 'city', label: 'Ville', visible: true, required: true },
            { key: 'state', label: 'Canton', visible: false, required: false },
            { key: 'zip', label: 'Code postal', visible: true, required: true },
            { key: 'country', label: 'Pays', visible: true, required: true }
          ]
        }
      ]
    })

    const addressField = schema.fields[0]

    expect(addressField?.type).toBe('address')
    expect(addressField?.address_fields).toEqual([
      { key: 'line1', label: 'Adresse', visible: true, required: true },
      { key: 'line2', label: 'Complement', visible: false, required: false },
      { key: 'city', label: 'Ville', visible: true, required: true },
      { key: 'state', label: 'Canton', visible: false, required: false },
      { key: 'zip', label: 'Code postal', visible: true, required: true },
      { key: 'country', label: 'Pays', visible: true, required: true }
    ])
  })

  it('preserves empty address field labels', () => {
    const schema = normalizeFormForgeSchema({
      key: 'address-empty-labels',
      version: '1',
      schema_version: 2,
      title: 'Address empty labels',
      is_published: true,
      api: {},
      fields: [
        {
          field_key: 'fk_address',
          type: 'address',
          name: 'address',
          required: false,
          nullable: false,
          default: {
            line1: null,
            line2: null,
            city: null,
            state: null,
            zip: null,
            country: null
          },
          rules: [],
          meta: {},
          address_fields: [
            { key: 'line1', label: '', visible: true, required: true },
            { key: 'line2', label: '', visible: false, required: false },
            { key: 'city', visible: true, required: true }
          ]
        }
      ]
    })

    expect(schema.fields[0]?.address_fields).toEqual([
      { key: 'line1', label: '', visible: true, required: true },
      { key: 'line2', label: '', visible: false, required: false },
      { key: 'city', label: 'City', visible: true, required: true }
    ])
  })

  it('uses translated default address labels for the French locale', () => {
    const schema = normalizeFormForgeSchema({
      key: 'address-french-labels',
      version: '1',
      schema_version: 2,
      title: 'Address French labels',
      is_published: true,
      api: {},
      fields: [
        {
          field_key: 'fk_address',
          type: 'address',
          name: 'address',
          required: false,
          nullable: false,
          default: {
            line1: null,
            line2: null,
            city: null,
            state: null,
            zip: null,
            country: null
          },
          rules: [],
          meta: {},
          address_fields: [
            { key: 'line1', visible: true, required: true },
            { key: 'line2', visible: false, required: false },
            { key: 'city', visible: true, required: true }
          ]
        }
      ]
    }, 'fr')

    expect(schema.fields[0]?.address_fields).toEqual([
      { key: 'line1', label: "Ligne d'adresse 1", visible: true, required: true },
      { key: 'line2', label: "Ligne d'adresse 2", visible: false, required: false },
      { key: 'city', label: 'Ville', visible: true, required: true }
    ])
  })
})
