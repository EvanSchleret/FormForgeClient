import { beforeEach, describe, expect, it, vi } from 'vitest'

const moduleRegistrations = vi.hoisted(() => ({
  components: [] as Array<{ name: string, filePath: string }>,
  imports: [] as Array<{ from: string, name: string }>
}))

vi.mock('@nuxt/kit', () => ({
  addComponent: (component: { name: string, filePath: string }) => moduleRegistrations.components.push(component),
  addImports: (imports: Array<{ from: string, name: string }>) => moduleRegistrations.imports.push(...imports),
  addPlugin: vi.fn(),
  addTypeTemplate: () => ({ dst: 'types/formforge-client.d.ts' }),
  createResolver: () => ({ resolve: (filePath: string) => filePath }),
  defineNuxtModule: (definition: unknown) => definition
}))

describe('FormForge settings module registration', () => {
  beforeEach(() => {
    moduleRegistrations.components.length = 0
    moduleRegistrations.imports.length = 0
  })

  it('registers the standalone component and composable', async () => {
    const importedModule = await import('../src/module')
    const definition = importedModule.default as unknown as {
      setup: (
        options: { autoImports: boolean },
        nuxt: {
          options: {
            runtimeConfig: { public: Record<string, unknown> }
            css: string[]
          }
          hook: (name: string, callback: (context: { references: Array<{ path: string }> }) => void) => void
        }
      ) => void
    }
    const nuxt = {
      options: {
        runtimeConfig: { public: {} },
        css: []
      },
      hook: () => undefined
    }

    definition.setup({ autoImports: true }, nuxt)

    expect(moduleRegistrations.components).toContainEqual({
      name: 'FormForgeSettings',
      filePath: './runtime/renderers/default/FormForgeSettings.vue'
    })
    expect(moduleRegistrations.imports).toContainEqual({
      from: './runtime/composables/useFormForgeSettings',
      name: 'useFormForgeSettings'
    })
  })
})
