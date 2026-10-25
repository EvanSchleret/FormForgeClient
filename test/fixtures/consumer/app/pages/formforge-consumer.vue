<script setup lang="ts">
import type { FormForgeBuilderDraft, FormForgeFormSchema } from '@evanschleret/formforgeclient/runtime'

const builderDraft = ref<FormForgeBuilderDraft>({
  uuid: null,
  key: null,
  schema_version: 2,
  title: 'Consumer builder title',
  category: null,
  pages: [
    {
      page_key: 'builder_page',
      title: '',
      meta: {},
      fields: [
        {
          field_key: 'builder_question',
          type: 'text',
          name: 'builder_question',
          page_key: 'builder_page',
          label: 'Consumer builder question',
          required: false,
          nullable: true,
          default: null,
          rules: [],
          meta: {}
        }
      ]
    }
  ],
  conditions: [],
  drafts: {
    enabled: false
  },
  api: {}
})

const rendererSchema: FormForgeFormSchema = {
  key: 'consumer-smoke',
  version: '1',
  schema_version: 2,
  title: 'Consumer renderer title',
  is_published: true,
  fields: [
    {
      field_key: 'renderer_question',
      type: 'text',
      name: 'renderer_question',
      page_key: 'renderer_page',
      label: 'Consumer renderer question',
      required: false,
      nullable: true,
      default: null,
      rules: [],
      meta: {}
    }
  ],
  pages: [
    {
      page_key: 'renderer_page',
      title: '',
      meta: {},
      fields: [
        {
          field_key: 'renderer_question',
          type: 'text',
          name: 'renderer_question',
          page_key: 'renderer_page',
          label: 'Consumer renderer question',
          required: false,
          nullable: true,
          default: null,
          rules: [],
          meta: {}
        }
      ]
    }
  ],
  conditions: [],
  drafts: {
    enabled: false
  },
  api: {}
}
</script>

<template>
  <main>
    <section data-formforge-builder-smoke>
      <FormForgeBuilder
        v-model="builderDraft"
        standalone
        readonly
        hide-settings
        disable-category-control
        :autosave="false"
      />
    </section>
    <section data-formforge-renderer-smoke>
      <FormForgeRenderer
        :schema="rendererSchema"
        :model-value="{}"
        simulation
        :show-submit="false"
      />
    </section>
  </main>
</template>
