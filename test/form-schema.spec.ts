import { describe, expect, it, vi } from 'vitest'
import type { FormForgeClient, FormForgeFormSchema } from '../src/runtime/types'
import { fetchFormForgeClientSchema } from '../src/runtime/utils/form-schema'

describe('fetchFormForgeClientSchema', () => {
  const schema = { key: 'contact', version: '1' } as FormForgeFormSchema

  it('loads the latest schema when no version is provided', async () => {
    const getForm = vi.fn().mockResolvedValue(schema)
    const getFormVersion = vi.fn()
    const client = { getForm, getFormVersion } as unknown as Pick<FormForgeClient, 'getForm' | 'getFormVersion'>

    await expect(fetchFormForgeClientSchema(client, 'contact', undefined, { endpoint: '/forms/{key}' })).resolves.toBe(schema)

    expect(getForm).toHaveBeenCalledWith('contact', { endpoint: '/forms/{key}' })
    expect(getFormVersion).not.toHaveBeenCalled()
  })

  it('loads a requested version with the same request options', async () => {
    const getForm = vi.fn()
    const getFormVersion = vi.fn().mockResolvedValue(schema)
    const client = { getForm, getFormVersion } as unknown as Pick<FormForgeClient, 'getForm' | 'getFormVersion'>
    const requestOptions = {
      endpoint: '/forms/{key}/versions/{version}',
      accessToken: 'temporary-token'
    }

    await expect(fetchFormForgeClientSchema(client, 'contact', '3', requestOptions)).resolves.toBe(schema)

    expect(getFormVersion).toHaveBeenCalledWith('contact', '3', requestOptions)
    expect(getForm).not.toHaveBeenCalled()
  })
})
