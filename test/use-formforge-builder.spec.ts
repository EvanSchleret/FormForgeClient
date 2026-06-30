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
})
