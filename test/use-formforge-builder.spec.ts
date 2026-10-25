import { computed, ref, toRaw, watch } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const createForm = vi.fn(async () => ({
  uuid: 'form-uuid',
  key: 'form-key',
  public_url: 'https://example.test/forms/form-key'
}))

const patchForm = vi.fn()
const publishForm = vi.fn()
const unpublishForm = vi.fn()

vi.mock('#imports', () => ({
  computed,
  ref,
  toRaw,
  watch
}))

vi.mock('../src/runtime/composables/useFormForgeClient', () => ({
  useFormForgeClient: () => ({
    createForm,
    patchForm,
    publishForm,
    unpublishForm
  })
}))

describe('useFormForgeBuilder', () => {
  beforeEach(() => {
    createForm.mockClear()
    patchForm.mockClear()
    publishForm.mockClear()
    unpublishForm.mockClear()
  })

  it('auto publishes on save when autoPublishOnSave is enabled', async () => {
    const { useFormForgeBuilder } = await import('../src/runtime/composables/useFormForgeBuilder')

    const builder = useFormForgeBuilder({
      autoPublishOnSave: true
    })

    builder.draft.value.title = 'System form'

    await builder.save({
      autoPublish: false
    })

    expect(createForm).toHaveBeenCalledTimes(1)
    const call = createForm.mock.calls[0] as unknown as [Record<string, unknown>] | undefined

    expect(call?.[0]).toMatchObject({
      title: 'System form',
      auto_publish: true
    })
    expect(call?.[0]).not.toHaveProperty('access_code_required')
  })

  it('saves an access code once and clears the plaintext draft value', async () => {
    patchForm.mockResolvedValue({
      uuid: 'form-uuid',
      key: 'form-key',
      has_access_code: true
    })

    const { useFormForgeBuilder } = await import('../src/runtime/composables/useFormForgeBuilder')
    const builder = useFormForgeBuilder({
      formUuid: 'form-uuid',
      initial: {
        title: 'Protected form',
        access_code_required: true,
        access_code: 'visitor-code',
        has_access_code: false
      }
    })

    await builder.save()

    const call = patchForm.mock.calls[0] as unknown as [string, Record<string, unknown>] | undefined
    expect(call?.[1]).toMatchObject({
      access_code_required: true,
      access_code: 'visitor-code'
    })
    expect(builder.draft.value.access_code).toBeNull()
    expect(builder.draft.value.has_access_code).toBe(true)
  })

  it('keeps both settings visibility props working as hide aliases', async () => {
    const { isFormForgeBuilderSettingsHidden } = await import('../src/runtime/composables/useFormForgeBuilder')

    expect(isFormForgeBuilderSettingsHidden(false, false)).toBe(false)
    expect(isFormForgeBuilderSettingsHidden(true, false)).toBe(true)
    expect(isFormForgeBuilderSettingsHidden(false, true)).toBe(true)
  })

  it('uses localized default labels when locale is set', async () => {
    const { useFormForgeBuilder } = await import('../src/runtime/composables/useFormForgeBuilder')

    const builder = useFormForgeBuilder({
      locale: 'fr'
    })

    expect(builder.draft.value.pages[0]?.fields[0]?.label).toBe('Texte libre')

    const page = builder.draft.value.pages[0]
    if (page === undefined) {
      return
    }

    builder.addField(page.page_key, 'address')

    expect(page.fields.at(-1)?.address_fields).toEqual([
      { key: 'line1', label: "Ligne d'adresse 1", visible: true, required: true },
      { key: 'line2', label: "Ligne d'adresse 2", visible: false, required: false },
      { key: 'city', label: 'Ville', visible: true, required: true },
      { key: 'state', label: 'État', visible: false, required: false },
      { key: 'zip', label: 'Code postal', visible: true, required: true },
      { key: 'country', label: 'Pays', visible: true, required: true }
    ])
  })

  it('adds a new block with its first question', async () => {
    const { useFormForgeBuilder } = await import('../src/runtime/composables/useFormForgeBuilder')

    const builder = useFormForgeBuilder()
    const initialPageCount = builder.draft.value.pages.length

    const page = builder.addPage('address')

    expect(builder.draft.value.pages).toHaveLength(initialPageCount + 1)
    expect(page.fields).toHaveLength(1)
    expect(page.fields[0]?.type).toBe('address')
    expect(page.fields[0]?.page_key).toBe(page.page_key)
  })
})
