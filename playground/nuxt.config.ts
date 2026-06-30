export default defineNuxtConfig({
  modules: ['@nuxt/ui', '../src/module'],
  css: ['~/assets/css/main.css'],
  formforgeClient: {
    autoImports: true
  }
})
