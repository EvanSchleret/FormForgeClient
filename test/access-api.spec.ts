import { describe, expect, it } from 'vitest'
import { createFormForgeClient } from '../src/runtime/api/client'

describe('form access challenge API', () => {
  it('sends the code in a redacted request body and keeps authorization in a redacted header', async () => {
    const requests: Array<{ url: string, headers: Headers, body: string }> = []
    const traces: Array<{ request: { sensitive?: boolean, json?: Record<string, unknown>, headers?: Record<string, string> }, headers: Record<string, string>, url?: string }> = []
    const client = createFormForgeClient({
      baseURL: 'https://forms.example.test',
      beforeRequest: (context) => {
        traces.push({
          request: context.request,
          headers: context.headers,
          url: context.url
        })
      },
      fetch: async (input, init) => {
        requests.push({
          url: String(input),
          headers: new Headers(init?.headers),
          body: typeof init?.body === 'string' ? init.body : ''
        })
        const url = String(input)
        const payload = url.endsWith('/access')
          ? { data: { required: true } }
          : url.endsWith('/access-challenges')
            ? { data: { challenge_id: 'opaque-challenge', expires_at: '2026-10-25T12:05:00+00:00' } }
            : url.endsWith('/verify')
              ? { data: { access_token: 'short-lived-token', expires_at: '2026-10-25T12:15:00+00:00' } }
              : { data: { key: 'contact', version: '1', title: 'Contact', fields: [], pages: [], conditions: [], drafts: { enabled: false }, api: {} } }

        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      }
    })
    const scope = {
      prefix: '/api/teams/{team}/formforge/v1',
      params: { team: 'acme' }
    }

    await expect(client.getAccessStatus('contact', {
      endpoint: '/forms/{key}/access',
      scope
    })).resolves.toEqual({ data: { required: true } })
    await client.createAccessChallenge('contact', {
      endpoint: '/forms/{key}/access-challenges',
      scope
    })
    await client.verifyAccessChallenge('contact', 'opaque-challenge', 'private-code', {
      endpoint: '/forms/{key}/access-challenges/{challenge}/verify',
      scope
    })
    await client.getForm('contact', {
      endpoint: '/forms/{key}',
      scope,
      accessToken: 'short-lived-token'
    })

    expect(requests.map(request => request.url)).toEqual([
      'https://forms.example.test/api/teams/acme/formforge/v1/forms/contact/access',
      'https://forms.example.test/api/teams/acme/formforge/v1/forms/contact/access-challenges',
      'https://forms.example.test/api/teams/acme/formforge/v1/forms/contact/access-challenges/opaque-challenge/verify',
      'https://forms.example.test/api/teams/acme/formforge/v1/forms/contact'
    ])
    expect(requests[2]?.body).toBe(JSON.stringify({ code: 'private-code' }))
    expect(requests[2]?.url).not.toContain('private-code')
    expect(requests[2]?.url).not.toContain('short-lived-token')
    expect(requests[3]?.headers.get('X-FormForge-Access-Token')).toBe('short-lived-token')
    expect(traces[2]?.request.json).toEqual({ redacted: true })
    expect(traces[2]?.headers).not.toHaveProperty('X-FormForge-Access-Token')
    expect(traces[3]?.headers['X-FormForge-Access-Token']).toBe('[redacted]')
  })
})
