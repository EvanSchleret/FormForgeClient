<script setup lang="ts">
import { computed } from '#imports'
import { useFormForgeI18n } from '../../../composables/useFormForgeI18n'

interface Props {
  modelValue?: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | undefined): void
}>()

const { t } = useFormForgeI18n()

const hasDescription = computed(() => typeof props.modelValue === 'string')

const description = computed<string | undefined>({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  }
})

function enableDescription(): void {
  emit('update:modelValue', '')
}

function disableDescription(): void {
  emit('update:modelValue', undefined)
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
  <div class="grid gap-3">
    <template v-if="hasDescription">
      <UFormField :label="t('builder.categoryModal.descriptionLabel')">
        <template #hint>
          <div class="flex justify-end">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              :disabled="readonly"
              @click.stop="disableDescription"
            >
              {{ t('builder.removeDescription') }}
            </UButton>
          </div>
        </template>

        <div class="rounded-lg bg-white p-2 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-white/10">
          <UEditor
            v-slot="{ editor }"
            v-model="description"
            content-type="html"
            :placeholder="t('builder.descriptionPlaceholder')"
            :disabled="readonly"
            class="rounded-xl"
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
    </template>

    <UButton
      v-else
      color="neutral"
      variant="soft"
      icon="i-lucide-plus"
      :disabled="readonly"
      :ui="{
        base: 'w-fit'
      }"
      @click.stop="enableDescription"
    >
      {{ t('builder.descriptionButton') }}
    </UButton>
  </div>
</template>
