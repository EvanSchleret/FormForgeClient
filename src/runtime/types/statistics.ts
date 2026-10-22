import type { FormForgeStatisticsGranularity } from './generated'

export type { FormForgeStatisticsGranularity } from './generated'

export interface FormForgeStatisticsQuery {
  version: string
  from?: string
  to?: string
  granularity?: FormForgeStatisticsGranularity
  timezone?: string
  is_test?: boolean
}
