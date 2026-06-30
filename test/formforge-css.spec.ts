import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../dist/runtime/assets/formforge.css', import.meta.url), 'utf8')

describe('formforge css asset', () => {
  it('boots from the Nuxt UI build stylesheet', () => {
    expect(css).toContain('@import "#build/ui.css"')
    expect(css).toContain('@source "../renderers/**/*.{vue,ts}"')
  })
})
