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

  it('maps category in use conflict to CATEGORY_IN_USE business code', () => {
    const error = normalizeFormForgeClientError(409, {
      message: 'Category is in use by existing forms.',
      errors: {
        category: ['Category is linked to forms.']
      }
    })

    expect(error.code).toBe('conflict')
    expect(error.businessCode).toBe('CATEGORY_IN_USE')
    expect(error.fieldErrors?.category).toEqual(['Category is linked to forms.'])
  })
})
