import { describe, expect, it } from 'vitest'
import { createFormForgeHttpAdapter } from '../src/runtime/api/http'
import type { FormForgeHttpRequest } from '../src/runtime/types'

describe('http baseURL placeholders', () => {
  it('resolves placeholders from baseURLParams callback', async () => {
    const requests: string[] = []
    const fetchMock: typeof fetch = async (input) => {
      requests.push(String(input))

      return new Response(JSON.stringify({
        data: []
      }), {
        status: 200,
        headers: {
          'content-type': 'application/json'
        }
      })
    }

    const http = createFormForgeHttpAdapter({
      baseURL: 'http://localhost:8000/api/teams/{team}/formforge/v1',
      baseURLParams: () => ({
        team: 'acme'
      }),
      fetch: fetchMock
    })

    const request: FormForgeHttpRequest = {
      path: '/categories',
      method: 'GET'
    }

    await http<{ data: [] }>(request)

    expect(requests[0]).toBe('http://localhost:8000/api/teams/acme/formforge/v1/categories')
  })

  it('keeps unresolved placeholders untouched', async () => {
    const requests: string[] = []
    const fetchMock: typeof fetch = async (input) => {
      requests.push(String(input))

      return new Response(JSON.stringify({
        data: []
      }), {
        status: 200,
        headers: {
          'content-type': 'application/json'
        }
      })
    }

    const http = createFormForgeHttpAdapter({
      baseURL: 'http://localhost:8000/api/teams/{team}/formforge/v1',
      fetch: fetchMock
    })

    await http<{ data: [] }>({
      path: '/categories',
      method: 'GET'
    })

    expect(requests[0]).toBe('http://localhost:8000/api/teams/{team}/formforge/v1/categories')
  })
})
