<script setup lang="ts">
import type { FormForgeFieldSchema } from '../../../types'
import { useFormForgeI18n } from '../../../composables/useFormForgeI18n'

interface Props {
  field: FormForgeFieldSchema
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const { t } = useFormForgeI18n()

function choiceDisplayValue(): 'list' | 'menu' {
  if (props.field.display === 'list' || props.field.display === 'menu') {
    return props.field.display
  }

  if (props.field.type === 'radio' || props.field.type === 'checkbox_group') {
    return 'list'
  }

  return 'menu'
}

function setChoiceDisplay(display: 'list' | 'menu'): void {
  props.field.display = display
}
</script>

<template>
  <div class="grid gap-2">
    <span class="text-sm font-medium">{{ t('builder.choiceDisplay') }}</span>
    <USelect
      :model-value="choiceDisplayValue()"
      :items="[
        { label: t('builder.choiceDisplay.list'), value: 'list' },
        { label: t('builder.choiceDisplay.menu'), value: 'menu' }
      ]"
      :disabled="readonly"
      @update:model-value="(value: 'list' | 'menu') => setChoiceDisplay(value)"
    />
  </div>
</template>
