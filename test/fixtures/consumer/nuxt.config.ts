import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@evanschleret/formforgeclient', './modules/formforge-css-smoke'],
  css: ['~/assets/css/main.css'],
  formforgeClient: {
    locale: 'en'
  }
})
