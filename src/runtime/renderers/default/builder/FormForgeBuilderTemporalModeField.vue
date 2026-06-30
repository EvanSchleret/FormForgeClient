<script setup lang="ts">
import { computed, toRef } from '#imports'
import { useFormForgeI18n } from '../../../composables/useFormForgeI18n'
import type { FormForgeFieldSchema, FormForgeTemporalMode } from '../../../types'
import { isTemporalMode, resolveTemporalMode } from '../../../utils/temporal'

interface Props {
  field: FormForgeFieldSchema
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const field = toRef(props, 'field')
const { t } = useFormForgeI18n()

const items = computed(() => [
  { label: t('builder.temporalMode.date'), value: 'date' },
  { label: t('builder.temporalMode.time'), value: 'time' }
])

function temporalModeValue(): FormForgeTemporalMode {
  return resolveTemporalMode(field.value)
}

function setTemporalMode(mode: FormForgeTemporalMode): void {
  field.value.temporal_mode = mode
  field.value.default = null

  if (mode === 'time' && field.value.hour_cycle !== 12 && field.value.hour_cycle !== 24) {
    field.value.hour_cycle = 24
  } else if (mode !== 'time') {
    field.value.hour_cycle = undefined
  }
}
</script>

<template>
  <div class="grid gap-4">
    <UFormField :label="t('builder.temporalMode.label')">
      <USelect
        :model-value="temporalModeValue()"
        :items="items"
        :disabled="readonly"
        :ui="{
          base: 'w-full'
        }"
        @update:model-value="(value: string | null) => {
          if (isTemporalMode(value)) {
            setTemporalMode(value)
          }
        }"
      />
    </UFormField>
  </div>
</template>
