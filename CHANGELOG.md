# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog.

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

- `FormForgeRenderer` now sanitizes and hydrates external `modelValue` payloads using both field `name` and `field_key` aliases.
- Mixed payloads now resolve to one canonical field entry with `name` priority over `field_key`.
- Unknown payload keys are still removed during sanitation.

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
