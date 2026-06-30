<script setup lang="ts">
import { computed } from '#imports'
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

const { t } = useFormForgeI18n()

const items = computed(() => [
  { label: t('builder.temporalMode.date'), value: 'date' },
  { label: t('builder.temporalMode.time'), value: 'time' }
])

function temporalModeValue(): FormForgeTemporalMode {
  return resolveTemporalMode(props.field)
}

function setTemporalMode(mode: FormForgeTemporalMode): void {
  props.field.temporal_mode = mode
  props.field.default = null

  if (mode === 'time' && props.field.hour_cycle !== 12 && props.field.hour_cycle !== 24) {
    props.field.hour_cycle = 24
  } else if (mode !== 'time') {
    props.field.hour_cycle = undefined
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
