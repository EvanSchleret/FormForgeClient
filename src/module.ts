import { addComponent, addImports, addPlugin, addTypeTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import type { FormForgeClientConfig, FormForgeDatetimeMode, FormForgeUploadMode } from './runtime/types'

export interface ModuleOptions {
  baseURL?: string
  credentials?: RequestCredentials
  headers?: Record<string, string>
  uploadMode?: FormForgeUploadMode
  datetimeMode?: FormForgeDatetimeMode
  locale?: string
  autoImports?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@formforge/client',
    configKey: 'formforgeClient',
    compatibility: {
      nuxt: '>=4.0.0'
    }
  },
  defaults: {
    baseURL: '/api/formforge/v1',
    credentials: 'include',
    headers: {},
    uploadMode: 'staged',
    datetimeMode: 'offset',
    locale: 'en',
    autoImports: true
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    const runtimeConfig = nuxt.options.runtimeConfig.public.formforge as FormForgeClientConfig | undefined

    nuxt.options.runtimeConfig.public.formforge = {
      ...runtimeConfig,
      baseURL: options.baseURL,
      credentials: options.credentials,
      headers: options.headers,
      uploadMode: options.uploadMode,
      datetimeMode: options.datetimeMode,
      locale: options.locale
    }

    addPlugin(resolver.resolve('./runtime/plugin'))

    addComponent({
      name: 'FormForgeRenderer',
      filePath: resolver.resolve('./runtime/renderers/default/FormForgeRenderer.vue')
    })

    addComponent({
      name: 'FormForgeBuilder',
      filePath: resolver.resolve('./runtime/renderers/default/FormForgeBuilder.vue')
    })

    if (options.autoImports === true) {
      addImports([
        { from: resolver.resolve('./runtime/composables/useFormForgeApi'), name: 'useFormForgeApi' },
        { from: resolver.resolve('./runtime/composables/useFormForgeClient'), name: 'useFormForgeClient' },
        { from: resolver.resolve('./runtime/composables/useFormForgeSchema'), name: 'useFormForgeSchema' },
        { from: resolver.resolve('./runtime/composables/useFormForgeGetForm'), name: 'useFormForgeGetForm' },
        { from: resolver.resolve('./runtime/composables/useFormForgeI18n'), name: 'useFormForgeI18n' },
        { from: resolver.resolve('./runtime/composables/useFormForgeResolver'), name: 'useFormForgeResolver' },
        { from: resolver.resolve('./runtime/composables/useFormForgeDrafts'), name: 'useFormForgeDrafts' },
        { from: resolver.resolve('./runtime/composables/useFormForgeUploads'), name: 'useFormForgeUploads' },
        { from: resolver.resolve('./runtime/composables/useFormForgeForm'), name: 'useFormForgeForm' },
        { from: resolver.resolve('./runtime/composables/useFormForgeSubmit'), name: 'useFormForgeSubmit' },
        { from: resolver.resolve('./runtime/composables/useFormForgeSubmission'), name: 'useFormForgeSubmission' },
        { from: resolver.resolve('./runtime/composables/useFormForgeResponses'), name: 'useFormForgeResponses' },
        { from: resolver.resolve('./runtime/composables/useFormForgeManagement'), name: 'useFormForgeManagement' },
        { from: resolver.resolve('./runtime/composables/useFormForgeWizard'), name: 'useFormForgeWizard' },
        { from: resolver.resolve('./runtime/composables/useFormForgeBuilder'), name: 'useFormForgeBuilder' }
      ])
    }

    const typeTemplate = addTypeTemplate({
      filename: 'types/formforge-client.d.ts',
      getContents: () => `
import type { FormForgeBeforeRequestContext, FormForgeClient } from '@formforge/client/runtime'

declare module '#app' {
  interface NuxtApp {
    $formforge: FormForgeClient
  }

  interface RuntimeNuxtHooks {
    'formforge:beforeRequest': (context: FormForgeBeforeRequestContext) => void | Promise<void>
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $formforge: FormForgeClient
  }
}

export {}
`
    })

    nuxt.hook('prepare:types', ({ references }) => {
      references.push({
        path: typeTemplate.dst
      })
    })
  }
})
