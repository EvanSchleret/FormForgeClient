# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog.

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
