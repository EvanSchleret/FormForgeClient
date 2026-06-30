import { describe, expect, it } from 'vitest'
import { evaluatePageLogicRule, normalizePageLogic, pageLogicOperatorRequiresValue, pageLogicOperatorsForFieldType } from '../src/runtime/utils/page-logic'
import type { FormForgePageSchema } from '../src/runtime/types'

describe('page logic', () => {
  it('normalizes empty logic payloads', () => {
    expect(normalizePageLogic(null)).toEqual({
      version: 1,
      rules: []
    })
  })

  it('evaluates block clauses against page questions', () => {
    const page: FormForgePageSchema = {
      page_key: 'page_1',
      title: 'Page 1',
      description: null,
      meta: {},
      fields: [
        {
          field_key: 'fk_name',
          type: 'text',
          name: 'name',
          page_key: 'page_1',
          required: false,
          nullable: false,
          default: null,
          rules: [],
          meta: {}
        },
        {
          field_key: 'fk_terms',
          type: 'consent',
          name: 'terms',
          page_key: 'page_1',
          required: false,
          nullable: false,
          default: null,
          rules: [],
          meta: {},
          consent_label: 'I agree'
        }
      ]
    }

    const matched = evaluatePageLogicRule(
      {
        rule_key: 'lr_1',
        match: 'all',
        when: [
          {
            field_key: 'fk_name',
            operator: 'starts_with',
            value: 'Evan'
          },
          {
            field_key: 'fk_terms',
            operator: 'accepted',
            value: true
          }
        ],
        then: [
          {
            action: 'require',
            field_key: 'fk_terms',
            block_index: null
          }
        ],
        fallback: {
          action: 'next',
          block_index: null
        }
      },
      page,
      (field) => {
        if (field.field_key === 'fk_name') {
          return 'Evan Schleret'
        }

        if (field.field_key === 'fk_terms') {
          return true
        }

        return null
      }
    )

    expect(matched).toBe(true)
  })

  it('treats empty object-like answers as not submitted', () => {
    const page: FormForgePageSchema = {
      page_key: 'page_1',
      title: 'Page 1',
      description: null,
      meta: {},
      fields: [
        {
          field_key: 'fk_address',
          type: 'address',
          name: 'address',
          page_key: 'page_1',
          required: false,
          nullable: false,
          default: null,
          rules: [],
          meta: {}
        },
        {
          field_key: 'fk_window',
          type: 'date',
          name: 'window',
          page_key: 'page_1',
          required: false,
          nullable: false,
          default: null,
          rules: [],
          meta: {}
        }
      ]
    }

    const addressSubmitted = evaluatePageLogicRule(
      {
        rule_key: 'lr_1',
        match: 'all',
        when: [
          {
            field_key: 'fk_address',
            operator: 'is_submitted',
            value: null
          }
        ],
        then: [ { action: 'require', field_key: null, block_index: null } ],
        fallback: { action: 'next', block_index: null }
      },
      page,
      () => ({
        line1: null,
        line2: null,
        city: '',
        state: '',
        zip: undefined,
        country: null
      })
    )

    const rangeSubmitted = evaluatePageLogicRule(
      {
        rule_key: 'lr_2',
        match: 'all',
        when: [
          {
            field_key: 'fk_window',
            operator: 'is_not_submitted',
            value: null
          }
        ],
        then: [ { action: 'require', field_key: null, block_index: null } ],
        fallback: { action: 'next', block_index: null }
      },
      page,
      () => ({
        start: null,
        end: ''
      })
    )

    expect(addressSubmitted).toBe(false)
    expect(rangeSubmitted).toBe(true)
  })

  it('restricts date field logic to submitted checks', () => {
    expect(pageLogicOperatorsForFieldType('date')).toEqual([
      'is_submitted',
      'is_not_submitted'
    ])
    expect(pageLogicOperatorRequiresValue('date', 'is_submitted')).toBe(false)
    expect(pageLogicOperatorRequiresValue('date', 'is_not_submitted')).toBe(false)
  })

  it('restricts time field logic to submitted checks', () => {
    expect(pageLogicOperatorsForFieldType('time')).toEqual([
      'is_submitted',
      'is_not_submitted'
    ])
    expect(pageLogicOperatorRequiresValue('time', 'is_submitted')).toBe(false)
    expect(pageLogicOperatorRequiresValue('time', 'is_not_submitted')).toBe(false)
  })

  it('restricts legacy temporal field logic to submitted checks', () => {
    expect(pageLogicOperatorsForFieldType('temporal')).toEqual([
      'is_submitted',
      'is_not_submitted'
    ])
    expect(pageLogicOperatorRequiresValue('temporal', 'is_submitted')).toBe(false)
    expect(pageLogicOperatorRequiresValue('temporal', 'is_not_submitted')).toBe(false)
  })
})
