import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FormForgeClient } from '../src/runtime/types'

const getAccessStatus = vi.fn()
const createAccessChallenge = vi.fn()
const verifyAccessChallenge = vi.fn()

vi.mock('#imports', () => ({ ref }))

vi.mock('../src/runtime/composables/useFormForgeClient', () => ({
  useFormForgeClient: () => ({
    getAccessStatus,
    createAccessChallenge,
    verifyAccessChallenge
  })
}))

const client = { getAccessStatus, createAccessChallenge, verifyAccessChallenge } as unknown as FormForgeClient

describe('useFormForgeAccess', () => {
  beforeEach(() => {
    getAccessStatus.mockReset()
    createAccessChallenge.mockReset()
    verifyAccessChallenge.mockReset()
  })

  it('starts a challenge before schema loading and authorizes only after a valid code', async () => {
    const events: string[] = []
    getAccessStatus.mockImplementation(async () => {
      events.push('discover')
      return { data: { required: true } }
    })
    createAccessChallenge.mockImplementation(async () => {
      events.push('challenge')
      return { data: { challenge_id: 'opaque-id', expires_at: '2026-10-25T12:05:00+00:00' } }
    })
    verifyAccessChallenge.mockImplementation(async (_key: string, _id: string, code: string) => {
      events.push(`verify:${code}`)
      return { data: { access_token: 'temporary-token', expires_at: new Date(Date.now() + 60000).toISOString() } }
    })

    const { useFormForgeAccess } = await import('../src/runtime/composables/useFormForgeAccess')
    const access = useFormForgeAccess({
      key: 'contact',
      endpoint: '/forms/{key}',
      scope: 'teams/12',
      locale: 'fr',
      client,
      immediate: false
    })

    await access.discover()
    expect(events).toEqual(['discover', 'challenge'])
    expect(access.state.value).toBe('challenge')
    expect(access.challengeId.value).toBe('opaque-id')

    expect(await access.verify('shared-code')).toBe(true)
    expect(events).toEqual(['discover', 'challenge', 'verify:shared-code'])
    expect(access.state.value).toBe('authorized')
    expect(access.accessToken.value).toBe('temporary-token')
    expect(access).not.toHaveProperty('code')
    access.dispose()
  })

  it('falls back to the legacy schema route when the access status endpoint is unavailable', async () => {
    const events: string[] = []
    getAccessStatus.mockRejectedValue({
      status: 404,
      code: 'not_found',
      message: 'Route not found'
    })

    const { useFormForgeAccess } = await import('../src/runtime/composables/useFormForgeAccess')
    const { discoverFormForgeAccessAndLoadSchema } = await import('../src/runtime/utils/renderer-access')
    const access = useFormForgeAccess({ key: 'contact', client, immediate: false })

    await discoverFormForgeAccessAndLoadSchema(access, async () => {
      events.push('schema')
    })

    expect(events).toEqual(['schema'])
    expect(access.required.value).toBe(false)
    expect(access.state.value).toBe('ready')
    access.dispose()
  })

  it('keeps incorrect-code errors retryable and requires a new challenge after expiry or lockout', async () => {
    getAccessStatus.mockResolvedValue({ data: { required: true } })
    createAccessChallenge
      .mockResolvedValueOnce({ data: { challenge_id: 'first-id', expires_at: '2026-10-25T12:05:00+00:00' } })
      .mockResolvedValueOnce({ data: { challenge_id: 'second-id', expires_at: '2026-10-25T12:05:00+00:00' } })
    verifyAccessChallenge
      .mockRejectedValueOnce({
        status: 422,
        code: 'validation',
        message: 'Incorrect code',
        raw: { code: 'invalid_code', attempts_remaining: 2 }
      })
      .mockRejectedValueOnce({
        status: 410,
        code: 'expired',
        message: 'Expired',
        raw: { code: 'challenge_expired' }
      })

    const { useFormForgeAccess } = await import('../src/runtime/composables/useFormForgeAccess')
    const access = useFormForgeAccess({ key: 'contact', client, immediate: false })

    await access.discover()
    expect(await access.verify('wrong')).toBe(false)
    expect(access.state.value).toBe('challenge')
    expect(access.errorCode.value).toBe('invalid_code')
    expect(access.attemptsRemaining.value).toBe(2)

    expect(await access.verify('shared-code')).toBe(false)
    expect(access.state.value).toBe('expired')
    expect(access.errorCode.value).toBe('challenge_expired')
    expect(access.challengeId.value).toBeNull()

    await access.startChallenge()
    expect(access.state.value).toBe('challenge')
    expect(access.challengeId.value).toBe('second-id')
    access.dispose()
  })

  it('returns to the challenge screen when the temporary authorization expires', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', {})
    getAccessStatus.mockResolvedValue({ data: { required: true } })
    createAccessChallenge.mockResolvedValue({ data: { challenge_id: 'challenge-id', expires_at: '2026-10-25T12:05:00+00:00' } })
    verifyAccessChallenge.mockResolvedValue({
      data: { access_token: 'temporary-token', expires_at: new Date(Date.now() + 1000).toISOString() }
    })

    const { useFormForgeAccess } = await import('../src/runtime/composables/useFormForgeAccess')
    const access = useFormForgeAccess({ key: 'contact', client, immediate: false })

    await access.discover()
    await access.verify('shared-code')
    expect(access.state.value).toBe('authorized')
    await vi.advanceTimersByTimeAsync(1000)
    expect(access.state.value).toBe('expired')
    expect(access.accessToken.value).toBeNull()
    access.dispose()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
})
