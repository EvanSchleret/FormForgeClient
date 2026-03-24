import { useNuxtApp, useRuntimeConfig } from '#imports'
import { createFormForgeClient } from '../api'
import type { FormForgeClient, FormForgeClientConfig, FormForgeJsonObject } from '../types'

function hasConfigOverrides(config: FormForgeClientConfig): boolean {
  return Object.keys(config).length > 0
}

export function useFormForgeClient(config: FormForgeClientConfig = {}): FormForgeClient {
  const nuxtApp = useNuxtApp()
  const injectedClient = nuxtApp.$formforge as FormForgeClient | undefined

  if (injectedClient !== undefined && !hasConfigOverrides(config)) {
    return injectedClient
  }

  const runtimeConfig = useRuntimeConfig()
  const runtimePublicConfig = runtimeConfig.public.formforge as FormForgeJsonObject | undefined

  const mergedConfig: FormForgeClientConfig = {
    ...(runtimePublicConfig as FormForgeClientConfig | undefined),
    ...config
  }

  return createFormForgeClient(mergedConfig)
}
