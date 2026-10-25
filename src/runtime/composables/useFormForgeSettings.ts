import { computed, ref, toRaw } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
import type {
  FormForgeClient,
  FormForgeClientConfig,
  FormForgeFormSchema,
  FormForgeManagementForm,
  FormForgeManagementPatchInput,
  FormForgeScope,
  FormForgeSettingsModel
} from '../types'

export interface UseFormForgeSettingsOptions {
  formUuid?: string
  formKey?: string
  endpoint?: string
  scope?: FormForgeScope
  locale?: string
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

function cloneValue<T>(value: T): T {
  const rawValue = toRaw(value)

  if (typeof structuredClone === 'function') {
    return structuredClone(rawValue)
  }

  return JSON.parse(JSON.stringify(rawValue)) as T
}

function settingsFromSchema(schema: FormForgeFormSchema): FormForgeSettingsModel {
  return {
    title: schema.title,
    category: schema.category ?? null,
    publish_at: schema.publish_at ?? null,
    pause_at: schema.pause_at ?? null,
    response_limit: schema.response_limit ?? null,
    submission_code_required: schema.submission_code_required === true,
    submission_code: '',
    has_submission_code: schema.submission_code_required === true,
    public_url: schema.public_url ?? null,
    drafts: cloneValue(schema.drafts ?? { enabled: true }),
    api: cloneValue(schema.api ?? {})
  }
}

export function buildFormForgeSettingsPatch(
  current: FormForgeSettingsModel,
  original: FormForgeSettingsModel
): FormForgeManagementPatchInput {
  const patch: FormForgeManagementPatchInput = {}

  if (current.title !== original.title) {
    patch.title = current.title
  }

  if (current.category !== original.category) {
    patch.category = current.category
  }

  if (current.publish_at !== original.publish_at) {
    patch.publish_at = current.publish_at
  }

  if (current.pause_at !== original.pause_at) {
    patch.pause_at = current.pause_at
  }

  if (current.response_limit !== original.response_limit) {
    patch.response_limit = current.response_limit
  }

  if (current.submission_code_required !== original.submission_code_required) {
    patch.submission_code_required = current.submission_code_required
  }

  const submissionCode = current.submission_code.trim()
  if (submissionCode !== '') {
    patch.submission_code = submissionCode
  }

  if (JSON.stringify(current.drafts) !== JSON.stringify(original.drafts)) {
    patch.drafts = cloneValue(current.drafts)
  }

  if (JSON.stringify(current.api) !== JSON.stringify(original.api)) {
    patch.api = cloneValue(current.api)
  }

  return patch
}

function createEmptySettings(): FormForgeSettingsModel {
  return {
    title: '',
    category: null,
    publish_at: null,
    pause_at: null,
    response_limit: null,
    submission_code_required: false,
    submission_code: '',
    has_submission_code: false,
    public_url: null,
    drafts: { enabled: true },
    api: {}
  }
}

export function useFormForgeSettings(options: UseFormForgeSettingsOptions = {}) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const settings = ref<FormForgeSettingsModel>(createEmptySettings())
  const original = ref<FormForgeSettingsModel | null>(null)
  const formKey = ref<string | null>(options.formKey ?? options.formUuid ?? null)
  const loading = ref<boolean>(false)
  const saving = ref<boolean>(false)
  const error = ref<string | null>(null)
  const lastSavedAt = ref<string | null>(null)
  const changedFields = computed(() => {
    const baseline = original.value
    if (baseline === null) {
      return {} satisfies FormForgeManagementPatchInput
    }

    return buildFormForgeSettingsPatch(
      toRaw(settings.value) as unknown as FormForgeSettingsModel,
      toRaw(baseline) as unknown as FormForgeSettingsModel
    )
  })
  const hasChanges = computed<boolean>(() => Object.keys(changedFields.value).length > 0)

  function setSettings(value: FormForgeSettingsModel): void {
    settings.value = cloneValue(value)
  }

  async function load(identifier: string | undefined = formKey.value ?? undefined): Promise<void> {
    if (identifier === undefined || identifier.trim() === '') {
      error.value = 'A form UUID or key is required'
      return
    }

    const requestId = identifier.trim()
    formKey.value = requestId
    loading.value = true
    error.value = null

    try {
      const schema = await client.getForm(requestId, {
        endpoint: options.endpoint,
        scope: options.scope,
        locale: options.locale
      })
      const nextSettings = settingsFromSchema(schema)

      try {
        const forms = await client.listForms(false, {
          endpoint: options.endpoint,
          scope: options.scope,
          filters: { key: requestId }
        })
        const managementForm = forms.find(form => form.key === requestId || form.form_uuid === requestId)

        if (typeof managementForm?.has_submission_code === 'boolean') {
          nextSettings.has_submission_code = managementForm.has_submission_code
        }
      } catch {
        nextSettings.has_submission_code = nextSettings.submission_code_required
      }

      setSettings(nextSettings)
      original.value = cloneValue(nextSettings)
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to load form settings'
      throw caughtError
    } finally {
      loading.value = false
    }
  }

  async function save(): Promise<FormForgeManagementForm | null> {
    if (formKey.value === null || formKey.value.trim() === '') {
      throw new Error('A form UUID or key is required')
    }

    if (original.value === null) {
      throw new Error('Form settings must be loaded before saving')
    }

    const patch = buildFormForgeSettingsPatch(
      toRaw(settings.value) as unknown as FormForgeSettingsModel,
      toRaw(original.value) as unknown as FormForgeSettingsModel
    )
    if (Object.keys(patch).length === 0) {
      return null
    }

    saving.value = true
    error.value = null

    try {
      const updated = await client.patchForm(formKey.value, patch, {
        endpoint: options.endpoint,
        scope: options.scope
      })
      const nextSettings = cloneValue(toRaw(settings.value) as unknown as FormForgeSettingsModel)

      nextSettings.public_url = typeof updated.public_url === 'string' || updated.public_url === null
        ? updated.public_url
        : nextSettings.public_url
      nextSettings.has_submission_code = typeof updated.has_submission_code === 'boolean'
        ? updated.has_submission_code
        : nextSettings.submission_code_required
      nextSettings.submission_code = ''
      setSettings(nextSettings)
      original.value = cloneValue(nextSettings)
      lastSavedAt.value = new Date().toISOString()

      return updated
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to save form settings'
      throw caughtError
    } finally {
      saving.value = false
    }
  }

  return {
    settings,
    original,
    formKey,
    loading,
    saving,
    error,
    lastSavedAt,
    changedFields,
    hasChanges,
    setSettings,
    load,
    save
  }
}
