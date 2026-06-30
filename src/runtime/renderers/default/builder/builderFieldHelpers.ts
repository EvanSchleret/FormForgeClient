import type { FormForgeAddressFieldSchema } from '../../../types'
import { createDefaultAddressFields } from '../../../utils/defaults'

export function defaultAddressFields(locale?: string): FormForgeAddressFieldSchema[] {
  return createDefaultAddressFields(locale)
}
