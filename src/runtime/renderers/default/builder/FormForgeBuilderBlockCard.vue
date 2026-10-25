<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useOverlay } from '@nuxt/ui/composables/useOverlay'
import { useFormForgeI18n } from '../../../composables/useFormForgeI18n'
import type {
  FormForgeFieldSchema,
  FormForgeFieldType,
  FormForgePageSchema
} from '../../../types'
import FormForgeBuilderBlockSettingsModal from '../FormForgeBuilderBlockSettingsModal.vue'
import FormForgeBuilderQuestionRow from './FormForgeBuilderQuestionRow.vue'
import { ref } from '#imports'

interface QuestionTypeItem {
  label: string
  value: FormForgeFieldType
  icon?: string
}

interface Props {
  page: FormForgePageSchema
  pages: FormForgePageSchema[]
  pageIndex: number
  totalPages: number
  selectedFieldKey?: string | null
  readonly?: boolean
  fieldTypeItems: QuestionTypeItem[]
}

const props = withDefaults(defineProps<Props>(), {
  selectedFieldKey: null,
  readonly: false
})

const emit = defineEmits<{
  (event: 'select-field', pageKey: string, fieldKey: string): void
  (event: 'move-page', pageKey: string, direction: -1 | 1): void
  (event: 'duplicate-page', pageKey: string): void
  (event: 'remove-page', pageKey: string): void
  (event: 'add-question', pageKey: string, type: FormForgeFieldType): void
  (event: 'move-field', pageKey: string, fieldKey: string, direction: -1 | 1): void
  (event: 'duplicate-field', pageKey: string, fieldKey: string): void
  (event: 'remove-field', pageKey: string, fieldKey: string): void
  (event: 'change-field-type', pageKey: string, fieldKey: string, type: FormForgeFieldType): void
  (event: 'add-field-below', pageKey: string, fieldKey: string, type: FormForgeFieldType): void
  (event: 'move-field-to-block', pageKey: string, fieldKey: string, targetPageKey: string): void
}>()

const { t } = useFormForgeI18n()
const fieldTypeItems = props.fieldTypeItems
const overlay = useOverlay()
const isCollapsed = ref<boolean>(false)

function futureBlockItems(): Array<{ label: string, value: string }> {
  return props.pages
    .filter((page) => page.page_key !== props.page.page_key)
    .map((page) => ({
      label: t('builder.blockCounter', {
        current: props.pages.findIndex((candidate) => candidate.page_key === page.page_key) + 1,
        total: props.totalPages
      }),
      value: page.page_key
    }))
}

function isQuestionSelected(fieldKey: string): boolean {
  return props.selectedFieldKey === fieldKey
}

function addQuestion(type: FormForgeFieldType): void {
  emit('add-question', props.page.page_key, type)
}

function questionPickerItems(): DropdownMenuItem[] {
  return fieldTypeItems.map((item) => ({
    label: item.label,
    icon: item.icon,
    onSelect: () => addQuestion(item.value)
  }))
}

function onMoveField(field: FormForgeFieldSchema, direction: -1 | 1): void {
  emit('move-field', props.page.page_key, field.field_key, direction)
}

function onMoveFieldToBlock(field: FormForgeFieldSchema, targetPageKey: string): void {
  emit('move-field-to-block', props.page.page_key, field.field_key, targetPageKey)
}

function openBlockSettings(): void {
  const modal = overlay.create(FormForgeBuilderBlockSettingsModal, {
    destroyOnClose: true
  })

  void modal.open({
    page: props.page,
    pages: props.pages,
    pageIndex: props.pageIndex,
    readonly: props.readonly
  })
}

function toggleCollapsed(): void {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <UCard
    variant="soft"
    :ui="{
      body: 'ff:formforge:p-0 ff:formforge:sm:p-0'
    }"
  >
    <div class="ff:formforge:flex ff:formforge:flex-row">
      <UBadge
        class="formforge-page-drag-handle ff:formforge:cursor-grab ff:formforge:select-none"
        :ui="{
          base: 'ff:formforge:rounded-none ff:formforge:w-8 ff:formforge:flex ff:formforge:items-center ff:formforge:justify-center'
        }"
      >
        {{ pageIndex + 1 }}
      </UBadge>

      <div class="ff:formforge:min-w-0 ff:formforge:w-full">
        <div class="ff:formforge:px-5 ff:formforge:py-4">
          <div class="ff:formforge:flex ff:formforge:items-start ff:formforge:justify-between ff:formforge:gap-4">
            <div class="ff:formforge:min-w-0">
              <p class="ff:formforge:text-sm ff:formforge:weight-600">
                {{ t('builder.blockLabel') }} {{ pageIndex + 1 }}
              </p>
              <p class="ff:formforge:text-sm ff:formforge:text-muted">
                {{ t('builder.questionCount', { count: page.fields.length }) }}
              </p>
            </div>
            <div class="ff:formforge:flex ff:formforge:items-center ff:formforge:gap-1">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-arrow-up"
                :disabled="readonly || pageIndex === 0"
                @click="$emit('move-page', page.page_key, -1)"
              />
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-arrow-down"
                :disabled="readonly || pageIndex === totalPages - 1"
                @click="$emit('move-page', page.page_key, 1)"
              />
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-copy"
                :disabled="readonly"
                @click="$emit('duplicate-page', page.page_key)"
              />
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                :disabled="readonly || totalPages <= 1"
                @click="$emit('remove-page', page.page_key)"
              />
              <UTooltip :text="isCollapsed ? t('builder.block.expand') : t('builder.block.collapse')">
                <UButton
                  color="neutral"
                  variant="ghost"
                  :icon="isCollapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
                  :disabled="readonly"
                  @click="toggleCollapsed"
                />
              </UTooltip>
              <UTooltip :text="t('builder.block.showSettings')">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-settings"
                  :disabled="readonly"
                  @click="openBlockSettings"
                />
              </UTooltip>
            </div>
          </div>
        </div>

        <template v-if="!isCollapsed">
          <USeparator
            type="dashed"
            orientation="horizontal"
          />

          <div>
            <template
              v-for="(field, index) in page.fields"
              :key="field.field_key"
            >
              <FormForgeBuilderQuestionRow
                :page="page"
                :field="field"
                :index="index"
                :selected="isQuestionSelected(field.field_key)"
                :readonly="readonly"
                :field-type-items="fieldTypeItems"
                :future-block-items="futureBlockItems()"
                @select="$emit('select-field', page.page_key, field.field_key)"
                @move-up="onMoveField(field, -1)"
                @move-down="onMoveField(field, 1)"
                @duplicate="$emit('duplicate-field', page.page_key, field.field_key)"
                @remove="$emit('remove-field', page.page_key, field.field_key)"
                @change-type="(type: FormForgeFieldType) => $emit('change-field-type', page.page_key, field.field_key, type)"
                @add-below="(type: FormForgeFieldType) => $emit('add-field-below', page.page_key, field.field_key, type)"
                @move-to-block="(targetPageKey: string) => onMoveFieldToBlock(field, targetPageKey)"
              />

              <USeparator
                v-if="index < page.fields.length - 1"
                type="dashed"
                orientation="horizontal"
              />
            </template>
          </div>

          <USeparator
            type="dashed"
            orientation="horizontal"
          />

          <div class="ff:formforge:px-5 ff:formforge:py-4">
            <UDropdownMenu
              :items="questionPickerItems()"
              :content="{ align: 'start', sideOffset: 8 }"
              :ui="{ content: 'formforge ff:formforge:w-(--reka-dropdown-menu-trigger-width)' }"
            >
              <UButton
                color="neutral"
                variant="soft"
                icon="i-lucide-plus"
                :disabled="readonly"
              >
                {{ t('builder.block.addQuestion') }}
              </UButton>
            </UDropdownMenu>
          </div>
        </template>
      </div>
    </div>
  </UCard>
</template>
