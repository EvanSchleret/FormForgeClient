import { describe, expect, it } from 'vitest'
import { createFormForgeBuilderField, sanitizeFormForgeBuilderDraft } from '../src/runtime/utils/builder-schema'
import type { FormForgeJsonObject, FormForgePageSchema } from '../src/runtime/types'

describe('FormForge builder schema helpers', () => {
  it('creates file fields with defaults and preserves configurable upload limits', () => {
    const field = createFormForgeBuilderField('file', 'page_1')

    expect(field).toMatchObject({
      type: 'file',
      multiple: false,
      accept: []
    })

    if (field.type !== 'file') {
      throw new Error('Expected a file field')
    }

    field.multiple = true
    field.accept = ['.pdf']
    field.max_size = 5 * 1024 * 1024
    field.max_files = 3
    field.max_total_size = 12 * 1024 * 1024

    const draft = {
      uuid: null,
      key: null,
      schema_version: 2,
      api: {},
      pages: [{
        page_key: 'page_1',
        title: 'Files',
        description: null,
        meta: {},
        fields: [field]
      }],
      conditions: []
    }

    sanitizeFormForgeBuilderDraft(draft)

    expect(draft.pages[0]?.fields[0]).toMatchObject({
      multiple: true,
      accept: ['.pdf'],
      max_size: 5 * 1024 * 1024,
      max_files: 3,
      max_total_size: 12 * 1024 * 1024
    })
  })

  it('creates address fields with localized defaults', () => {
    const field = createFormForgeBuilderField('address', 'page_1', 'fr')

    expect(field.default).toEqual({
      line1: null,
      line2: null,
      city: null,
      state: null,
      zip: null,
      country: null
    })
    expect(field.address_fields?.find((addressField) => addressField.key === 'country')).toMatchObject({
      label: 'Pays',
      visible: true,
      required: true
    })
  })

  it('repairs empty or malformed draft structure', () => {
    const draft = {
      uuid: null,
      key: null,
      schema_version: 0,
      api: [] as unknown as FormForgeJsonObject,
      submission_code_required: 'yes' as unknown as boolean,
      submission_code: null,
      access_code: null,
      pages: [] as FormForgePageSchema[],
      conditions: []
    }

    sanitizeFormForgeBuilderDraft(draft)

    expect(draft.schema_version).toBe(2)
    expect(draft.api).toEqual({})
    expect(draft.submission_code_required).toBe(false)
    expect(draft.pages).toHaveLength(1)
    expect(draft.pages[0]?.title).toBe('Page 1')
    expect(draft.pages[0]?.fields[0]?.type).toBe('text')
    expect(draft.pages[0]?.fields[0]?.page_key).toBe(draft.pages[0]?.page_key)

    const page = draft.pages[0]
    if (page === undefined) {
      return
    }

    page.title = '  '
    sanitizeFormForgeBuilderDraft(draft)

    expect(page.title).toBe('Page 1')
  })
})
