import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  clean: true,
  entries: [
    'src/module',
    'src/runtime'
  ],
  externals: [
    'nuxt',
    '#app',
    '#imports',
    '@nuxt/kit',
    '@nuxt/ui',
    '@internationalized/date',
    'zod'
  ],
  rollup: {
    emitCJS: true,
    inlineDependencies: true
  }
})
