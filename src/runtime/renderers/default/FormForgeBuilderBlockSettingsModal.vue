<script setup lang="ts">
import { useFormForgeI18n } from '../../composables/useFormForgeI18n'
import type { FormForgePageSchema } from '../../types'
import FormForgeBuilderLogicPanel from './builder/FormForgeBuilderLogicPanel.vue'

interface Props {
  page: FormForgePageSchema
  pages: FormForgePageSchema[]
  pageIndex: number
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const emit = defineEmits<{
  (event: 'close', value: null): void
}>()

const { t } = useFormForgeI18n()

function close(): void {
  emit('close', null)
}
</script>

<template>
  <UModal
    :title="t('builder.logic.title')"
    :close="{ onClick: close }"
    :ui="{ content: 'max-w-7xl' }"
  >
    <template #body>
      <FormForgeBuilderLogicPanel
        :page="props.page"
        :pages="props.pages"
        :page-index="props.pageIndex"
        :readonly="props.readonly"
      />
    </template>
  </UModal>
</template>
