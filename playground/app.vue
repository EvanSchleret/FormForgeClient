<script setup lang="ts">
import type { FormForgeBuilderDraft } from '../src/runtime/composables/useFormForgeBuilder'
import type { FormForgeFormSchema } from '../src/runtime/types'

const draft = ref<FormForgeBuilderDraft>({
  uuid: null,
  key: null,
  schema_version: 2,
  title: 'FormForge Playground',
  publish_at: null,
  pause_at: null,
  response_limit: null,
  submission_code_required: false,
  category: null,
  pages: [
    {
      page_key: 'pg_intro',
      title: '',
      description: null,
      meta: {
        logic: {
          version: 1,
          rules: []
        }
      },
      fields: [
        {
          field_key: 'fk_name',
          type: 'text',
          name: 'name',
          page_key: 'pg_intro',
          label: 'Your name',
          required: true,
          nullable: false,
          default: null,
          rules: [],
          meta: {},
          placeholder: 'Entrez votre réponse ici ...',
          disabled: false,
          readonly: false
        },
        {
          field_key: 'fk_consent',
          type: 'consent',
          name: 'consent',
          page_key: 'pg_intro',
          label: 'Consent',
          required: false,
          nullable: false,
          default: null,
          rules: [],
          meta: {},
          consent_label: 'I agree',
          disabled: false,
          readonly: false
        }
      ]
    },
    {
      page_key: 'pg_followup',
      title: '',
      description: null,
      meta: {
        logic: {
          version: 1,
          rules: []
        }
      },
      fields: [
        {
          field_key: 'fk_choice',
          type: 'select',
          name: 'choice',
          page_key: 'pg_followup',
          label: 'Choose one',
          required: false,
          nullable: false,
          default: null,
          rules: [],
          meta: {},
          options: [
            { label: 'Option 1', value: 'option_1' },
            { label: 'Option 2', value: 'option_2' }
          ],
          display: 'menu',
          disabled: false,
          readonly: false
        }
      ]
    }
  ],
  conditions: [],
  drafts: {
    enabled: true
  }
})

const previewPageKey = ref<string | null>(draft.value.pages[0]?.page_key ?? null)

const previewSchema = computed<FormForgeFormSchema>(() => ({
  key: draft.value.key ?? 'playground',
  version: 'preview',
  schema_version: draft.value.schema_version,
  title: draft.value.title,
  publish_at: draft.value.publish_at ?? null,
  pause_at: draft.value.pause_at ?? null,
  response_limit: draft.value.response_limit ?? null,
  submission_code_required: draft.value.submission_code_required ?? false,
  category: draft.value.category ?? null,
  is_published: true,
  fields: draft.value.pages.flatMap((page) => Array.isArray(page.fields) ? page.fields : []),
  pages: draft.value.pages,
  conditions: draft.value.conditions,
  drafts: draft.value.drafts,
  api: {},
  meta: {}
}))

function onSelectionChange(pageKey: string | null): void {
  if (pageKey !== null) {
    previewPageKey.value = pageKey
  }
}
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-default p-6 text-default">
      <div class="mx-auto grid w-full max-w-[1600px] gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <div class="grid gap-6">
          <UCard variant="soft">
            <div class="flex flex-col gap-2">
              <p class="text-sm font-medium text-muted">
                Playground
              </p>
              <h1 class="text-2xl font-semibold text-highlighted">
                FormForge Builder
              </h1>
              <p class="text-sm text-muted">
                Standalone editing with live preview.
              </p>
            </div>
            <UColorModeButton />
          </UCard>

          <FormForgeBuilder
            v-model="draft"
            standalone
            @selection-change="onSelectionChange"
          />
        </div>

        <UCard
          variant="soft"
          class="xl:sticky xl:top-6"
        >
          <template #header>
            <div class="space-y-1">
              <p class="text-sm font-medium text-muted">
                Live preview
              </p>
              <h2 class="text-xl font-semibold text-highlighted">
                Current block
              </h2>
            </div>
          </template>

          <FormForgeRenderer
            :schema="previewSchema"
            :preview-page-key="previewPageKey"
            :simulation="true"
            :show-submit="true"
            :show-progress="false"
          />
        </UCard>
      </div>
    </div>
  </UApp>
</template>
