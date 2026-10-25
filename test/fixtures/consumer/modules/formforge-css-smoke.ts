import { defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'formforge-css-smoke'
  },
  setup(_, nuxt) {
    nuxt.hook('modules:done', () => {
      if (nuxt.options.runtimeConfig.public.formforgeCssLayerLoaded !== true) {
        throw new Error('The FormForge manager layer was not loaded in the consumer smoke test')
      }

      const stylesheets = nuxt.options.css.filter(stylesheet => typeof stylesheet === 'string'
        && stylesheet.endsWith('/runtime/assets/formforge.css'))

      if (stylesheets.length !== 1) {
        throw new Error(`Expected one FormForge stylesheet from the app and manager layer, received ${stylesheets.length}`)
      }
    })
  }
})
