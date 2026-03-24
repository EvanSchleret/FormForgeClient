import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import { createFormForgeClient } from './api'
import type { FormForgeBeforeRequestContext, FormForgeClientConfig } from './types'

interface FormForgeNuxtAppHookBridge {
  callHook(name: 'formforge:beforeRequest', context: FormForgeBeforeRequestContext): Promise<void>
}

export default defineNuxtPlugin((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig()
  const publicConfig = runtimeConfig.public.formforge as FormForgeClientConfig | undefined
  const hookedNuxtApp = nuxtApp as typeof nuxtApp & FormForgeNuxtAppHookBridge

  const client = createFormForgeClient({
    ...(publicConfig ?? {}),
    beforeRequest: async (context) => {
      await publicConfig?.beforeRequest?.(context)
      await hookedNuxtApp.callHook('formforge:beforeRequest', context)
    }
  })

  return {
    provide: {
      formforge: client
    }
  }
})
