import { describe, expect, it } from 'vitest'
import { fetchFormForgeStatistics } from '../src/runtime/api/statistics'
import type { FormForgeHttpAdapter, FormForgeHttpRequest, FormForgeStatisticsResponse } from '../src/runtime/types'

describe('statistics api', () => {
  it('requests statistics with filters and unwraps the response envelope', async () => {
    const requests: FormForgeHttpRequest[] = []
    const statistics: FormForgeStatisticsResponse = {
      form_key: 'survey',
      version: '2',
      period: {
        from: null,
        to: null,
        granularity: 'week',
        timezone: 'Europe/Zurich'
      },
      totals: {
        submissions: 12
      },
      series: [],
      questions: []
    }
    const http: FormForgeHttpAdapter = async <TData>(request: FormForgeHttpRequest) => {
      requests.push(request)

      return {
        status: 200,
        headers: new Headers(),
        data: {
          data: statistics
        } as TData
      }
    }

    const response = await fetchFormForgeStatistics(http, 'survey', {
      version: '2',
      from: '2026-05-01',
      to: '2026-05-31',
      granularity: 'week',
      timezone: 'Europe/Zurich',
      is_test: false
    })

    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({
      path: '/forms/survey/statistics',
      method: 'GET',
      query: {
        version: '2',
        from: '2026-05-01',
        to: '2026-05-31',
        granularity: 'week',
        timezone: 'Europe/Zurich',
        is_test: false
      }
    })
    expect(response).toEqual(statistics)
  })

  it('supports endpoint overrides and scoped routes', async () => {
    const requests: FormForgeHttpRequest[] = []
    const http: FormForgeHttpAdapter = async <TData>(request: FormForgeHttpRequest) => {
      requests.push(request)

      return {
        status: 200,
        headers: new Headers(),
        data: { data: {} } as TData
      }
    }

    await fetchFormForgeStatistics(http, 'survey', { version: '1' }, {
      endpoint: '/admin/forms/{key}/statistics',
      scope: {
        prefix: 'tenants/{tenant}',
        params: { tenant: 'acme' }
      }
    })

    expect(requests[0]?.path).toBe('/tenants/acme/admin/forms/survey/statistics')
  })
})
