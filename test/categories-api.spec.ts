import { describe, expect, it } from 'vitest'
import {
  createFormForgeCategory,
  deleteFormForgeCategory,
  fetchFormForgeCategories,
  fetchFormForgeCategory,
  patchFormForgeCategory
} from '../src/runtime/api/categories'
import { normalizeFormForgeCategoryOptions } from '../src/runtime/utils/category'
import type { FormForgeCategory, FormForgeHttpAdapter, FormForgeHttpRequest } from '../src/runtime/types'

describe('categories api', () => {
  it('normalizes paginated categories from nested data.data', async () => {
    const requests: FormForgeHttpRequest[] = []

    const http: FormForgeHttpAdapter = async <TData>(request: FormForgeHttpRequest) => {
      requests.push(request)

      return {
      status: 200,
      headers: new Headers(),
      data: {
        data: {
          data: [
            {
              id: 1,
              key: 'survey',
              name: 'Survey',
              description: null,
              is_active: true,
              meta: {},
              created_at: null,
              updated_at: null
            },
            {
              id: 2,
              key: 'legacy',
              name: 'Legacy',
              description: 'Old forms',
              is_active: false,
              meta: {},
              created_at: null,
              updated_at: null
            }
          ],
          meta: {
            current_page: 1,
            total: 2
          },
          links: {
            next: null
          }
        }
      } as TData
      }
    }

    const response = await fetchFormForgeCategories(http, {
      per_page: 20,
      search: 'sur',
      is_active: true
    })

    expect(response.data).toHaveLength(2)
    expect(response.data[0]?.key).toBe('survey')
    expect(response.meta?.current_page).toBe(1)
    expect(response.links?.next).toBeNull()
    const query = requests[0]?.query
    expect(query?.per_page).toBe(20)
    expect(query?.search).toBe('sur')
    expect(query?.is_active).toBe(1)
  })

  it('fetches one category from data envelope', async () => {
    const http: FormForgeHttpAdapter = async <TData>() => ({
      status: 200,
      headers: new Headers(),
      data: {
        data: {
          id: 3,
          key: 'events',
          name: 'Events',
          description: null,
          is_active: true,
          meta: {},
          created_at: null,
          updated_at: null
        }
      } as TData
    })

    const category = await fetchFormForgeCategory(http, 'events')

    expect(category.key).toBe('events')
    expect(category.name).toBe('Events')
  })

  it('create/update/delete category endpoints keep normalized payload', async () => {
    const requests: FormForgeHttpRequest[] = []

    const http: FormForgeHttpAdapter = async <TData>(request: FormForgeHttpRequest) => {
      requests.push(request)

      return {
        status: request.method === 'POST' ? 201 : 200,
        headers: new Headers(),
        data: {
          data: {
            id: 4,
            key: 'membership',
            name: 'Membership',
            description: null,
            is_active: true,
            meta: {},
            created_at: null,
            updated_at: null
          }
        } as TData
      }
    }

    const created = await createFormForgeCategory(http, {
      name: 'Membership',
      is_active: true
    })
    const updated = await patchFormForgeCategory(http, 'membership', {
      description: 'Updated'
    })
    const deleted = await deleteFormForgeCategory(http, 'membership')

    expect(created.key).toBe('membership')
    expect(updated.key).toBe('membership')
    expect(deleted.key).toBe('membership')
    expect(requests[0]?.path).toBe('/categories')
    expect(requests[0]?.method).toBe('POST')
    expect(requests[1]?.path).toBe('/categories/membership')
    expect(requests[1]?.method).toBe('PATCH')
    expect(requests[2]?.path).toBe('/categories/membership')
    expect(requests[2]?.method).toBe('DELETE')
  })

  it('supports endpoint overrides', async () => {
    const requests: FormForgeHttpRequest[] = []

    const http: FormForgeHttpAdapter = async <TData>(request: FormForgeHttpRequest) => {
      requests.push(request)

      return {
        status: 200,
        headers: new Headers(),
        data: {
          data: {
            id: 5,
            key: 'survey',
            name: 'Survey',
            description: null,
            is_active: true,
            meta: {},
            created_at: null,
            updated_at: null
          }
        } as TData
      }
    }

    await fetchFormForgeCategories(http, {}, {
      endpoint: '/admin/categories'
    })
    await fetchFormForgeCategory(http, 'survey', {
      endpoint: '/admin/categories/{categoryKey}'
    })
    await createFormForgeCategory(http, {
      name: 'Survey'
    }, {
      endpoint: '/admin/categories'
    })
    await patchFormForgeCategory(http, 'survey', {
      description: 'Updated'
    }, {
      endpoint: '/admin/categories/{categoryKey}'
    })
    await deleteFormForgeCategory(http, 'survey', {
      endpoint: '/admin/categories/{categoryKey}'
    })

    expect(requests[0]?.path).toBe('/admin/categories')
    expect(requests[1]?.path).toBe('/admin/categories/survey')
    expect(requests[2]?.path).toBe('/admin/categories')
    expect(requests[3]?.path).toBe('/admin/categories/survey')
    expect(requests[4]?.path).toBe('/admin/categories/survey')
  })
})

describe('normalizeFormForgeCategoryOptions', () => {
  it('sorts options by name and marks inactive as disabled', () => {
    const categories: FormForgeCategory[] = [
      {
        id: 2,
        key: 'zeta',
        name: 'Zeta',
        description: null,
        is_active: true,
        meta: {},
        created_at: null,
        updated_at: null
      },
      {
        id: 1,
        key: 'alpha',
        name: 'Alpha',
        description: null,
        is_active: false,
        meta: {},
        created_at: null,
        updated_at: null
      }
    ]

    const options = normalizeFormForgeCategoryOptions(categories)

    expect(options[0]?.label).toBe('Alpha')
    expect(options[0]?.value).toBe('alpha')
    expect(options[0]?.disabled).toBe(true)
    expect(options[1]?.label).toBe('Zeta')
  })
})
