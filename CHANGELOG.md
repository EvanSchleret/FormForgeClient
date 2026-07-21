# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog.

## v2.3.1 - 2026-07-21

### ✨ Highlights

#### 🔒 Reliable read-only rendering

Using `:disabled="true"` now correctly disables all rendered fields, including composite fields such as address inputs.

### 🐛 Bug Fixes

- **Renderer**: apply the global `disabled` prop to every rendered field (`5675103`)

### ❤️ Contributors

- @EvanSchleret

**Full Changelog**: https://github.com/EvanSchleret/FormForgeClient/compare/v2.3.0...v2.3.1

## v2.3.0 - 2026-07-19

### ✨ Highlights

#### 📦 Configurable file upload constraints

File fields now support accepted types, per-file size limits, maximum file counts, and cumulative size limits.

```ts
{
  type: 'file',
  multiple: true,
  accept: ['.pdf', 'image/*'],
  max_size: 5_000_000,
  max_files: 3,
  max_total_size: 10_000_000
}


```
#### 🧹 Cleaner paginated rendering

Obsolete page titles and descriptions are no longer rendered by `FormForgeRenderer`, matching the current builder experience.

### 🚀 Features

- **File uploads**: add client-side validation for accepted types, file count, per-file size, and cumulative size (`65d4399`)

### 🐛 Bug Fixes

- **Renderer**: remove obsolete page headings and descriptions from rendered pages (`0af8c55`)

### ❤️ Contributors

- @EvanSchleret

**Full Changelog**: https://github.com/EvanSchleret/FormForgeClient/compare/v2.2.0...v2.3.0

## v2.2.0 - 2026-07-17

### ✨ Highlights

#### 📄 Single-view renderer mode

`FormForgeRenderer` now supports `pagination="none"` to display all visible form fields on a single view.

The default `pagination="auto"` behavior remains unchanged. In single-view mode, navigation controls and the progress indicator are hidden while validation, payload structure, and conditional rules continue to work as before.

### 🚀 Features

- **Renderer**: add `auto` and `none` pagination modes (`0d07d2d`)

### ❤️ Contributors

- @EvanSchleret

**Full Changelog**: https://github.com/EvanSchleret/FormForgeClient/compare/v2.1.0...v2.2.0

## v2.1.0 - 2026-07-17

### ✨ Highlights

#### 🧩 Clearer conditional logic

Conditional rules now support requiring questions in the current block, use clearer labels, provide more consistent deletion controls, and handle empty operators correctly.

#### 🏠 Readable address responses

Address answers are now displayed as readable, comma-separated values instead of raw JSON.

### 🐛 Bug Fixes

- **Conditional logic**: allow requiring questions in the current block (`9725d05`)
- **Conditional logic**: clarify deletion controls (`ebe78c6`)
- **Conditional logic**: clarify conditional rule labels (`8090efb`)
- **Conditional logic**: handle empty condition operators correctly (`4f3073c`)
- **Responses**: format address answers as readable text (`1a895b6`)

### ❤️ Contributors

- @EvanSchleret

**Full Changelog**: https://github.com/EvanSchleret/FormForgeClient/compare/v2.0.3...v2.1.0

## v2.0.3 - 2026-07-17

### ✨ Highlights

#### 🧩 Safer field type changes

`FormForgeBuilder` now resets type-specific field state when changing types, preventing stale validation rules and incompatible properties from being carried over.

#### 🧱 Add new blocks from the builder

The builder now includes an **Add page** action in both layouts. New blocks are created with their first question and automatically selected for editing.

### 🚀 Features

- **Builder**: add new blocks/pages directly from the form editor (`a126109`)

### 🐛 Bug Fixes

- **Renderer**: hide the submit button by default when using `v-model` (`1435cb5`)
- **Builder**: reset field-specific properties when changing field types (`d32cab3`)

### ❤️ Contributors

- @EvanSchleret

**Full Changelog**: https://github.com/EvanSchleret/FormForgeClient/compare/v2.0.2...v2.0.3

## v2.0.2 - 2026-07-17

### v2.0.2

#### ✨ Highlights

##### 🧩 Automatic `v-model` mode detection

`FormForgeRenderer` now automatically hides the submit button when used with `v-model`. The button can still be explicitly re-enabled with `:show-submit="true"`.

#### 🐛 Bug Fixes

- **Renderer**: hide the submit button by default with `v-model` while preserving the default behavior without an external model (`1435cb5`)

#### ❤️ Contributors

- @EvanSchleret

Full Changelog: [[v2.0.1...v2.0.2](https://github.com/EvanSchleret/FormForgeClient/compare/v2.0.1...v2.0.2)](https://github.com/EvanSchleret/FormForgeClient/compare/v2.0.1...v2.0.2)

## v2.0.1 - 2026-07-01

### What's Changed

* fix(lang): add missing lang keys by @EvanSchleret in https://github.com/EvanSchleret/FormForgeClient/pull/16
* chore: update deps by @EvanSchleret in https://github.com/EvanSchleret/FormForgeClient/pull/17

**Full Changelog**: https://github.com/EvanSchleret/FormForgeClient/compare/v2.0.0...v2.0.1

## v2.0.0 - 2026-06-30

### v2.0.0

We are thrilled to announce FormForge v2.0.0, a major release that brings a more reliable, schema-driven foundation to exports, imports, and form resolution.

##### Added

- Introduced a schema-driven exportable field model for stable CSV template generation, import mapping, and column validation
- Added explicit flattening for composite fields, with `address` expanded into exportable leaf fields
- Added public form resolution by `form_uuid`, with deterministic latest-version selection across backend and scoped managers
- Expanded runtime APIs and type exports to make the new schema and submission primitives reusable by downstream consumers

##### Changed

- Export, import, and validation now share one schema-aware source of truth instead of relying on field-to-column assumptions
- Builder and renderer now operate on the same normalized schema shape, keeping defaults, validation, and payload hydration aligned
- External payload alias resolution remains stable for both `name` and `field_key`

##### Tests

- Added coverage for simple fields, composite fields, `address` expansion, header validation, latest-by-uuid resolution, and Zod/schema normalization

**Full Changelog**: https://github.com/EvanSchleret/FormForgeClient/compare/v1.2.4...v2.0.0

## v1.2.4 - 2026-06-05

### v1.2.4

#### Fixed

- `FormForgeRenderer` no longer drops the injected `beforeRequest` hook when `clientConfig` is provided
- Bearer authentication now remains active when passing renderer-specific overrides such as `scopeParams`
- `useFormForgeClient` now preserves the existing injected FormForge client when merging config overrides

#### Tests

- Added a regression test to verify that `beforeRequest` is still executed when `clientConfig` overrides are passed to `useFormForgeClient`

**Full Changelog**: https://github.com/EvanSchleret/FormForgeClient/compare/v1.2.3...v1.2.4

## v1.2.3 - 2026-05-28

### v1.2.3

#### Fixed

- `FormForgeRenderer` now accepts external `modelValue` payload keys indexed by `field_key` in addition to `field.name`
- Hydration/sanitation now resolves field aliases (`name` + `field_key`) to one canonical field entry
- When both `name` and `field_key` are provided for the same field, `name` takes precedence
- Unknown payload keys continue to be removed during sanitation

#### Tests

- Added renderer payload tests for:
  - `name`-only hydration
  - `field_key`-only hydration
  - mixed payload with `name` precedence
  - unknown fields rejection
  

**Full Changelog**: https://github.com/EvanSchleret/FormForgeClient/compare/v1.2.2...v1.2.3

## v1.2.1 - 2026-05-28

### v1.2.1

#### Changed

- Refactored `useFormForgeManagement` list APIs to return contextual list results:
  
  - `listForms(...)` now returns `{ data, refresh }`
  - `listFormRoute(...)` now returns `{ data, refresh }`
  
- `refresh()` on the returned list result now reliably re-runs the same original request context (endpoint, scope, filters, and route key when applicable).
  

#### Fixed

- Fixed ambiguity where global `management.refresh()` could refresh a different list source than the one previously loaded (for example falling back to `/forms` after loading `/form-routes/{key}`).

#### Compatibility

- Existing reactive state (`management.forms`) remains available for current integrations.
- Global `refreshForms()` / `refresh()` is kept as a fallback, while per-result `refresh()` is now the recommended pattern.

**Full Changelog**: https://github.com/EvanSchleret/FormForgeClient/compare/v1.2.0...v1.2.1

## Unreleased

## v1.2.0 - 2026-05-28

### v1.2.0

#### Added

- Added client API methods:
  
  - `listFormRoute(routeKey, options?)`
  - `listCategoryRoute(routeKey, query?, options?)`
  
- Added management composable support:
  
  - `useFormForgeManagement().listFormRoute(...)`
  
- Added category composable support:
  
  - `useFormForgeCategory().listCategoryRoute(...)`
  - `categoryRouteKey` option for initial loading behavior
  
- Added UI integration props:
  
  - `FormForgeBuilder`:
    
    - `formRouteKey`
    - `categoryRouteKey`
    
  - `FormForgeCategoryCreateModal`:
    
    - `categoryRouteKey`
    
  

#### Changed

- Builder can now preload a form from a configured form route when `loadFormKey` is not provided.
- Category loading in builder/modal can be aligned with backend `category-routes` definitions.

#### Documentation

- Added dedicated backend documentation page for query routes.
- Updated management/composables/component docs to include query route usage.

**Full Changelog**: https://github.com/EvanSchleret/FormForgeClient/compare/v1.1.3...v1.2.0

## v1.1.2 - 2026-04-17

### FormForge Client v1.1.2 🚀

The **v1.1.2** is focused on a targeted standalone renderer fix to prevent stale external fields from leaking into submission payloads.

Since **v1.1.0**, package-level runtime changes are intentionally minimal and centered on this bug fix.

#### ✨ Highlights

- Safer standalone `v-model` payload handling in `FormForgeRenderer`
- Automatic cleanup of unknown keys when form schema fields no longer exist

#### ➕ Added

- Runtime payload sanitization in standalone/external-model mode:
  - keeps only keys present in current schema field names
  - emits cleaned `update:modelValue` when stale keys are detected
  

#### ⚡ Improved

- Better resilience when forms evolve (e.g. fields removed after initial model hydration)
- Cleaner parent state synchronization in standalone usage

#### 🐛 Fixed

- Unknown field submission errors caused by outdated keys in external `v-model` payloads (e.g. `Payload contains unknown fields: short_text`)


---

**📘 Full Changelog**: [v1.1.0...v1.1.2](https://github.com/EvanSchleret/FormForgeClient/compare/v1.1.0...v1.1.2)

## v1.1.0 - 2026-04-14

### FormForge Client v1.1.0 🚀

I'm excited to announce **v1.1.0**, focused on stronger standalone integration, clearer publishing workflows, and better validation control in embedded/custom form setups.

This release improves how FormForge works when integrated into external parent forms while also simplifying management API publication behavior through payload-driven actions.

#### ✨ Highlights

- Payload-driven auto-publication for form create/update workflows
- `defaultPublished` builder behavior aligned with create/patch actions (no extra publish call)
- Better standalone validation ergonomics with exposed renderer validation APIs
- Improved blur-based validation behavior in external `v-model` integrations
- Continued stability improvements for scoped route resolution

#### ➕ Added

- Management payload support for:
  
  - `auto_publish: true`
  - `autoPublish: true` (normalized to `auto_publish`)
  
- `FormForgeRenderer` exposed methods for host apps:
  
  - `validate(options?)`
  - `validateField(name)`
  - `clearErrors(path?)`
  - `getErrors(path?)`
  
- New renderer props for validation triggers:
  
  - `validateOn`
  - `validateOnBlur`
  

#### ⚡ Improved

- Builder save flow now supports auto-publication via payload on create/patch
- `defaultPublished` now relies on the management mutation path instead of issuing a separate `/publish` request
- Standalone/external-model UX with explicit field-level blur validation handling
- Scope param resilience when resolving named scoped routes after navigation

#### 🐛 Fixed

- Cases where named scope params could be missed after route transitions
- TypeScript lint issue (`no-explicit-any`) in submission response typing


---

** 📘 Full Changelog**: https://github.com/EvanSchleret/FormForgeClient/compare/v1.0.0...v1.1.0
