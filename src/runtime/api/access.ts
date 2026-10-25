import type {
  FormForgeAccessAuthorizationResponse,
  FormForgeAccessChallengeResponse,
  FormForgeAccessStatusResponse,
  FormForgeHttpAdapter,
  FormForgeJsonObject
} from '../types'
import { pickFormForgeDataEnvelope } from '../utils/object'
import { formForgeAccessHeaders, resolveEndpointPath, type FormForgeRequestOptions } from './request'

export async function fetchFormForgeAccessStatus(
  http: FormForgeHttpAdapter,
  key: string,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeAccessStatusResponse> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, '/forms/{key}/access', { key }, options.scope),
    method: 'GET',
    headers: formForgeAccessHeaders(options),
    sensitive: options.accessToken !== undefined
  })
  const data = pickFormForgeDataEnvelope(response.data)

  return {
    data: {
      required: data.required === true
    }
  }
}

export async function createFormForgeAccessChallenge(
  http: FormForgeHttpAdapter,
  key: string,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeAccessChallengeResponse> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, '/forms/{key}/access-challenges', { key }, options.scope),
    method: 'POST',
    headers: formForgeAccessHeaders(options),
    json: {}
  })
  const data = pickFormForgeDataEnvelope(response.data)

  return {
    data: {
      challenge_id: typeof data.challenge_id === 'string' ? data.challenge_id : '',
      expires_at: typeof data.expires_at === 'string' ? data.expires_at : ''
    }
  }
}

export async function verifyFormForgeAccessChallenge(
  http: FormForgeHttpAdapter,
  key: string,
  challengeId: string,
  code: string,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeAccessAuthorizationResponse> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, '/forms/{key}/access-challenges/{challenge}/verify', {
      key,
      challenge: challengeId
    }, options.scope),
    method: 'POST',
    json: { code },
    sensitive: true
  })
  const data = pickFormForgeDataEnvelope(response.data)

  return {
    data: {
      access_token: typeof data.access_token === 'string' ? data.access_token : '',
      expires_at: typeof data.expires_at === 'string' ? data.expires_at : ''
    }
  }
}
