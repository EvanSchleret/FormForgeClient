import { describe, expect, it } from 'vitest'
import { formatFormForgeAddressAnswer } from '../src/runtime/utils/response-answer'

describe('response answer formatting', () => {
  it('formats address fields as readable text', () => {
    expect(formatFormForgeAddressAnswer({
      line1: 'efrgtzui',
      city: 'tdzjtdzj',
      zip: 'dtzjtdz',
      country: 'tdzj'
    })).toBe('efrgtzui, tdzjtdzj, dtzjtdz, tdzj')
  })

  it('omits empty address fields', () => {
    expect(formatFormForgeAddressAnswer({
      line1: 'Rue de Lyon',
      line2: '  ',
      city: 'Geneva'
    })).toBe('Rue de Lyon, Geneva')
  })
})
