import { useFormForgeClient } from './useFormForgeClient'
import type { FormForgeClient, FormForgeClientConfig } from '../types'

export function useFormForgeApi(config: FormForgeClientConfig = {}): FormForgeClient {
  return useFormForgeClient(config)
}
