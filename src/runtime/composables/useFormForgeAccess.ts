import { ref } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
import type {
  FormForgeClient,
  FormForgeClientConfig,
  FormForgeClientError,
  FormForgeScope
} from '../types'

export type FormForgeAccessState = 'idle' | 'loading' | 'challenge' | 'verifying' | 'ready' | 'authorized' | 'expired' | 'error'

export interface UseFormForgeAccessOptions {
  key: string
  endpoint?: string
  scope?: FormForgeScope
  locale?: string
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
  immediate?: boolean
}

function isFormForgeClientError(value: unknown): value is FormForgeClientError {
  return typeof value === 'object'
    && value !== null
    && 'status' in value
    && typeof value.status === 'number'
    && 'code' in value
    && typeof value.code === 'string'
    && 'message' in value
    && typeof value.message === 'string'
}

function resolveServerCode(error: unknown): string | null {
  if (!isFormForgeClientError(error)) {
    return null
  }

  const serverCode = error.raw?.code
  return typeof serverCode === 'string' ? serverCode : null
}

function resolveAttemptsRemaining(error: unknown): number | null {
  if (!isFormForgeClientError(error)) {
    return null
  }

  const attemptsRemaining = error.raw?.attempts_remaining
  return typeof attemptsRemaining === 'number' ? attemptsRemaining : null
}

function appendEndpoint(endpoint: string | undefined, suffix: string): string | undefined {
  if (endpoint === undefined || endpoint.trim() === '') {
    return undefined
  }

  return `${endpoint.replace(/\/+$/g, '')}${suffix}`
}

export function useFormForgeAccess(options: UseFormForgeAccessOptions) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const required = ref<boolean>(false)
  const state = ref<FormForgeAccessState>('idle')
  const challengeId = ref<string | null>(null)
  const challengeExpiresAt = ref<string | null>(null)
  const accessToken = ref<string | null>(null)
  const accessExpiresAt = ref<string | null>(null)
  const errorCode = ref<string | null>(null)
  const attemptsRemaining = ref<number | null>(null)
  const loading = ref<boolean>(false)
  let expiryTimer: ReturnType<typeof setTimeout> | undefined

  function clearExpiryTimer(): void {
    if (expiryTimer !== undefined) {
      clearTimeout(expiryTimer)
      expiryTimer = undefined
    }
  }

  function requestOptions(pathSuffix: string, token?: string | null) {
    const requestOptions = {
      endpoint: appendEndpoint(options.endpoint, pathSuffix),
      scope: options.scope,
      locale: options.locale
    }

    return token === undefined || token === null
      ? requestOptions
      : { ...requestOptions, accessToken: token }
  }

  function invalidateAuthorization(code: string = 'authorization_expired'): void {
    clearExpiryTimer()
    accessToken.value = null
    accessExpiresAt.value = null
    challengeId.value = null
    challengeExpiresAt.value = null
    errorCode.value = code
    state.value = 'expired'
  }

  function setFailure(error: unknown): void {
    errorCode.value = resolveServerCode(error) ?? (isFormForgeClientError(error) && error.code === 'rate_limited' ? 'rate_limited' : 'request_failed')
    attemptsRemaining.value = resolveAttemptsRemaining(error)
  }

  async function discover(): Promise<boolean> {
    loading.value = true
    state.value = 'loading'
    errorCode.value = null
    attemptsRemaining.value = null

    try {
      const response = await client.getAccessStatus(options.key, requestOptions('/access', accessToken.value))
      required.value = response.data.required

      if (!required.value) {
        state.value = 'ready'
        return false
      }

      await startChallenge()
      return true
    } catch (error) {
      if (isFormForgeClientError(error) && error.status === 404) {
        required.value = false
        state.value = 'ready'
        return false
      }

      required.value = true
      setFailure(error)
      state.value = 'error'
      return true
    } finally {
      loading.value = false
    }
  }

  async function startChallenge(): Promise<void> {
    loading.value = true
    state.value = 'loading'
    errorCode.value = null
    attemptsRemaining.value = null

    try {
      const response = await client.createAccessChallenge(options.key, requestOptions('/access-challenges'))
      challengeId.value = response.data.challenge_id
      challengeExpiresAt.value = response.data.expires_at
      accessToken.value = null
      accessExpiresAt.value = null
      state.value = 'challenge'
    } catch (error) {
      setFailure(error)
      state.value = 'error'
    } finally {
      loading.value = false
    }
  }

  async function verify(code: string): Promise<boolean> {
    if (challengeId.value === null) {
      invalidateAuthorization('challenge_expired')
      return false
    }

    loading.value = true
    state.value = 'verifying'
    errorCode.value = null

    try {
      const response = await client.verifyAccessChallenge(options.key, challengeId.value, code, requestOptions(
        `/access-challenges/${encodeURIComponent(challengeId.value)}/verify`
      ))
      clearExpiryTimer()
      accessToken.value = response.data.access_token
      accessExpiresAt.value = response.data.expires_at
      challengeId.value = null
      challengeExpiresAt.value = null
      attemptsRemaining.value = null
      state.value = 'authorized'

      const expiresIn = Math.max(0, Date.parse(response.data.expires_at) - Date.now())
      if (typeof window !== 'undefined') {
        expiryTimer = setTimeout(() => invalidateAuthorization(), expiresIn)
      }

      return true
    } catch (error) {
      setFailure(error)
      const serverCode = resolveServerCode(error)

      if (serverCode === 'challenge_expired' || serverCode === 'attempts_exceeded') {
        challengeId.value = null
        challengeExpiresAt.value = null
        state.value = 'expired'
      } else {
        state.value = 'challenge'
      }

      return false
    } finally {
      loading.value = false
    }
  }

  if (options.immediate !== false) {
    discover().catch(() => {})
  }

  return {
    required,
    state,
    challengeId,
    challengeExpiresAt,
    accessToken,
    accessExpiresAt,
    errorCode,
    attemptsRemaining,
    loading,
    discover,
    startChallenge,
    verify,
    invalidateAuthorization,
    dispose: clearExpiryTimer
  }
}
