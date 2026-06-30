<script setup lang="ts">
import { toRef } from '#imports'
import { useFormForgeI18n } from '../../../composables/useFormForgeI18n'
import type { FormForgeFieldOption, FormForgeFieldSchema } from '../../../types'

interface Props {
  field: FormForgeFieldSchema
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const field = toRef(props, 'field')
const { t } = useFormForgeI18n()

function minimumChoiceOptionCount(): number {
  return field.value.type === 'checkbox_group' ? 2 : 1
}

function choiceOptions(): FormForgeFieldOption[] {
  return Array.isArray(field.value.options) ? field.value.options : []
}

function optionLabel(option: FormForgeFieldOption | undefined): string {
  if (option === undefined || option === null) {
    return ''
  }

  if (typeof option === 'object' && option !== null && 'label' in option) {
    return typeof option.label === 'string' ? option.label : ''
  }

  return String(option)
}

function setOptionLabel(optionIndex: number, value: string): void {
  const options = [...choiceOptions()]
  const option = options[optionIndex]

  if (option === undefined || option === null) {
    return
  }

  if (typeof option === 'object' && option !== null && 'value' in option) {
    options[optionIndex] = {
      ...option,
      label: value
    }
  } else {
    options[optionIndex] = {
      label: value,
      value: option
    }
  }

  field.value.options = options
}

function addChoiceOption(): void {
  const options = [...choiceOptions()]

  options.push({
    label: '',
    value: `option_${options.length + 1}`
  })

  field.value.options = options
}

function removeChoiceOption(optionIndex: number): void {
  const options = [...choiceOptions()]

  if (options.length <= minimumChoiceOptionCount()) {
    return
  }

  options.splice(optionIndex, 1)
  field.value.options = options
}

function addSpecialChoiceOption(type: 'other' | 'none'): void {
  const options = [...choiceOptions()]

  const value = type === 'other' ? 'other' : 'none_of_the_above'

  if (options.some((option) => typeof option === 'object' && option !== null && 'value' in option && option.value === value)) {
    return
  }

  options.push({
    label: type === 'other' ? t('builder.optionOther') : t('builder.optionNone'),
    value
  })
  field.value.options = options
}

function specialChoiceOptions(): Array<{ type: 'other' | 'none', option: FormForgeFieldOption }> {
  const options = choiceOptions()
  const otherOption = options.find((option) => {
    if (typeof option === 'object' && option !== null && 'value' in option) {
      return option.value === specialChoiceValue('other')
    }

    return option === specialChoiceValue('other')
  })
  const noneOption = options.find((option) => {
    if (typeof option === 'object' && option !== null && 'value' in option) {
      return option.value === specialChoiceValue('none')
    }

    return option === specialChoiceValue('none')
  })

  return [
    ...(otherOption === undefined ? [] : [{ type: 'other' as const, option: otherOption }]),
    ...(noneOption === undefined ? [] : [{ type: 'none' as const, option: noneOption }])
  ]
}

function specialChoiceValue(type: 'other' | 'none'): string {
  return type === 'other' ? 'other' : 'none_of_the_above'
}

function hasSpecialChoiceOption(type: 'other' | 'none'): boolean {
  return specialChoiceOptions().some((option) => option.type === type)
}

function removeSpecialChoiceOption(type: 'other' | 'none'): void {
  const value = type === 'other' ? 'other' : 'none_of_the_above'
  const options = choiceOptions().filter((option) => {
    if (typeof option === 'object' && option !== null && 'value' in option) {
      return option.value !== value
    }

    return option !== value
  })

  if (options.length === choiceOptions().length) {
    return
  }

  field.value.options = options
}

function userChoiceOptions(): FormForgeFieldOption[] {
  return choiceOptions().filter((option) => !specialChoiceOptions().some((candidate) => candidate.option === option))
}
</script>

<template>
  <UFormField :label="t('builder.optionsLabel')">
    <div class="grid gap-3">
      <div
        v-for="(option, optionIndex) in userChoiceOptions()"
        :key="optionIndex"
        class="flex flex-row items-center gap-2"
      >
        <UInput
          :model-value="optionLabel(option)"
          :disabled="readonly"
          :placeholder="t('builder.optionPlaceholder', { index: optionIndex + 1 })"
          :ui="{
            root: 'w-full'
          }"
          @update:model-value="(value: string) => setOptionLabel(optionIndex, value)"
        />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          :disabled="readonly || (field.options?.length ?? 0) <= minimumChoiceOptionCount()"
          @click.stop="removeChoiceOption(optionIndex)"
        />
      </div>
      <div
        v-for="specialOption in specialChoiceOptions()"
        :key="specialOption.type"
        class="flex flex-row items-center gap-2"
      >
        <UInput
          :model-value="optionLabel(specialOption.option)"
          disabled
          :placeholder="specialOption.type === 'other' ? t('builder.optionOther') : t('builder.optionNone')"
          :ui="{
            root: 'w-full'
          }"
        />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          :disabled="readonly"
          @click.stop="removeSpecialChoiceOption(specialOption.type)"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          :disabled="readonly"
          @click.stop="addChoiceOption"
        >
          {{ t('builder.addOption') }}
        </UButton>
        <UButton
          v-if="!hasSpecialChoiceOption('other')"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          :disabled="readonly"
          @click.stop="addSpecialChoiceOption('other')"
        >
          {{ t('builder.addOtherOption') }}
        </UButton>
        <UButton
          v-if="!hasSpecialChoiceOption('none')"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          :disabled="readonly"
          @click.stop="addSpecialChoiceOption('none')"
        >
          {{ t('builder.addNoneOption') }}
        </UButton>
      </div>
    </div>
  </UFormField>
</template>
