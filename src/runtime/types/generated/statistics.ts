export interface FormForgeStatisticsResponse {
  form_key: string
  version: string
  period: FormForgeStatisticsPeriodFilter
  totals: FormForgeStatisticsTotals
  series: FormForgeStatisticsPeriod[]
  questions: FormForgeQuestionStatistics[]
}

export type FormForgeStatisticsGranularity = "day" | "week"
export type FormForgeStatisticsPeriod = { period: string; from: string; to: string; submissions: number }
export type FormForgeStatisticsPeriodFilter = { from: string | null; to: string | null; granularity: FormForgeStatisticsGranularity; timezone: string }
export type FormForgeStatisticsTotals = { submissions: number }
export type FormForgeStatisticsChoice = { value: string | number | boolean | null; label: string; count: number; percentage: number }
export type FormForgeStatisticsBucket = { key: string; count: number; percentage: number }
export type FormForgeStatisticsAddressPart = { key: string; label: string; eligible_count: number; answered_count: number; response_rate: number }
export type FormForgeQuestionStatisticsPoint = { period: string; eligible_count: number; answered_count: number; response_rate: number; summary: FormForgeQuestionStatisticsSummary }
export type FormForgeQuestionStatistics = { field_key: string; name: string; label: string; type: string; eligible_count: number; answered_count: number; response_rate: number; summary: FormForgeQuestionStatisticsSummary; series: FormForgeQuestionStatisticsPoint[] }

export type FormForgeQuestionStatisticsSummary =
  | { kind: "text"; count: number; min_length: number | null; average_length: number | null; max_length: number | null }
  | { kind: "number"; count: number; min: number | null; average: number | null; max: number | null }
  | { kind: "address"; complete_count: number; parts: FormForgeStatisticsAddressPart[] }
  | { kind: "file"; file_count: number; total_size_bytes: number; average_size_bytes: number | null }
  | { kind: "temporal"; buckets: FormForgeStatisticsBucket[] }
  | { kind: "multiple_choice"; total_selections: number; choices: FormForgeStatisticsChoice[] }
  | { kind: "choice"; choices: FormForgeStatisticsChoice[] }
  | { kind: "count"; count: number }
