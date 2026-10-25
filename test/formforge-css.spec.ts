import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import tailwind from '@tailwindcss/postcss'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'

const sourceCssPath = resolve('src/runtime/assets/formforge.css')
const configuredCssPath = process.env.FORMFORGE_CSS_FILE
const cssPath = configuredCssPath === undefined
  ? sourceCssPath
  : resolve(configuredCssPath)
const fixturePath = resolve('test/fixtures/formforge-host-ui.css')
const sourceCss = readFileSync(cssPath, 'utf8')
const hostThemeRoot = postcss.parse(readFileSync(fixturePath, 'utf8'))

function rendererFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      return rendererFiles(entryPath)
    }

    return entry.name.endsWith('.vue') || entry.name.endsWith('.ts') ? [entryPath] : []
  })
}

function assertNamespacedClasses(source: string): void {
  const classLists = [
    ...Array.from(source.matchAll(/(?<![:\w-])class="([^"]*)"/g), (match) => match[1]),
    ...Array.from(source.matchAll(/:class="([^"]*)"/g), (match) => match[1])
      .flatMap((value) => Array.from(value.matchAll(/['"]([^'"]*)['"]/g), (match) => match[1])),
    ...Array.from(source.matchAll(/:ui="([^"]*)"/gs), (match) => match[1])
      .flatMap((value) => Array.from(value.matchAll(/['"]([^'"]*)['"]/g), (match) => match[1]))
  ]

  for (const classList of classLists) {
    const unscopedClasses = classList.split(/\s+/).filter((token) => token !== ''
      && token !== 'formforge'
      && !token.startsWith('formforge-')
      && !token.startsWith('ff:formforge:'))

    expect(unscopedClasses, `Unscoped classes in: ${classList}`).toEqual([])
  }

  const namespacedLiterals = Array.from(source.matchAll(/["']([^"']*ff:formforge:[^"']*)["']/g), (match) => match[1])
  for (const classList of namespacedLiterals) {
    const unscopedClasses = classList.split(/\s+/).filter((token) => token !== ''
      && token !== 'formforge'
      && !token.startsWith('formforge-')
      && !token.startsWith('ff:formforge:'))

    expect(unscopedClasses, `Unscoped classes in: ${classList}`).toEqual([])
  }
}

function hostThemeToken(selector: string, property: string): string | undefined {
  const rule = hostThemeRoot.nodes?.find((node) => node.type === 'rule' && node.selector === selector)
  if (rule?.type !== 'rule') {
    return undefined
  }

  const declaration = rule.nodes?.find((node) => node.type === 'decl' && node.prop === property)
  return declaration?.type === 'decl' ? declaration.value : undefined
}

const renderedCss = await postcss([tailwind()]).process(sourceCss, { from: cssPath })
const generatedCss = renderedCss.css
const generatedRoot = postcss.parse(generatedCss)

describe('FormForge CSS asset', () => {
  it('uses host Nuxt UI theme variables without referencing the host stylesheet', () => {
    expect(sourceCss).not.toContain('@reference "#build/ui.css"')
    expect(sourceCss).not.toContain('@import "#build/ui.css"')
    expect(sourceCss).toContain('prefix(ff)')
    expect(sourceCss).toContain('@custom-variant formforge')
    expect(sourceCss).toContain('@source "../renderers/**/*.{vue,ts}"')
    expect(sourceCss).toMatch(/--text-color-default:\s*var\(--ui-text\)/)
    expect(sourceCss).toMatch(/--background-color-elevated:\s*var\(--ui-bg-elevated\)/)
  })

  it('keeps renderer utilities package-prefixed and scoped to the FormForge root', () => {
    const renderersPath = join(dirname(cssPath), '../renderers')
    expect(existsSync(renderersPath)).toBe(true)

    for (const file of rendererFiles(renderersPath)) {
      assertNamespacedClasses(readFileSync(file, 'utf8'))
    }

    generatedRoot.walkRules((rule) => {
      expect(rule.selector).toContain('.formforge')
      expect(rule.selector).toContain('.ff\\:formforge\\:')
      expect(rule.selector).not.toMatch(/(^|[\s,])(?:html|body|:root|:host)(?=$|[\s.#:[>])/)
    })

    generatedRoot.walkAtRules('property', (rule) => {
      expect.fail(`FormForge CSS should not register global properties: ${rule.params}`)
    })

    expect(generatedCss).toContain('color: var(--ui-text)')
    expect(generatedCss).toContain('color: var(--ui-error)')
    expect(generatedCss).toContain('background-color: var(--ui-bg-elevated)')
    expect(generatedCss).toContain('border-color: var(--ui-border)')
  })

  it.each([
    ['light host theme while the system prefers dark', ':root', 'white', '#111'],
    ['dark host theme while the system prefers light', '.dark', '#111', 'white']
  ])('follows the %s through host theme tokens', (_scenario, selector, backgroundValue, textValue) => {
    expect(hostThemeToken(selector, '--ui-bg')).toBe(backgroundValue)
    expect(hostThemeToken(selector, '--ui-text')).toBe(textValue)
    expect(generatedCss).toContain('var(--ui-bg')
    expect(generatedCss).toContain('var(--ui-text')
    expect(generatedCss).not.toContain('prefers-color-scheme')
    expect(generatedCss).not.toContain('color-scheme')
  })

  it('does not change global page styles or Nuxt UI components outside FormForge', () => {
    expect(generatedCss).not.toMatch(/(?:^|[,\s])(?:html|body|:root|:host)(?:[,\s{.#:[>]|$)/)
    expect(generatedCss).not.toContain('@layer base')
    expect(generatedCss).not.toContain('@import "#build/ui.css"')
    expect(generatedCss).not.toContain('@apply antialiased')

    generatedRoot.walkRules((rule) => {
      rule.walkDecls((declaration) => {
        expect(declaration.prop).not.toBe('color-scheme')
        expect(declaration.prop).not.toBe('background')
      })
    })
  })
})
