<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useFormForgeI18n } from '../../../composables/useFormForgeI18n'
import type { FormForgeFieldSchema, FormForgeFieldType, FormForgePageSchema } from '../../../types'
import { resolveTemporalMode } from '../../../utils/temporal'
import { sanitizeFormForgeInlineRichText } from '../../../utils/rich-text'
import FormForgeBuilderAddressFieldsCard from './FormForgeBuilderAddressFieldsCard.vue'
import FormForgeBuilderChoiceDisplayField from './FormForgeBuilderChoiceDisplayField.vue'
import FormForgeBuilderChoiceOptionsField from './FormForgeBuilderChoiceOptionsField.vue'
import FormForgeBuilderDescriptionField from './FormForgeBuilderDescriptionField.vue'
import FormForgeBuilderTemporalModeField from './FormForgeBuilderTemporalModeField.vue'
import FormForgeBuilderValidationRulesSection from './FormForgeBuilderValidationRulesSection.vue'

interface QuestionTypeItem {
  label: string
  value: FormForgeFieldType
  icon?: string
}

interface FutureBlockItem {
  label: string
  value: string
}

interface Props {
  page: FormForgePageSchema
  field: FormForgeFieldSchema
  index: number
  readonly?: boolean
  selected?: boolean
  fieldTypeItems: QuestionTypeItem[]
  futureBlockItems: FutureBlockItem[]
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  selected: false
})

const page = props.page
const field = props.field
const fieldTypeItems = props.fieldTypeItems
const futureBlockItems = props.futureBlockItems

const emit = defineEmits<{
  (event: 'select'): void
  (event: 'move-up'): void
  (event: 'move-down'): void
  (event: 'duplicate'): void
  (event: 'remove'): void
  (event: 'change-type', value: FormForgeFieldType): void
  (event: 'add-below', value: FormForgeFieldType): void
  (event: 'move-to-block', value: string): void
}>()

const { t } = useFormForgeI18n()

function fieldTypeIcon(type: FormForgeFieldType): string {
  return fieldTypeItems.find((item) => item.value === type)?.icon ?? 'i-lucide-circle-help'
}

function isTextFieldType(type: FormForgeFieldType): boolean {
  return type === 'text' || type === 'textarea' || type === 'email' || type === 'number'
}

function isChoiceFieldType(type: FormForgeFieldType): boolean {
  return type === 'select' || type === 'select_menu' || type === 'radio' || type === 'checkbox_group'
}

function fieldMenuItems(): DropdownMenuItem[] {
  const changeTypeChildren: DropdownMenuItem[] = fieldTypeItems.map((item) => ({
    label: item.label,
    icon: item.icon,
    onSelect: () => emit('change-type', item.value)
  }))

  const addBelowChildren: DropdownMenuItem[] = fieldTypeItems.map((item) => ({
    label: item.label,
    icon: item.icon,
    onSelect: () => emit('add-below', item.value)
  }))

  const moveToBlockChildren: DropdownMenuItem[] = futureBlockItems.map((item) => ({
    label: item.label,
    onSelect: () => emit('move-to-block', item.value)
  }))

  return [
    {
      label: t('builder.questionMenu.changeType'),
      icon: 'i-lucide-arrow-right',
      children: changeTypeChildren
    },
    {
      label: t('builder.questionMenu.addBelow'),
      icon: 'i-lucide-plus',
      children: addBelowChildren
    },
    {
      label: t('builder.questionMenu.moveToBlock'),
      icon: 'i-lucide-arrow-right-left',
      children: moveToBlockChildren.length > 0
        ? moveToBlockChildren
        : [{ label: t('builder.questionMenu.noBlockAfter'), disabled: true }]
    },
    {
      type: 'separator'
    },
    {
      label: t('builder.questionMenu.moveUp'),
      icon: 'i-lucide-arrow-up',
      disabled: props.index <= 0,
      onSelect: () => emit('move-up')
    },
    {
      label: t('builder.questionMenu.moveDown'),
      icon: 'i-lucide-arrow-down',
      disabled: props.index >= props.page.fields.length - 1,
      onSelect: () => emit('move-down')
    },
    {
      type: 'separator'
    },
    {
      label: t('builder.questionMenu.duplicate'),
      icon: 'i-lucide-copy',
      onSelect: () => emit('duplicate')
    },
    {
      label: t('builder.questionMenu.delete'),
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => emit('remove')
    }
  ]
}

function questionLabelHtml(): string {
  if (typeof field.label !== 'string' || field.label.trim() === '') {
    return ''
  }

  return sanitizeFormForgeInlineRichText(field.label)
}

function isAddressFieldRequired(): boolean {
  if (field.type !== 'address' || !Array.isArray(field.address_fields)) {
    return false
  }

  return field.address_fields.some((addressField) => {
    return addressField.visible && addressField.required
  })
}

function questionRequiredLabel(): string {
  if (field.type === 'address') {
    return isAddressFieldRequired() ? t('builder.required') : t('builder.optional')
  }

  return field.required ? t('builder.required') : t('builder.optional')
}

function blockEnterKeydown(_editor: unknown, event: KeyboardEvent): boolean {
  if (event.key === 'Enter') {
    event.preventDefault()
    return true
  }

  return false
}
</script>

<template>
  <div class="grid">
    <div
      class="flex items-start justify-between gap-4 px-5 py-4"
      :class="selected ? 'bg-white dark:bg-default/50' : 'hover:bg-default'"
      @click="emit('select')"
    >
      <div class="min-w-0 flex-1">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon
            :name="fieldTypeIcon(field.type)"
            class="size-4 shrink-0 text-muted"
          />
          <div class="min-w-0">
            <p class="text-xs text-muted">
              {{ t('builder.questionLabel') }} {{ index + 1 }}
            </p>
            <p class="truncate text-sm font-bold">
              <span
                v-if="questionLabelHtml() !== ''"
                v-html="questionLabelHtml()"
              />
              <span v-else>
                {{ field.placeholder || field.type }}
              </span>
            </p>
            <p class="text-xs text-muted">
              {{ questionRequiredLabel() }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-up"
          :disabled="readonly || index === 0"
          @click.stop="emit('move-up')"
        />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-down"
          :disabled="readonly || index === page.fields.length - 1"
          @click.stop="emit('move-down')"
        />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-copy"
          :disabled="readonly"
          @click.stop="emit('duplicate')"
        />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-trash-2"
          :disabled="readonly || page.fields.length <= 1"
          @click.stop="emit('remove')"
        />
        <UDropdownMenu
          :items="fieldMenuItems()"
          :content="{ align: 'end', sideOffset: 8 }"
        >
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-ellipsis"
            :disabled="readonly"
            @click.stop
          />
        </UDropdownMenu>
      </div>
    </div>

    <div
      v-if="selected"
      class="grid gap-4 px-5 py-4"
    >
      <UFormField
        :label="t('builder.questionPlaceholder')"
      >
        <template #hint>
          <div
            v-if="field.type !== 'address'"
            class="flex items-center gap-2 mb-1"
          >
            <USwitch
              v-model="field.required"
              :label="t('builder.required')"
              :disabled="readonly"
            />
          </div>
        </template>

        <div class="rounded-lg bg-white dark:bg-gray-800 p-2 shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10">
          <UEditor
            v-slot="{ editor }"
            v-model="field.label"
            content-type="html"
            :placeholder="t('builder.questionPlaceholder')"
            :disabled="readonly"
            :editor-props="{
              handleKeyDown: blockEnterKeydown
            }"
          >
            <UEditorToolbar
              v-if="!readonly"
              :editor="editor"
              :items="[
                { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold' },
                { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic' },
                { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline' },
                { kind: 'link', icon: 'i-lucide-link' }
              ]"
            />
          </UEditor>
        </div>
      </UFormField>

      <FormForgeBuilderDescriptionField
        v-model="field.help_text"
        :readonly="readonly"
      />

      <FormForgeBuilderTemporalModeField
        v-if="field.type === 'temporal'"
        :field="field"
        :readonly="readonly"
      />

      <FormForgeBuilderValidationRulesSection
        v-if="field.type === 'text' || field.type === 'textarea'"
        :field="field"
        :readonly="readonly"
        mode="text"
      />

      <FormForgeBuilderAddressFieldsCard
        v-if="field.type === 'address'"
        :field="field"
        :readonly="readonly"
      />

      <FormForgeBuilderValidationRulesSection
        v-if="field.type === 'address'"
        :field="field"
        :readonly="readonly"
        mode="address"
      />

      <FormForgeBuilderValidationRulesSection
        v-if="field.type === 'temporal' || field.type === 'date' || field.type === 'time'"
        :field="field"
        :readonly="readonly"
        mode="temporal"
        :temporal-mode="resolveTemporalMode(field)"
      />

      <FormForgeBuilderChoiceDisplayField
        v-if="field.type !== 'select_menu' && (field.type === 'select' || field.type === 'radio' || field.type === 'checkbox_group')"
        :field="field"
        :readonly="readonly"
      />

      <UFormField
        v-if="field.type === 'consent'"
        :label="t('builder.consentLabel')"
      >
        <UInput
          v-model="field.consent_label"
          :disabled="readonly"
          :placeholder="t('builder.consentLabel')"
          :ui="{
            root: 'w-full'
          }"
        />
      </UFormField>

      <UFormField
        v-if="isTextFieldType(field.type) || isChoiceFieldType(field.type) || field.type === 'email' || field.type === 'number'"
        :label="t('builder.placeholderPlaceholder')"
      >
        <UInput
          v-model="field.placeholder"
          :disabled="readonly"
          :placeholder="t('builder.placeholderPlaceholder')"
          :ui="{
            root: 'w-full'
          }"
        />
      </UFormField>

      <FormForgeBuilderChoiceOptionsField
        v-if="isChoiceFieldType(field.type)"
        :field="field"
        :readonly="readonly"
      />
    </div>
  </div>
</template>
