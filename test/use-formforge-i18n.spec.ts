import { computed } from 'vue'
import { describe, expect, it, vi } from 'vitest'

vi.mock('#imports', () => ({
  computed,
  useNuxtApp: () => ({
    $i18n: undefined
  }),
  useRuntimeConfig: () => ({
    public: {}
  })
}))

describe('useFormForgeI18n', () => {
  it('returns French labels for builder tabs and settings', async () => {
    const { useFormForgeI18n } = await import('../src/runtime/composables/useFormForgeI18n')

    const { t } = useFormForgeI18n({
      locale: 'fr'
    })

    expect(t('builder.tabs.builder')).toBe('Constructeur')
    expect(t('builder.tabs.settings')).toBe('Paramètres')
    expect(t('builder.settings.title')).toBe('Paramètres')
    expect(t('builder.settings.opening.date')).toBe('Date d’ouverture')
    expect(t('builder.settings.access.pinPlaceholder')).toBe('Saisissez le PIN')
  })
})
