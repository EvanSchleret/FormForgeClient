import { describe, expect, it } from 'vitest'
import { getFormForgeCountryName, getFormForgeCountryOptions, normalizeFormForgeCountryCode } from '../src/runtime/utils/country'

describe('FormForge countries', () => {
  it('provides normalized ISO alpha-2 values with localized labels', () => {
    const switzerland = getFormForgeCountryOptions('fr').find((country) => country.value === 'CH')

    expect(switzerland).toEqual({
      label: 'Suisse',
      value: 'CH'
    })
  })

  it('normalizes codes and existing English or French country names', () => {
    expect(normalizeFormForgeCountryCode('ch', 'fr')).toBe('CH')
    expect(normalizeFormForgeCountryCode('Suisse', 'fr')).toBe('CH')
    expect(normalizeFormForgeCountryCode('Switzerland', 'fr')).toBe('CH')
  })

  it('translates normalized and legacy values while preserving unknown values', () => {
    expect(getFormForgeCountryName('CH', 'fr')).toBe('Suisse')
    expect(getFormForgeCountryName('Switzerland', 'fr')).toBe('Suisse')
    expect(getFormForgeCountryName('Some custom place', 'fr')).toBe('Some custom place')
  })
})
