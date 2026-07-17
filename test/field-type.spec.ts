import { describe, expect, it } from 'vitest'
import type { FormForgeFieldSchema } from '../src/runtime/types'
import { normalizeFormForgeFieldTypeChange } from '../src/runtime/utils/field-type'

function createField(): FormForgeFieldSchema {
  return {
    field_key: 'field_1',
    type: 'text',
    name: 'field_1',
    page_key: 'page_1',
    required: false,
    nullable: false,
    default: null,
    rules: ['string'],
    meta: {
      validation: {
        match: 'all',
        rules: []
      }
    },
    options: [{ label: 'Old option', value: 'old' }],
    address_fields: [
      { key: 'city', label: 'Old city', visible: true, required: true }
    ]
  }
}

describe('normalizeFormForgeFieldTypeChange', () => {
  it('resets text-specific state when changing to address', () => {
    const field = createField()

    normalizeFormForgeFieldTypeChange(field, 'address')

    expect(field.type).toBe('address')
    expect(field.rules).toEqual([])
    expect(field.meta).toEqual({})
    expect(field.options).toBeUndefined()
    expect(field.address_fields).toEqual([
      { key: 'line1', label: 'Address line 1', visible: true, required: true },
      { key: 'line2', label: 'Address line 2', visible: false, required: false },
      { key: 'city', label: 'City', visible: true, required: true },
      { key: 'state', label: 'State', visible: false, required: false },
      { key: 'zip', label: 'Zip', visible: true, required: true },
      { key: 'country', label: 'Country', visible: true, required: true }
    ])
    expect(field.default).toEqual({
      line1: null,
      line2: null,
      city: null,
      state: null,
      zip: null,
      country: null
    })
  })

  it('removes address-specific state when changing back to text', () => {
    const field = createField()
    normalizeFormForgeFieldTypeChange(field, 'address')

    normalizeFormForgeFieldTypeChange(field, 'text')

    expect(field.type).toBe('text')
    expect(field.rules).toEqual([])
    expect(field.meta).toEqual({})
    expect(field.address_fields).toBeUndefined()
    expect(field.default).toBeNull()
    expect(field.placeholder).toBe('Enter your answer here ...')
  })
})
