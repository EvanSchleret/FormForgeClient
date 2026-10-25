import { computed, ref, toRaw, watch } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  FormForgeClient,
  FormForgeFormSchema,
  FormForgeManagementForm,
  FormForgeManagementPatchInput,
  FormForgeSettingsModel
} from '../src/runtime/types'

vi.mock('#imports', () => ({
  computed,
  ref,
  toRaw,
  watch
}))

const getForm = vi.fn()
const listForms = vi.fn()
const patchForm = vi.fn()

vi.mock('../src/runtime/composables/useFormForgeClient', () => ({
  useFormForgeClient: () => ({
    getForm,
    listForms,
    patchForm
  })
}))

const formSchema: FormForgeFormSchema = {
  key: 'form-key',
  version: '1',
  schema_version: 2,
  title: 'Original title',
  publish_at: '2026-10-26T08:00:00+00:00',
  pause_at: null,
  response_limit: 25,
  submission_code_required: true,
  category: 'events',
  is_published: false,
  fields: [],
  pages: [],
  conditions: [],
  drafts: {
    enabled: true,
    retention_days: 7
  },
  api: {
    submission: {
      auth: 'optional',
      public: true,
      custom: {
        provider: 'external'
      }
    },
    integration: {
      token: 'preserved'
    }
  }
}

const originalSettings: FormForgeSettingsModel = {
  title: 'Original title',
  category: 'events',
  publish_at: '2026-10-26T08:00:00+00:00',
  pause_at: null,
  response_limit: 25,
  submission_code_required: true,
  submission_code: '',
  has_submission_code: true,
  access_code_required: true,
  access_code: '',
  has_access_code: true,
  public_url: null,
  drafts: {
    enabled: true,
    retention_days: 7
  },
  api: formSchema.api
}

describe('useFormForgeSettings', () => {
  beforeEach(() => {
    getForm.mockReset()
    listForms.mockReset()
    patchForm.mockReset()
    getForm.mockResolvedValue(formSchema)
    listForms.mockResolvedValue([])
  })

  it('builds a sparse patch and preserves the complete api object when it changes', async () => {
    const { buildFormForgeSettingsPatch } = await import('../src/runtime/composables/useFormForgeSettings')
    const current: FormForgeSettingsModel = {
      ...originalSettings,
      title: 'Updated title',
      api: {
        ...originalSettings.api,
        submission: {
          auth: 'required',
          public: false,
          custom: {
            provider: 'external'
          }
        }
      }
    }

    const patch = buildFormForgeSettingsPatch(current, originalSettings)

    expect(patch).toEqual({
      title: 'Updated title',
      api: current.api
    })
    expect(patch).not.toHaveProperty('pages')
    expect(patch).not.toHaveProperty('fields')
    expect(patch).not.toHaveProperty('conditions')
    expect(patch.api?.integration).toEqual({ token: 'preserved' })
    expect(patch).not.toHaveProperty('access_code')
    expect(patch).not.toHaveProperty('access_code_required')
  })

  it('loads with public connection options and sends exactly one settings patch', async () => {
    const updatedSchema = {
      ...formSchema,
      title: 'Updated title',
      api: {
        ...formSchema.api,
        submission: {
          auth: 'required',
          public: false,
          custom: {
            provider: 'external'
          }
        }
      }
    }
    patchForm.mockResolvedValue({
      key: 'form-key',
      has_submission_code: true,
      schema: updatedSchema
    } satisfies FormForgeManagementForm)

    listForms.mockResolvedValue([{
      key: 'form-uuid',
      has_submission_code: true,
      has_access_code: true
    } satisfies FormForgeManagementForm])

    const client = { getForm, listForms, patchForm } as unknown as FormForgeClient
    const { useFormForgeSettings } = await import('../src/runtime/composables/useFormForgeSettings')
    const settingsState = useFormForgeSettings({
      formUuid: 'form-uuid',
      endpoint: '/custom/forms',
      scope: 'teams/12',
      locale: 'fr',
      client
    })

    await settingsState.load()
    settingsState.settings.value.title = 'Updated title'
    settingsState.settings.value.api.submission = updatedSchema.api.submission

    await settingsState.save()

    expect(getForm).toHaveBeenCalledWith('form-uuid', {
      endpoint: '/custom/forms',
      scope: 'teams/12',
      locale: 'fr'
    })
    expect(listForms).toHaveBeenCalledWith(false, {
      endpoint: '/custom/forms',
      scope: 'teams/12',
      filters: { key: 'form-uuid' }
    })
    expect(patchForm).toHaveBeenCalledTimes(1)
    expect(patchForm).toHaveBeenCalledWith('form-uuid', {
      title: 'Updated title',
      api: updatedSchema.api
    }, {
      endpoint: '/custom/forms',
      scope: 'teams/12'
    })
  })

  it('does not send an unchanged code and accepts a new code only when entered', async () => {
    patchForm.mockResolvedValue({
      key: 'form-key',
      has_submission_code: true,
      has_access_code: true,
      schema: formSchema
    } satisfies FormForgeManagementForm)
    listForms.mockResolvedValue([{
      key: 'form-key',
      has_submission_code: true,
      has_access_code: true,
      schema: formSchema
    } satisfies FormForgeManagementForm])

    const { useFormForgeSettings } = await import('../src/runtime/composables/useFormForgeSettings')
    const settingsState = useFormForgeSettings({
      formKey: 'form-key',
      client: { getForm, listForms, patchForm } as unknown as FormForgeClient
    })

    await settingsState.load()
    settingsState.settings.value.title = 'Changed while protected'
    await settingsState.save()

    expect(patchForm.mock.calls[0]?.[1]).not.toHaveProperty('submission_code')
    expect(patchForm.mock.calls[0]?.[1]).not.toHaveProperty('access_code')
    expect(patchForm.mock.calls[0]?.[1]).not.toHaveProperty('access_code_required')

    settingsState.settings.value.submission_code = 'new-pin'
    await settingsState.save()

    expect(patchForm.mock.calls[1]?.[1]).toHaveProperty('submission_code', 'new-pin')
    expect(settingsState.settings.value.submission_code).toBe('')
    expect(settingsState.settings.value.access_code_required).toBe(true)
    expect(settingsState.settings.value.has_access_code).toBe(true)
    expect(patchForm.mock.calls[1]?.[1]).not.toHaveProperty('access_code')
    expect(patchForm.mock.calls[1]?.[1]).not.toHaveProperty('access_code_required')
  })

  it('keeps the save error available to the component', async () => {
    patchForm.mockRejectedValue(new Error('Permission denied'))

    const { useFormForgeSettings } = await import('../src/runtime/composables/useFormForgeSettings')
    const settingsState = useFormForgeSettings({
      formKey: 'form-key',
      client: { getForm, listForms, patchForm } as unknown as FormForgeClient
    })

    await settingsState.load()
    settingsState.settings.value.title = 'Cannot save'

    await expect(settingsState.save()).rejects.toThrow('Permission denied')
    expect(settingsState.error.value).toBe('Permission denied')
    expect(settingsState.saving.value).toBe(false)
  })

  it('enables, replaces, and disables the separate form access code explicitly', async () => {
    const { buildFormForgeSettingsPatch } = await import('../src/runtime/composables/useFormForgeSettings')
    const enabled: FormForgeSettingsModel = {
      ...originalSettings,
      access_code_required: true,
      access_code: 'new-form-code',
      has_access_code: false
    }
    expect(buildFormForgeSettingsPatch(enabled, {
      ...originalSettings,
      access_code_required: false,
      has_access_code: false
    })).toMatchObject({
      access_code: 'new-form-code',
      access_code_required: true
    })

    const replacement: FormForgeSettingsModel = {
      ...originalSettings,
      access_code: 'replacement-code'
    }
    expect(buildFormForgeSettingsPatch(replacement, originalSettings)).toEqual({
      access_code: 'replacement-code'
    })

    const disabled: FormForgeSettingsModel = {
      ...originalSettings,
      access_code_required: false
    }
    expect(buildFormForgeSettingsPatch(disabled, originalSettings)).toEqual({
      access_code_required: false
    })
  })

  it('sends only explicitly changed top-level settings and complete changed nested objects', async () => {
    const { buildFormForgeSettingsPatch } = await import('../src/runtime/composables/useFormForgeSettings')
    const current: FormForgeSettingsModel = {
      ...originalSettings,
      category: null,
      publish_at: null,
      pause_at: '2026-11-15T09:30:00+00:00',
      response_limit: null,
      submission_code_required: false,
      drafts: {
        enabled: false,
        retention_days: 14
      }
    }

    const patch: FormForgeManagementPatchInput = buildFormForgeSettingsPatch(current, originalSettings)

    expect(patch).toEqual({
      category: null,
      publish_at: null,
      pause_at: '2026-11-15T09:30:00+00:00',
      response_limit: null,
      submission_code_required: false,
      drafts: current.drafts
    })
  })

  it('uses the management resource pin indicator over the public schema flag', async () => {
    getForm.mockResolvedValue({
      ...formSchema,
      submission_code_required: false
    })
    listForms.mockResolvedValue([{
      key: 'form-key',
      has_submission_code: true
    } satisfies FormForgeManagementForm])

    const { useFormForgeSettings } = await import('../src/runtime/composables/useFormForgeSettings')
    const settingsState = useFormForgeSettings({
      formKey: 'form-key',
      client: { getForm, listForms, patchForm } as unknown as FormForgeClient
    })

    await settingsState.load()

    expect(settingsState.settings.value.has_submission_code).toBe(true)
  })
})
