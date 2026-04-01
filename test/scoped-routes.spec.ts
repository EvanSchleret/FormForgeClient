import { describe, expect, it } from 'vitest'
import { createFormForgeClient } from '../src/runtime/api/client'
import { resolveEndpointPath } from '../src/runtime/api/request'

describe('scoped routes', () => {
  it('keeps non-scoped URL unchanged', () => {
    const path = resolveEndpointPath(undefined, '/forms')
    expect(path).toBe('/forms')
  })

  it('builds scoped URL with simple placeholder', () => {
    const path = resolveEndpointPath(undefined, '/forms', {}, {
      prefix: 'communities/{community}',
      params: {
        community: 'acme'
      }
    })

    expect(path).toBe('/communities/acme/forms')
  })

  it('builds scoped URL with binding placeholder', () => {
    const path = resolveEndpointPath(undefined, '/forms', {}, {
      prefix: 'communities/{community:uuid}',
      params: {
        community: 'acme'
      }
    })

    expect(path).toBe('/communities/acme/forms')
  })

  it('throws a clear error when scope param is missing', () => {
    expect(() => resolveEndpointPath(undefined, '/forms', {}, {
      prefix: 'communities/{community:uuid}',
      params: {}
    })).toThrowError('Missing required scope param "community" for scope prefix "communities/{community:uuid}"')
  })

  it('uses default named scope when request scope is not provided', async () => {
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

    const client = createFormForgeClient({
      baseURL: 'http://localhost:8000/api/formforge/v1',
      scopedRoutes: {
        community: {
          prefix: 'communities/{community}',
          paramsFromRoute: {
            community: 'community'
          }
        }
      },
      defaultScope: 'community',
      scopeParams: () => ({
        community: 'global'
      }),
      fetch: fetchMock
    })

    await client.listForms(false)

    expect(requests[0]).toBe('http://localhost:8000/api/formforge/v1/communities/global/forms?include_deleted=0')
  })

  it('supports scoped management routes when non-scoped route is unavailable', async () => {
    const fetchMock: typeof fetch = async (input) => {
      const url = String(input)

      if (url.endsWith('/api/formforge/v1/forms?include_deleted=0')) {
        return new Response(JSON.stringify({
          message: 'Not Found'
        }), {
          status: 404,
          headers: {
            'content-type': 'application/json'
          }
        })
      }

      if (url.endsWith('/api/formforge/v1/communities/acme/forms?include_deleted=0')) {
        return new Response(JSON.stringify({
          data: []
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        })
      }

      return new Response(JSON.stringify({
        message: 'Unexpected URL'
      }), {
        status: 500,
        headers: {
          'content-type': 'application/json'
        }
      })
    }

    const client = createFormForgeClient({
      baseURL: 'http://localhost:8000/api/formforge/v1',
      scopedRoutes: {
        community: {
          prefix: 'communities/{community:uuid}',
          paramsFromRoute: {
            community: 'community'
          }
        }
      },
      defaultScope: 'community',
      scopeParams: () => ({
        community: 'acme'
      }),
      fetch: fetchMock
    })

    const forms = await client.listForms(false)
    expect(forms).toEqual([])
  })

  it('lets request scope name override default scope name', async () => {
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

    const client = createFormForgeClient({
      baseURL: 'http://localhost:8000/api/formforge/v1',
      scopedRoutes: {
        community: {
          prefix: 'communities/{community}',
          paramsFromRoute: {
            community: 'community'
          }
        },
        team: {
          prefix: 'teams/{team}',
          paramsFromRoute: {
            team: 'team'
          }
        }
      },
      defaultScope: 'community',
      scopeParams: () => ({
        community: 'acme',
        team: 'core'
      }),
      fetch: fetchMock
    })

    await client.listForms(false, {
      scope: 'team'
    })

    expect(requests[0]).toBe('http://localhost:8000/api/formforge/v1/teams/core/forms?include_deleted=0')
  })

  it('throws a clear error when named scope param source is missing', async () => {
    const fetchMock: typeof fetch = async () => new Response(JSON.stringify({
      data: []
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json'
      }
    })

    const client = createFormForgeClient({
      baseURL: 'http://localhost:8000/api/formforge/v1',
      scopedRoutes: {
        community: {
          prefix: 'communities/{community:uuid}',
          paramsFromRoute: {
            community: 'community'
          }
        }
      },
      defaultScope: 'community',
      scopeParams: () => ({}),
      fetch: fetchMock
    })

    await expect(client.listForms(false)).rejects.toThrowError('Missing scope param source "community" for named scope "community"')
  })
})
