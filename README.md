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
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6" alt="TypeScript strict" />
</p>

## Read this first

This package is feature-rich. You do not need all features on day one.

Pick one integration mode and ship quickly:

1. Renderer mode: mount `<FormForgeRenderer>` with a `form-key`.
2. Controlled mode: use composables for custom UI and submit flow.
3. Admin mode: use management/categories/responses composables.

You can start with mode 1 and adopt modes 2 and 3 later.

## What this package gives you

- Typed runtime client for FormForge backend API.
- Auto-imported Nuxt composables.
- UI components: renderer, builder, response viewer.
- Upload workflows: `staged`, `managed`, `direct`.
- Admin helpers: forms, categories, responses, revisions, diff.

Backend package:

- [evanschleret/formforge (FormForge)](https://github.com/EvanSchleret/formforge)

## Requirements

- Nuxt `4.x`
- `@nuxt/ui` `4.x`
- Node.js `>=20` or Bun `>=1.3`

## Fast path (5 minutes)

### 1) Install

```bash
bun add @formforge/client
```

### 2) Register module

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@formforge/client'],
  formforgeClient: {
    baseURL: '/api/formforge/v1',
    credentials: 'include',
    uploadMode: 'staged',
    datetimeMode: 'offset',
    locale: 'en',
    autoImports: true
  }
})
```

### 3) Render a form

```vue
<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <FormForgeRenderer
    :form-key="String(route.params.form)"
    show-progress
    show-alert-on-error
    @submitted="(response) => console.log(response)"
    @error="(message) => console.error(message)"
  />
</template>
```

At this point, you can fetch schema and submit without extra setup.

## Integration modes

### Mode A: renderer only (fastest)

Use `<FormForgeRenderer>` in internal mode. The component handles fetch and submit.

### Mode B: controlled form (custom UX)

Use `useFormForgeForm` and `useFormForgeSubmit` when you need full control.

```vue
<script setup lang="ts">
const route = useRoute()

const form = useFormForgeForm({
  key: String(route.params.form),
  immediate: true
})

const submitter = useFormForgeSubmit({
  key: String(route.params.form),
  schema: () => form.schema.value,
  state: () => form.state.value
})

async function onSubmit(): Promise<void> {
  await submitter.submit({ mode: 'staged' })
}
</script>
```

### Mode C: admin/backoffice

Use `useFormForgeManagement`, `useFormForgeCategory`, and `useFormForgeResponses`.

```ts
const management = useFormForgeManagement()
const categories = useFormForgeCategory({ immediate: true })
const responses = useFormForgeResponses({
  key: 'form-uuid',
  immediate: true
})
```

## Scoped routes

FormForge backend can expose endpoints in non-scoped and/or scoped mode:

- non-scoped: `/api/formforge/v1/...`
- scoped: `/api/formforge/v1/<scope-prefix>/...`

### Scoped call with `route.params.user`

```ts
const management = useFormForgeManagement()

await management.listForms(false, {
  scope: 'user'
})
```

### Global named scopes (`nuxt.config.ts`)

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  formforgeClient: {
    baseURL: '/api/formforge/v1',
    scopedRoutes: {
      user: {
        prefix: 'users/{user:uuid}',
        paramsFromRoute: {
          user: 'user'
        }
      },
      team: {
        prefix: 'teams/{team}',
        paramsFromRoute: {
          team: 'team'
        }
      }
    },
    defaultScope: 'user'
  }
})
```

`paramsFromRoute` is the dictionary:

- key: placeholder name used in the prefix (`{user:uuid}` -> `user`)
- value: route param key to read (`route.params.user`)

### Per-request override priority

Request scope name has priority over `defaultScope`.

```ts
await management.listForms(false, {
  scope: 'team'
})
```

### Legacy owner headers migration

In scoped mode, owner is resolved from route params on backend side.

- The client does not inject owner headers automatically.
- If needed, keep legacy headers explicitly via `beforeRequest`.

```ts
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('formforge:beforeRequest', ({ headers }) => {
    headers['X-FormForge-Owner-Type'] = 'user'
    headers['X-FormForge-Owner-Id'] = 'user-a'
  })
})
```

No scope configured means no behavior change.

## Common recipes

### Responses list with route query sync

```ts
const responses = useFormForgeResponses({
  key: 'form-uuid',
  immediate: true,
  querySync: {
    enabled: true,
    pageKey: 'page',
    perPageKey: 'per_page',
    extraKeys: ['search', 'sort']
  }
})

await responses.refresh()
await responses.getResponse('submission-uuid')
await responses.deleteResponse('submission-uuid')
```

### Category options for `<USelect>`

```ts
const options = useFormForgeCategoryOptions({
  query: {
    per_page: 200,
    is_active: true
  }
})
```

### Builder quick usage

```vue
<script setup lang="ts">
const model = ref({
  uuid: null,
  key: null,
  title: 'New form',
  category: null,
  pages: [],
  conditions: [],
  drafts: { enabled: true }
})
</script>

<template>
  <FormForgeBuilder
    v-model="model"
    :autosave="true"
    :autosave-delay="5000"
  />
</template>
```

### Read-only response component

```vue
<template>
  <FormForgeResponse
    :form-key="'form-uuid'"
    :response-uuid="'submission-uuid'"
    layout="line"
  />
</template>
```

## Endpoint overrides

All API composables support endpoint override:

- composable default: `endpoint` option
- per call override: method options

```ts
const management = useFormForgeManagement({
  endpoint: '/admin/forms'
})

await management.listForms(false)
await management.createForm({ title: 'Survey' }, {
  endpoint: '/admin/forms'
})
```

## Runtime hooks and auth

`FormForgeClientConfig` supports:

- `fetch`
- `headers`
- `credentials`
- `beforeRequest`

Nuxt hook before every FormForge request:

```ts
// plugins/formforge-auth.client.ts
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('formforge:beforeRequest', ({ headers }) => {
    const token = useCookie<string | null>('auth_token')

    if (typeof token.value === 'string' && token.value !== '') {
      headers.Authorization = `Bearer ${token.value}`
    }
  })
})
```

With Sanctum cookie auth, keep `credentials: 'include'`.

## Upload and datetime modes

### Upload mode

- `staged` default, uploads first then submit tokens.
- `managed` multipart submit.
- `direct` JSON file references (`disk`, `path`, ...).

```ts
await submitter.submit({ mode: 'managed' })
```

### Datetime mode

- `offset` default, sends local offset.
- `utc` sends UTC ISO.

Backend-managed fields are never sent by submit composables:

- `submitted_by_id`
- `submitted_by_type`
- `type`
- `updated_at`
- `ip_address`

## Composables quick index

Core:

- `useFormForgeClient`
- `useFormForgeApi`
- `useFormForgeSchema`
- `useFormForgeGetForm`
- `useFormForgeForm`
- `useFormForgeSubmit`
- `useFormForgeSubmission`
- `useFormForgeResolver`

Admin:

- `useFormForgeManagement`
- `useFormForgeCategory`
- `useFormForgeCategoryOptions`
- `useFormForgeResponses`

Helpers:

- `useFormForgeDrafts`
- `useFormForgeUploads`
- `useFormForgeWizard`
- `useFormForgeBuilder`
- `useFormForgeI18n`

## Components

- `FormForgeRenderer`
- `FormForgeBuilder`
- `FormForgeResponse`
- `FormForgeCategoryCreateModal`

## Development

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Open source

- Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Code of conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- License: [LICENSE](LICENSE)
