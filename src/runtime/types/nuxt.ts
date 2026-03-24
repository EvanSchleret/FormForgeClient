import type { FormForgeClient } from '../api/client'

declare module '#app' {
  interface NuxtApp {
    $formforge: FormForgeClient
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $formforge: FormForgeClient
  }
}

export {}
