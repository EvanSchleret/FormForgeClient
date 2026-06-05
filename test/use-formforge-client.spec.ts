import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFormForgeClient } from '../src/runtime/api/client'

const mocks = vi.hoisted(() => {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    return new Response(JSON.stringify({
      data: []
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json'
      }
    })
  })

  const beforeRequest = vi.fn(async ({ headers }: { headers: Record<string, string> }) => {
    headers.Authorization = 'Bearer injected-token'
  })

  const nuxtApp = {
    $formforge: undefined as ReturnType<typeof createFormForgeClient> | undefined
  }

  const route = {
    params: {},
    query: {},
    path: '/'
  }

  const runtimeConfig = {
    public: {
      formforge: {}
    }
  }

  return {
    beforeRequest,
    fetchMock,
    nuxtApp,
    route,
    runtimeConfig
  }
})

vi.mock('#imports', () => ({
  useNuxtApp: () => mocks.nuxtApp,
  useRoute: () => mocks.route,
  useRuntimeConfig: () => mocks.runtimeConfig
}))

describe('useFormForgeClient', () => {
  beforeEach(() => {
    mocks.fetchMock.mockClear()
    mocks.beforeRequest.mockClear()
    mocks.nuxtApp.$formforge = undefined
  })

  it('preserves the injected beforeRequest hook when clientConfig overrides are provided', async () => {
    mocks.nuxtApp.$formforge = createFormForgeClient({
      baseURL: 'http://localhost:8000/api/formforge/v1',
      beforeRequest: mocks.beforeRequest,
      fetch: mocks.fetchMock
    })

    const { useFormForgeClient } = await import('../src/runtime/composables/useFormForgeClient')
    const client = useFormForgeClient({
      scopeParams: {
        community: 'acme'
      }
    })

    await client.listForms(false)

    expect(mocks.beforeRequest).toHaveBeenCalledTimes(1)
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1)

    const requestInit = mocks.fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    const headers = requestInit?.headers as Record<string, string> | undefined

    expect(headers?.Authorization).toBe('Bearer injected-token')
  })
})
