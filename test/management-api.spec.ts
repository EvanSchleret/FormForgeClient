import { describe, expect, it } from 'vitest'
import { createFormForgeForm, fetchFormForgeForms, patchFormForgeForm } from '../src/runtime/api/management'
import type { FormForgeHttpAdapter, FormForgeHttpRequest } from '../src/runtime/types'

describe('fetchFormForgeForms', () => {
  it('supports custom endpoint override', async () => {
    const requestedPaths: string[] = []

    const http: FormForgeHttpAdapter = async <TData>(request: FormForgeHttpRequest) => {
      requestedPaths.push(request.path)

      return {
        status: 200,
        headers: new Headers(),
        data: {
          data: []
        } as TData
      }
    }

    await fetchFormForgeForms(http, false, {
      endpoint: '/custom/forms'
    })

    expect(requestedPaths[0]).toBe('/custom/forms')
  })

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

  it('normalizes form category and category_item fields', async () => {
    const http: FormForgeHttpAdapter = async <TData>() => ({
      status: 200,
      headers: new Headers(),
      data: {
        data: {
          data: [
            {
              key: 'form-1',
              title: 'Form 1',
              category: 'events',
              category_item: {
                id: 9,
                key: 'events',
                name: 'Events',
                description: null,
                is_active: true,
                meta: {},
                created_at: null,
                updated_at: null
              }
            }
          ]
        }
      } as TData
    })

    const forms = await fetchFormForgeForms(http)

    expect(forms).toHaveLength(1)
    expect(forms[0]?.category).toBe('events')
    expect(forms[0]?.category_item?.name).toBe('Events')
  })

  it('forwards filters as query params', async () => {
    const requests: FormForgeHttpRequest[] = []

    const http: FormForgeHttpAdapter = async <TData>(request: FormForgeHttpRequest) => {
      requests.push(request)

      return {
        status: 200,
        headers: new Headers(),
        data: {
          data: []
        } as TData
      }
    }

    await fetchFormForgeForms(http, false, {
      filters: {
        category: 'survey',
        search: 'contact'
      }
    })

    expect(requests[0]?.query?.category).toBe('survey')
    expect(requests[0]?.query?.search).toBe('contact')
    expect(requests[0]?.query?.include_deleted).toBe(0)
  })
})

describe('form create/patch category support', () => {
  it('returns normalized category fields on create', async () => {
    const http: FormForgeHttpAdapter = async <TData>() => ({
      status: 201,
      headers: new Headers(),
      data: {
        data: {
          key: 'form-2',
          title: 'Form 2',
          category: 'survey',
          category_item: {
            id: 12,
            key: 'survey',
            name: 'Survey',
            description: null,
            is_active: true,
            meta: {},
            created_at: null,
            updated_at: null
          }
        }
      } as TData
    })

    const form = await createFormForgeForm(http, {
      title: 'Form 2',
      category: 'survey'
    })

    expect(form.category).toBe('survey')
    expect(form.category_item?.key).toBe('survey')
  })

  it('returns normalized category fields on patch', async () => {
    const http: FormForgeHttpAdapter = async <TData>() => ({
      status: 200,
      headers: new Headers(),
      data: {
        data: {
          key: 'form-3',
          title: 'Form 3',
          category: null,
          category_item: null
        }
      } as TData
    })

    const form = await patchFormForgeForm(http, 'form-3', {
      category: null
    })

    expect(form.category).toBeNull()
    expect(form.category_item).toBeNull()
  })
})
