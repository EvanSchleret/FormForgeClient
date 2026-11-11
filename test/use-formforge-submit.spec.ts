import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type {
  FormForgeClient,
  FormForgeFormSchema,
  FormForgeSubmissionResponse
} from '../src/runtime/types'

const mocks = vi.hoisted(() => ({
  submitForm: vi.fn(),
  submitFormMultipart: vi.fn()
}))

vi.mock('#imports', () => ({ ref }))

vi.mock('../src/runtime/composables/useFormForgeClient', () => ({
  useFormForgeClient: () => ({
    submitForm: mocks.submitForm,
    submitFormMultipart: mocks.submitFormMultipart
  })
}))

vi.mock('../src/runtime/composables/useFormForgeI18n', () => ({
  useFormForgeI18n: () => ({ locale: ref('en') })
}))

import { useFormForgeSubmit } from '../src/runtime/composables/useFormForgeSubmit'

describe('useFormForgeSubmit', () => {
  it('uses managed multipart submission by default', async () => {
    const response: FormForgeSubmissionResponse = { data: {} }
    mocks.submitForm.mockResolvedValue(response)
    mocks.submitFormMultipart.mockResolvedValue(response)

    const schema: FormForgeFormSchema = {
      key: 'contact',
      version: '1',
      schema_version: 2,
      title: 'Contact',
      is_published: true,
      api: {},
      pages: [],
      conditions: [],
      drafts: { enabled: false },
      fields: [{
        field_key: 'fk_name',
        type: 'text',
        name: 'name',
        page_key: 'page_1',
        required: false,
        nullable: false,
        default: null,
        rules: [],
        meta: {}
      }]
    }

    const submitter = useFormForgeSubmit({
      key: 'contact',
      schema: () => schema,
      state: () => ({ name: 'Ada' }),
      client: {
        submitForm: mocks.submitForm,
        submitFormMultipart: mocks.submitFormMultipart
      } as unknown as FormForgeClient
    })

    await submitter.submit()

    expect(mocks.submitFormMultipart).toHaveBeenCalledOnce()
    expect(mocks.submitForm).not.toHaveBeenCalled()
  })
})
