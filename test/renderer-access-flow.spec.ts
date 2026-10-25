import { describe, expect, it, vi } from 'vitest'
import { discoverFormForgeAccessAndLoadSchema, verifyFormForgeAccessAndLoadSchema } from '../src/runtime/utils/renderer-access'

describe('FormForgeRenderer access flow', () => {
  it('loads the schema only after a valid challenge response', async () => {
    const events: string[] = []
    let required = true
    const access = {
      required: { get value() { return required } },
      discover: vi.fn(async () => {
        events.push('challenge-required')
        return true
      }),
      verify: vi.fn(async (code: string) => {
        events.push(`verify:${code}`)
        return true
      })
    }
    const loadSchema = vi.fn(async () => {
      events.push('load-schema')
    })

    await discoverFormForgeAccessAndLoadSchema(access, loadSchema)
    expect(events).toEqual(['challenge-required'])
    expect(loadSchema).not.toHaveBeenCalled()

    await verifyFormForgeAccessAndLoadSchema(access, 'valid-code', loadSchema)
    expect(events).toEqual(['challenge-required', 'verify:valid-code', 'load-schema'])
    required = false
  })

  it('keeps unprotected forms on the existing direct schema path', async () => {
    const access = {
      required: { value: false },
      discover: vi.fn(async () => false),
      verify: vi.fn(async () => false)
    }
    const loadSchema = vi.fn(async () => {})

    await discoverFormForgeAccessAndLoadSchema(access, loadSchema)
    expect(loadSchema).toHaveBeenCalledTimes(1)
  })
})
