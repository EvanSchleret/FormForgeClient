import { describe, expect, it } from 'vitest'
import { deleteFormForgeResponse, fetchFormForgeResponse, fetchFormForgeResponses } from '../src/runtime/api/responses'
import type { FormForgeHttpAdapter } from '../src/runtime/types'

describe('responses api', () => {
  it('normalizes list responses from top-level data array', async () => {
    const http: FormForgeHttpAdapter = async <TData>() => ({
      status: 200,
      headers: new Headers(),
      data: {
        data: [
          { submission_id: 's1', payload: { name: 'A' } },
          { submission_id: 's2', payload: { name: 'B' } }
        ],
        meta: {
          current_page: 1
        }
      } as TData
    })

    const responses = await fetchFormForgeResponses(http, 'form-key')

    expect(responses.data).toHaveLength(2)
    expect(responses.data[0]?.submission_id).toBe('s1')
    expect(responses.meta?.current_page).toBe(1)
  })

  it('normalizes list responses from nested data.responses array', async () => {
    const http: FormForgeHttpAdapter = async <TData>() => ({
      status: 200,
      headers: new Headers(),
      data: {
        data: {
          responses: [
            { submission_id: 's3', payload: { name: 'C' } }
          ]
        }
      } as TData
    })

    const responses = await fetchFormForgeResponses(http, 'form-key')

    expect(responses.data).toHaveLength(1)
    expect(responses.data[0]?.submission_id).toBe('s3')
  })

  it('reads single response from data envelope', async () => {
    const http: FormForgeHttpAdapter = async <TData>() => ({
      status: 200,
      headers: new Headers(),
      data: {
        data: {
          submission_id: 's4',
          payload: { name: 'D' }
        }
      } as TData
    })

    const response = await fetchFormForgeResponse(http, 'form-key', 's4')

    expect(response.submission_id).toBe('s4')
  })

  it('reads delete response payload from data envelope', async () => {
    const http: FormForgeHttpAdapter = async <TData>() => ({
      status: 200,
      headers: new Headers(),
      data: {
        data: {
          deleted: true,
          submission_id: 's5'
        }
      } as TData
    })

    const response = await deleteFormForgeResponse(http, 'form-key', 's5')

    expect(response.deleted).toBe(true)
    expect(response.submission_id).toBe('s5')
  })
})
