import type { FormForgeFieldSchema, FormForgeFieldType, FormForgeTemporalMode } from '../types'

const LEGACY_TEMPORAL_TYPES: Record<'date' | 'time', FormForgeTemporalMode> = {
  date: 'date',
  time: 'time'
}

export function isTemporalMode(value: unknown): value is FormForgeTemporalMode {
  return value === 'date' || value === 'time'
}

export function isLegacyTemporalFieldType(value: string): value is keyof typeof LEGACY_TEMPORAL_TYPES {
  return value === 'date' || value === 'time'
}

export function isTemporalFieldType(value: string): boolean {
  return value === 'temporal' || isLegacyTemporalFieldType(value)
}

export function temporalModeFromFieldType(value: string): FormForgeTemporalMode {
  if (isLegacyTemporalFieldType(value)) {
    return LEGACY_TEMPORAL_TYPES[value]
  }

  return 'date'
}

export function resolveTemporalMode(field: Pick<FormForgeFieldSchema, 'type' | 'temporal_mode'>): FormForgeTemporalMode {
  if (field.type === 'temporal' && isTemporalMode(field.temporal_mode)) {
    return field.temporal_mode
  }

  return temporalModeFromFieldType(field.type)
}

export function isTemporalDateMode(mode: FormForgeTemporalMode): boolean {
  return mode === 'date'
}
