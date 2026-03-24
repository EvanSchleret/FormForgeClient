import { describe, expect, it } from 'vitest'
import { normalizeFormForgeClientError } from '../src/runtime/validation/errors'

describe('normalizeFormForgeClientError', () => {
  it('maps status 422 to validation with field errors', () => {
    const error = normalizeFormForgeClientError(422, {
      message: 'Validation failed',
      errors: {
        email: ['The email is required.']
      }
    })

    expect(error.code).toBe('validation')
    expect(error.message).toBe('Validation failed')
    expect(error.fieldErrors?.email).toEqual(['The email is required.'])
  })

  it('maps status 403 to forbidden', () => {
    const error = normalizeFormForgeClientError(403, {
      message: 'Forbidden'
    })

    expect(error.code).toBe('forbidden')
  })
})
