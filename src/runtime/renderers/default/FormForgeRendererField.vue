<script setup lang="ts">
import { computed } from '#imports'
import type { DateValue, Time } from '@internationalized/date'
import type {
  FormForgeAddressFieldSchema,
  FormForgeFieldSchema
} from '../../types'
import { sanitizeFormForgeInlineRichText, sanitizeFormForgeRichText } from '../../utils/rich-text'
import { resolveTemporalMode } from '../../utils/temporal'

type FormForgeDynamicValue = string | number | boolean | null | undefined | DateValue | Time | File | File[] | Record<string, unknown> | Array<unknown>

interface Props {
  field: FormForgeFieldSchema
  modelValue: unknown
  componentProps: Record<string, unknown>
  fieldUi: Record<string, unknown>
  addressFields: FormForgeAddressFieldSchema[]
  required: boolean
  disabled: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: FormForgeDynamicValue): void
  (event: 'blur'): void
}>()

const temporalMode = computed(() => resolveTemporalMode(props.field))
const temporalHourCycle = computed(() => props.field.hour_cycle === 12 ? 12 : 24)
const temporalInputProps = computed(() => {
  const { placeholder, ...rest } = props.componentProps
  return rest
})

function fullWidthUi(ui: unknown): Record<string, unknown> {
  if (ui === null || typeof ui !== 'object' || Array.isArray(ui)) {
    return {
      base: 'w-full',
      root: 'w-full'
    }
  }

  return {
    ...(ui as Record<string, unknown>),
    base: 'w-full'
  }
}

function choiceDisplayValue(): 'list' | 'menu' {
  if (props.field.display === 'list' || props.field.display === 'menu') {
    return props.field.display
  }

  if (props.field.type === 'radio' || props.field.type === 'checkbox_group') {
    return 'list'
  }

  return 'menu'
}

function addressFieldValue(key: string): string {
  if (typeof props.modelValue !== 'object' || props.modelValue === null || Array.isArray(props.modelValue)) {
    return ''
  }

  const candidate = (props.modelValue as Record<string, unknown>)[key]
  return typeof candidate === 'string' ? candidate : ''
}

function updateAddressFieldValue(key: string, value: string): void {
  const currentValue = typeof props.modelValue === 'object' && props.modelValue !== null && !Array.isArray(props.modelValue)
    ? { ...(props.modelValue as Record<string, unknown>) }
    : {}

  currentValue[key] = value
  emit('update:modelValue', currentValue)
}

function isTemporalDateInput(): boolean {
  return props.field.type === 'temporal'
    ? temporalMode.value === 'date'
    : props.field.type === 'date'
}

function isTemporalTimeInput(): boolean {
  return props.field.type === 'temporal'
    ? temporalMode.value === 'time'
    : props.field.type === 'time'
}

function labelHtml(): string {
  if (typeof props.field.label !== 'string' || props.field.label.trim() === '') {
    return ''
  }

  return sanitizeFormForgeInlineRichText(props.field.label)
}
</script>

<template>
  <div @focusout="emit('blur')">
    <UFormField
      :name="field.name"
      :label="field.label"
      :required="field.type === 'address' ? false : required"
      :ui="fieldUi"
    >
      <template #label>
        <span v-html="labelHtml()" />
      </template>

      <UInput
        v-if="field.type === 'text' || field.type === 'email'"
        :model-value="modelValue"
        v-bind="componentProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <UTextarea
        v-else-if="field.type === 'textarea'"
        :model-value="modelValue"
        v-bind="componentProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <UInputNumber
        v-else-if="field.type === 'number'"
        :model-value="modelValue"
        v-bind="componentProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <USelect
        v-else-if="field.type === 'select' && choiceDisplayValue() === 'menu'"
        :model-value="modelValue"
        v-bind="componentProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <URadioGroup
        v-else-if="field.type === 'select' && choiceDisplayValue() === 'list'"
        :model-value="modelValue"
        v-bind="componentProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <USelectMenu
        v-else-if="field.type === 'select_menu'"
        :model-value="modelValue"
        v-bind="componentProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <URadioGroup
        v-else-if="field.type === 'radio' && choiceDisplayValue() === 'list'"
        :model-value="modelValue"
        v-bind="componentProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <USelect
        v-else-if="field.type === 'radio' && choiceDisplayValue() === 'menu'"
        :model-value="modelValue"
        v-bind="componentProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <UCheckbox
        v-else-if="field.type === 'checkbox' || field.type === 'consent'"
        :model-value="modelValue"
        v-bind="componentProps"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <UCheckboxGroup
        v-else-if="field.type === 'checkbox_group' && choiceDisplayValue() === 'list'"
        :model-value="modelValue"
        v-bind="componentProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <USelectMenu
        v-else-if="field.type === 'checkbox_group' && choiceDisplayValue() === 'menu'"
        :model-value="modelValue"
        v-bind="componentProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <div
        v-else-if="field.type === 'address'"
        class="grid gap-4 w-full"
      >
        <div class="grid gap-3">
          <UFormField
            v-for="addressField in addressFields"
            v-show="addressField.visible"
            :key="addressField.key"
            :label="addressField.label"
            :required="addressField.required"
          >
            <UInput
              :model-value="addressFieldValue(addressField.key)"
              :disabled="disabled"
              :placeholder="addressField.label"
              :ui="fullWidthUi(componentProps.ui)"
              @update:model-value="(nextValue: FormForgeDynamicValue) => updateAddressFieldValue(addressField.key, typeof nextValue === 'string' ? nextValue : '')"
            />
          </UFormField>
        </div>
      </div>

      <USwitch
        v-else-if="field.type === 'switch'"
        :model-value="modelValue"
        v-bind="componentProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <UInputDate
        v-else-if="isTemporalDateInput()"
        :model-value="modelValue"
        v-bind="temporalInputProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <UInputTime
        v-else-if="isTemporalTimeInput()"
        :model-value="modelValue"
        :hour-cycle="temporalHourCycle"
        v-bind="temporalInputProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <UFileUpload
        v-else
        :model-value="modelValue"
        v-bind="componentProps"
        :ui="fullWidthUi(componentProps.ui)"
        @update:model-value="(nextValue: FormForgeDynamicValue) => emit('update:modelValue', nextValue)"
      />

      <div
        v-if="typeof field.help_text === 'string' && field.help_text.trim() !== ''"
        class="formforge-rich-text mt-2 text-sm text-muted"
        v-html="sanitizeFormForgeRichText(field.help_text)"
      />
    </UFormField>
  </div>
</template>
