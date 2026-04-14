# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog.

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
