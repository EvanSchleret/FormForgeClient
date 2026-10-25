import { describe, expect, it } from 'vitest'
import type { FormForgeFieldSchema, FormForgeFormSchema, FormForgePageSchema } from '../src/runtime/types'
import { areFormForgeRuntimeValuesEqual, resolveFormForgeRendererConditions } from '../src/runtime/utils/renderer-conditions'

describe('FormForge renderer condition helpers', () => {
  it('compares nested runtime values structurally', () => {
    expect(areFormForgeRuntimeValuesEqual({ address: { city: 'Geneva' } }, { address: { city: 'Geneva' } })).toBe(true)
    expect(areFormForgeRuntimeValuesEqual({ address: { city: 'Geneva' } }, { address: { city: 'Lausanne' } })).toBe(false)
  })

  it('resolves conditional field visibility from the response payload', () => {
    const trigger: FormForgeFieldSchema = {
      field_key: 'fk_trigger',
      type: 'checkbox',
      name: 'trigger',
      page_key: 'page_1',
      required: false,
      nullable: false,
      default: null,
      rules: [],
      meta: {}
    }
    const target: FormForgeFieldSchema = {
      field_key: 'fk_target',
      type: 'text',
      name: 'target',
      page_key: 'page_1',
      required: false,
      nullable: false,
      default: null,
      rules: [],
      meta: {}
    }
    const page: FormForgePageSchema = {
      page_key: 'page_1',
      title: 'Page 1',
      meta: {},
      fields: [trigger, target]
    }
    const schema: FormForgeFormSchema = {
      key: 'conditional-form',
      version: '1',
      schema_version: 2,
      title: 'Conditional form',
      is_published: true,
      fields: [trigger, target],
      pages: [page],
      conditions: [{
        condition_key: 'condition_1',
        target_type: 'field',
        target_key: 'fk_target',
        action: 'show',
        match: 'all',
        when: [{ field_key: 'fk_trigger', operator: 'eq', value: true }]
      }],
      drafts: { enabled: false },
      api: {}
    }

    const hidden = resolveFormForgeRendererConditions(schema, [page], {}, { trigger: false })
    const visible = resolveFormForgeRendererConditions(schema, [page], {}, { trigger: true })

    expect(hidden.fields.fk_target?.visible).toBe(false)
    expect(visible.fields.fk_target?.visible).toBe(true)
  })
})
