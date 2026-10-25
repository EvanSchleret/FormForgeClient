import { describe, expect, it } from 'vitest'
import { createFormForgeBuilderField, sanitizeFormForgeBuilderDraft } from '../src/runtime/utils/builder-schema'
import type { FormForgeJsonObject, FormForgePageSchema } from '../src/runtime/types'

describe('FormForge builder schema helpers', () => {
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
