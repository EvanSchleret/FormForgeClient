<script setup lang="ts">
import { toRef } from '#imports'
import type { FormForgeAddressFieldSchema, FormForgeFieldSchema } from '../../../types'
import { useFormForgeI18n } from '../../../composables/useFormForgeI18n'
import { defaultAddressFields } from './builderFieldHelpers'

interface Props {
  field: FormForgeFieldSchema
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const field = toRef(props, 'field')
const { t, locale } = useFormForgeI18n()

const addressFieldsGridStyle = {
  gridTemplateColumns: 'minmax(0, 1.1fr) 4rem 4rem minmax(0, 1.6fr)'
} as const

function addressFieldLabelKey(key: FormForgeAddressFieldSchema['key']): `builder.address.${FormForgeAddressFieldSchema['key']}` {
  return `builder.address.${key}` as const
}

function ensureAddressFields(): FormForgeAddressFieldSchema[] {
  if (!Array.isArray(field.value.address_fields) || field.value.address_fields.length === 0) {
    field.value.address_fields = defaultAddressFields(locale.value)
  }

  return field.value.address_fields
}

function addressFields(): FormForgeAddressFieldSchema[] {
  if (!Array.isArray(field.value.address_fields) || field.value.address_fields.length === 0) {
    return defaultAddressFields(locale.value)
  }

  return field.value.address_fields
}

function setAddressFieldVisible(index: number, visible: boolean): void {
  const addressFields = ensureAddressFields()
  const candidate = addressFields[index]

  if (candidate === undefined) {
    return
  }

  addressFields[index] = {
    ...candidate,
    visible
  }
}

function setAddressFieldRequired(index: number, required: boolean): void {
  const addressFields = ensureAddressFields()
  const candidate = addressFields[index]

  if (candidate === undefined) {
    return
  }

  addressFields[index] = {
    ...candidate,
    required
  }
}

function setAddressFieldLabel(index: number, label: string): void {
  const addressFields = ensureAddressFields()
  const candidate = addressFields[index]

  if (candidate === undefined) {
    return
  }

  addressFields[index] = {
    ...candidate,
    label
  }
}
</script>

<template>
  <UCard :ui="{ body: 'ff:formforge:grid ff:formforge:gap-4' }">
    <div class="ff:formforge:grid ff:formforge:gap-4">
      <div
        class="ff:formforge:hidden ff:formforge:lg:grid ff:formforge:lg:items-center ff:formforge:lg:gap-x-6"
        :style="addressFieldsGridStyle"
      >
        <span class="ff:formforge:min-w-0 ff:formforge:text-sm ff:formforge:weight-500 ff:formforge:text-default">{{ t('builder.addressFields') }}</span>
        <span class="ff:formforge:text-sm ff:formforge:weight-500 ff:formforge:text-default">
          {{ t('builder.address.show') }}
        </span>
        <span class="ff:formforge:text-sm ff:formforge:weight-500 ff:formforge:text-default">
          {{ t('builder.address.required') }}
        </span>
        <span class="ff:formforge:min-w-0 ff:formforge:text-sm ff:formforge:weight-500 ff:formforge:text-default">
          {{ t('builder.address.label') }}
        </span>
      </div>

      <div class="ff:formforge:grid ff:formforge:gap-3">
        <div
          v-for="(addressField, addressIndex) in addressFields()"
          :key="addressField.key"
          class="ff:formforge:grid ff:formforge:gap-2 ff:formforge:lg:items-center ff:formforge:lg:gap-x-6"
          :style="addressFieldsGridStyle"
        >
          <span class="ff:formforge:min-w-0 ff:formforge:text-sm ff:formforge:text-default">
            {{ t(addressFieldLabelKey(addressField.key)) }}
          </span>
          <USwitch
            :model-value="addressField.visible"
            :disabled="readonly"
            class="ff:formforge:justify-self-start"
            @update:model-value="(value: boolean) => setAddressFieldVisible(addressIndex, value)"
          />
          <USwitch
            :model-value="addressField.required"
            :disabled="readonly || !addressField.visible"
            class="ff:formforge:justify-self-start"
            @update:model-value="(value: boolean) => setAddressFieldRequired(addressIndex, value)"
          />
          <div class="ff:formforge:min-w-0">
            <UInput
              :model-value="addressField.label"
              :disabled="readonly"
              :placeholder="t(addressFieldLabelKey(addressField.key))"
              class="ff:formforge:w-full"
              @update:model-value="(value: string) => setAddressFieldLabel(addressIndex, value)"
            />
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
