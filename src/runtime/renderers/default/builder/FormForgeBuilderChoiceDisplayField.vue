<script setup lang="ts">
import { toRef } from '#imports'
import type { FormForgeFieldSchema } from '../../../types'
import { useFormForgeI18n } from '../../../composables/useFormForgeI18n'

interface Props {
  field: FormForgeFieldSchema
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const field = toRef(props, 'field')
const { t } = useFormForgeI18n()

function choiceDisplayValue(): 'list' | 'menu' {
  if (field.value.display === 'list' || field.value.display === 'menu') {
    return field.value.display
  }

  if (field.value.type === 'radio' || field.value.type === 'checkbox_group') {
    return 'list'
  }

  return 'menu'
}

function setChoiceDisplay(display: 'list' | 'menu'): void {
  field.value.display = display
}
</script>

<template>
  <div class="ff:formforge:grid ff:formforge:gap-2">
    <span class="ff:formforge:text-sm ff:formforge:weight-500">{{ t('builder.choiceDisplay') }}</span>
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
