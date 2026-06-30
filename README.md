<p align="center">
  <img src=".github/assets/banner.png" alt="FormForge banner" width="100%" />
</p>

<h1 align="center">FormForge Client</h1>

<p align="center">
  Nuxt 4 client and Nuxt UI v4 renderer for FormForge.
</p>

<p align="center">
  <a href="https://github.com/EvanSchleret/FormForgeClient/actions/workflows/ci.yml"><img src="https://github.com/EvanSchleret/FormForgeClient/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/Nuxt-4.x-00DC82" alt="Nuxt 4.x" />
  <img src="https://img.shields.io/badge/Nuxt_UI-4.x-0EA5E9" alt="Nuxt UI 4.x" />
</p>

## Documentation

Full documentation is available at:

- [formforge.schleret.ch](https://formforge.schleret.ch)

Use this README as a quick start only.

## Requirements

- Nuxt `4.x`
- `@nuxt/ui` `4.x`
- Node.js `>=20` or Bun `>=1.3`

## Install

```bash
bun add @evanschleret/formforgeclient
```

## Minimal setup

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@evanschleret/formforgeclient'],
  formforgeClient: {
    baseURL: '/api/formforge/v1',
    credentials: 'include'
  }
})
```

## Minimal renderer usage

```vue
<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <FormForgeRenderer :form-key="String(route.params.form)" />
</template>
```

## Playground

Run the local playground with:

```bash
bun run playground
```

It mounts `FormForgeBuilder` in `standalone` mode with sample data.

## Scoped routes quick example

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  formforgeClient: {
    baseURL: '/api/formforge/v1',
    scopedRoutes: {
      team: {
        prefix: 'teams/{team}',
        paramsFromRoute: {
          team: 'team'
        }
      }
    },
    defaultScope: 'team'
  }
})
```

```ts
const management = useFormForgeManagement()

const forms = await management.listForms(false)
```

## Useful links

- Backend package: [evanschleret/formforge](https://github.com/EvanSchleret/formforge)
- Security policy: [SECURITY.md](SECURITY.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- License: [LICENSE](LICENSE)
