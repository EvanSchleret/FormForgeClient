const ADDRESS_KEYS = ['line1', 'line2', 'city', 'state', 'zip', 'country'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function formatAddressPart(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return null
}

export function formatFormForgeAddressAnswer(value: unknown): string | null {
  if (!isRecord(value)) {
    return null
  }

  const parts = ADDRESS_KEYS
    .map((key) => formatAddressPart(value[key]))
    .filter((part): part is string => part !== null)

  return parts.length > 0 ? parts.join(', ') : null
}
