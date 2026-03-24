import { describe, expect, it } from 'vitest'
import { fetchFormForgeForms } from '../src/runtime/api/management'
import type { FormForgeHttpAdapter } from '../src/runtime/types'

describe('fetchFormForgeForms', () => {
  it('reads top-level data array responses', async () => {
    const http: FormForgeHttpAdapter = async <TData>() => ({
      status: 200,
      headers: new Headers(),
      data: {
        data: [
          { uuid: 'u1', key: 'form-1', title: 'Form 1' },
          { uuid: 'u2', key: 'form-2', title: 'Form 2' }
        ]
      } as TData
    })

    const forms = await fetchFormForgeForms(http)

    expect(forms).toHaveLength(2)
    expect(forms[0]?.uuid).toBe('u1')
    expect(forms[1]?.key).toBe('form-2')
  })

  it('reads nested data.items responses', async () => {
    const http: FormForgeHttpAdapter = async <TData>() => ({
      status: 200,
      headers: new Headers(),
      data: {
        data: {
          items: [
            { uuid: 'u3', key: 'form-3', title: 'Form 3' }
          ]
        }
      } as TData
    })

    const forms = await fetchFormForgeForms(http)

    expect(forms).toHaveLength(1)
    expect(forms[0]?.uuid).toBe('u3')
  })
})
