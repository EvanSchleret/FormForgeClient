import { describe, expect, it } from 'vitest'
import { buildManagedFormData } from '../src/runtime/utils/form-data'

describe('buildManagedFormData', () => {
  it('builds payload fields as payload[...] entries', () => {
    const formData = buildManagedFormData({
      name: 'Evan',
      age: 20,
      consent: true,
      range: {
        start: '2026-03-20',
        end: '2026-03-21'
      }
    }, {
      channel: 'web'
    })

    expect(formData.get('payload[name]')).toBe('Evan')
    expect(formData.get('payload[age]')).toBe('20')
    expect(formData.get('payload[consent]')).toBe('true')
    expect(formData.get('payload[range][start]')).toBe('2026-03-20')
    expect(formData.get('meta[channel]')).toBe('web')
  })
})
