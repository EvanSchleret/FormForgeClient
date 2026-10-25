import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@evanschleret/formforgeclient'],
  formforgeClient: {
    locale: 'en'
  }
})
