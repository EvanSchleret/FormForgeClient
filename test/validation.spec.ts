import { describe, expect, it } from 'vitest'
import { normalizeFormForgeValidationConfig } from '../src/runtime/utils/validation'

describe('validation normalization', () => {
  it('normalizes temporal operators back to text operators for text fields', () => {
    expect(normalizeFormForgeValidationConfig({
      match: 'all',
      rules: [
        {
          validation_key: 'vr_1',
          target: null,
          operator: 'after',
          value: null,
          unit: null
        },
        {
          validation_key: 'vr_2',
          target: null,
          operator: 'before',
          value: null,
          unit: null
        }
      ]
    }, 'text')).toEqual({
      match: 'all',
      rules: [
        {
          validation_key: 'vr_1',
          target: null,
          operator: 'min',
          value: null,
          unit: null
        },
        {
          validation_key: 'vr_2',
          target: null,
          operator: 'max',
          value: null,
          unit: null
        }
      ]
    })
  })

  it('normalizes text operators to temporal operators for temporal fields', () => {
    expect(normalizeFormForgeValidationConfig({
      match: 'all',
      rules: [
        {
          validation_key: 'vr_1',
          target: null,
          operator: 'min',
          value: null,
          unit: 'characters'
        },
        {
          validation_key: 'vr_2',
          target: null,
          operator: 'max',
          value: null,
          unit: 'characters'
        }
      ]
    }, 'temporal')).toEqual({
      match: 'all',
      rules: [
        {
          validation_key: 'vr_1',
          target: null,
          operator: 'after',
          value: null,
          unit: 'characters'
        },
        {
          validation_key: 'vr_2',
          target: null,
          operator: 'before',
          value: null,
          unit: 'characters'
        }
      ]
    })
  })
})
