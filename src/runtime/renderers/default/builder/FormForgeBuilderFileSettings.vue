<script setup lang="ts">
import { toRef } from '#imports'
import type { FormForgeFileFieldSchema } from '../../../types'
import { useFormForgeI18n } from '../../../composables/useFormForgeI18n'

interface Props {
  field: FormForgeFileFieldSchema
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const field = toRef(props, 'field')
const { t } = useFormForgeI18n()

function acceptedExtensions(): string {
  return field.value.accept?.join(', ') ?? ''
}

function setAcceptedExtensions(value: string | number | null | undefined): void {
  const input = typeof value === 'string' ? value : ''
  const extensions = input
    .split(/[\s,]+/)
    .map((extension) => extension.trim().toLowerCase())
    .filter((extension) => extension !== '')
    .map((extension) => extension.startsWith('.') || extension.includes('/') || extension === '*'
      ? extension
      : `.${extension}`)

  field.value.accept = Array.from(new Set(extensions))
}

function sizeInMebibytes(value: number | null | undefined): string {
  return typeof value === 'number' && value > 0
    ? String(Number((value / 1024 / 1024).toFixed(2)))
    : ''
}

function setSizeLimit(key: 'max_size' | 'max_total_size', value: string | number | null | undefined): void {
  const numericValue = typeof value === 'number' ? value : Number.parseFloat(value ?? '')
  field.value[key] = Number.isFinite(numericValue) && numericValue > 0
    ? Math.max(1, Math.round(numericValue * 1024 * 1024))
    : undefined
}

function setMaxFiles(value: string | number | null | undefined): void {
  const numericValue = typeof value === 'number' ? value : Number.parseInt(value ?? '', 10)
  field.value.max_files = Number.isFinite(numericValue) && numericValue > 0
    ? Math.floor(numericValue)
    : undefined
}
</script>

<template>
  <UCard :ui="{ body: 'ff:formforge:grid ff:formforge:gap-4' }">
    <template #header>
      <h3 class="ff:formforge:text-sm ff:formforge:weight-600">
        {{ t('builder.fileUploadSettings') }}
      </h3>
    </template>

    <div class="ff:formforge:grid ff:formforge:gap-4">
      <USwitch
        v-model="field.multiple"
        :label="t('builder.fileMultiple')"
        :disabled="readonly"
      />

      <UFormField
        :label="t('builder.acceptedFileTypes')"
        :description="t('builder.acceptedExtensionsDescription')"
      >
        <UInput
          :model-value="acceptedExtensions()"
          :disabled="readonly"
          :placeholder="t('builder.acceptedExtensionsPlaceholder')"
          class="ff:formforge:w-full"
          @update:model-value="setAcceptedExtensions"
        />
      </UFormField>

      <UFormField
        :label="t('builder.maxFileSize')"
        :description="t('builder.fileLimitsDescription')"
      >
        <UInput
          type="number"
          min="0.01"
          step="0.1"
          :model-value="sizeInMebibytes(field.max_size)"
          :disabled="readonly"
          :placeholder="t('builder.fileLimitUsesDefault')"
          class="ff:formforge:w-full"
          @update:model-value="(value: string | number) => setSizeLimit('max_size', value)"
        />
      </UFormField>

      <UFormField
        v-if="field.multiple"
        :label="t('builder.maxFiles')"
        :description="t('builder.maxFilesDescription')"
      >
        <UInput
          type="number"
          min="1"
          step="1"
          :model-value="field.max_files ?? ''"
          :disabled="readonly"
          :placeholder="t('builder.fileLimitUsesDefault')"
          class="ff:formforge:w-full"
          @update:model-value="setMaxFiles"
        />
      </UFormField>

      <UFormField
        v-if="field.multiple"
        :label="t('builder.maxTotalFileSize')"
        :description="t('builder.fileLimitsDescription')"
      >
        <UInput
          type="number"
          min="0.01"
          step="0.1"
          :model-value="sizeInMebibytes(field.max_total_size)"
          :disabled="readonly"
          :placeholder="t('builder.fileLimitUsesDefault')"
          class="ff:formforge:w-full"
          @update:model-value="(value: string | number) => setSizeLimit('max_total_size', value)"
        />
      </UFormField>
    </div>
  </UCard>
</template>
