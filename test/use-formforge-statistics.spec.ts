import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createFormForgeClient } from '../src/runtime/api/client'
import type { FormForgeStatisticsResponse } from '../src/runtime/types'

vi.mock('#imports', () => ({
  ref
}))

vi.mock('../src/runtime/composables/useFormForgeClient', () => ({
  useFormForgeClient: vi.fn()
}))

const statistics: FormForgeStatisticsResponse = {
  form_key: 'survey',
  version: '1',
  period: {
    from: null,
    to: null,
    granularity: 'day',
    timezone: 'UTC'
  },
  totals: {
    submissions: 3
  },
  series: [],
  questions: []
}

describe('useFormForgeStatistics', () => {
  it('fetches on demand and reuses the latest query and request options when refreshed', async () => {
    const requests: string[] = []
    const client = createFormForgeClient({
      baseURL: 'https://formforge.test/api/formforge/v1',
      fetch: async (input) => {
        requests.push(String(input))

        return new Response(JSON.stringify({ data: statistics }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      }
    })
    const query = { version: '1', granularity: 'week' as const }
    const { useFormForgeStatistics } = await import('../src/runtime/composables/useFormForgeStatistics')
    const state = useFormForgeStatistics({
      key: 'survey',
      query,
      endpoint: '/admin/forms/{key}/statistics',
      scope: {
        prefix: 'tenants/{tenant}',
        params: { tenant: 'acme' }
      },
      client,
      immediate: false
    })

    expect(requests).toHaveLength(0)
    expect(state.statistics.value).toBeNull()

    const pendingRequest = state.fetchStatistics()
    expect(state.loading.value).toBe(true)
    await pendingRequest

    expect(state.statistics.value).toEqual(statistics)
    expect(state.loading.value).toBe(false)
    expect(state.error.value).toBeNull()
    expect(requests).toHaveLength(1)
    expect(requests[0]).toContain('/tenants/acme/admin/forms/survey/statistics?version=1&granularity=week')

    await state.refresh()

    expect(requests).toHaveLength(2)
    expect(requests[1]).toBe(requests[0])
  })

  it('stores request errors and clears the loading state', async () => {
    const client = createFormForgeClient({
      baseURL: 'https://formforge.test/api/formforge/v1',
      fetch: async () => new Response(JSON.stringify({ message: 'Statistics service unavailable' }), {
        status: 503,
        headers: { 'content-type': 'application/json' }
      })
    })
    const { useFormForgeStatistics } = await import('../src/runtime/composables/useFormForgeStatistics')
    const state = useFormForgeStatistics({
      key: 'survey',
      query: { version: '1' },
      client,
      immediate: false
    })

    await expect(state.fetchStatistics()).rejects.toMatchObject({
      message: 'Statistics service unavailable'
    })

    expect(state.error.value).toBe('Statistics service unavailable')
    expect(state.loading.value).toBe(false)
  })
})
