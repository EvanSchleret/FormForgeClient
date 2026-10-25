import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@evanschleret/formforgeclient'],
  runtimeConfig: {
    public: {
      formforgeCssLayerLoaded: true
    }
  }
})
