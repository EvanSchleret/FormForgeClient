import type {
  FormForgeHttpAdapter,
  FormForgeJsonObject,
  FormForgeStatisticsQuery,
  FormForgeStatisticsResponse
} from '../types'
import { pickFormForgeDataEnvelope } from '../utils/object'
import { resolveEndpointPath, type FormForgeRequestOptions } from './request'

export async function fetchFormForgeStatistics(
  http: FormForgeHttpAdapter,
  key: string,
  query: FormForgeStatisticsQuery,
  options: FormForgeRequestOptions = {}
): Promise<FormForgeStatisticsResponse> {
  const response = await http<FormForgeJsonObject>({
    path: resolveEndpointPath(options.endpoint, `/forms/${key}/statistics`, { key }, options.scope),
    method: 'GET',
    query: { ...query }
  })

  return pickFormForgeDataEnvelope(response.data) as object as FormForgeStatisticsResponse
}
