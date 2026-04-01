<script setup lang="ts">
import { computed, ref } from '#imports'
import { useFormForgeCategory } from '../../composables/useFormForgeCategory'
import { useFormForgeI18n } from '../../composables/useFormForgeI18n'
import type { FormForgeCategory } from '../../types'

interface Props {
  locale?: string
  endpoint?: string
}

const props = withDefaults(defineProps<Props>(), {
  locale: undefined,
  endpoint: undefined
})

const emit = defineEmits<{
  (event: 'close', value: FormForgeCategory | null): void
}>()

const { t } = useFormForgeI18n({
  locale: () => props.locale
})
const categoryManager = useFormForgeCategory({
  immediate: false,
  endpoint: props.endpoint
})

const name = ref<string>('')
const description = ref<string>('')
const isActive = ref<boolean>(true)

const nameError = computed<string | undefined>(() => {
  return name.value.trim() === '' ? t('builder.categoryModal.nameRequired') : undefined
})

function close(): void {
  emit('close', null)
}

function firstFieldError(errors: Record<string, string[]>): string | null {
  for (const messages of Object.values(errors)) {
    if (messages.length > 0) {
      return messages[0] ?? null
    }
  }

  return null
}

const submitError = computed<string | null>(() => {
  return firstFieldError(categoryManager.fieldErrors.value) ?? categoryManager.error.value
})

const isSubmitting = computed<boolean>(() => categoryManager.loading.value)

async function submit(): Promise<void> {
  const trimmedName = name.value.trim()

  if (trimmedName === '') {
    return
  }

  const trimmedDescription = description.value.trim()
  const payload = {
    name: trimmedName,
    description: trimmedDescription === '' ? null : trimmedDescription,
    is_active: isActive.value
  }

  try {
    const created = await categoryManager.createCategory(payload)
    emit('close', created)
  } catch {
    return
  }
}
</script>

<template>
  <UModal
    :title="t('builder.categoryModal.title')"
    :description="t('builder.categoryModal.description')"
    :dismissible="true"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="submitError !== null"
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :title="submitError"
        />

        <UFormField
          :label="t('builder.categoryModal.nameLabel')"
          :error="nameError"
          required
        >
          <UInput
            v-model="name"
            icon="i-lucide-tag"
            :placeholder="t('builder.categoryModal.namePlaceholder')"
            @keydown.enter.prevent="submit"
          />
        </UFormField>

        <UFormField :label="t('builder.categoryModal.descriptionLabel')">
          <UTextarea
            v-model="description"
            :rows="3"
            :placeholder="t('builder.categoryModal.descriptionPlaceholder')"
          />
        </UFormField>

        <div class="flex items-center justify-between rounded-lg border border-default px-3 py-2">
          <div class="flex items-center gap-2 text-sm text-toned">
            <UIcon
              name="i-lucide-circle-check-big"
              class="size-4"
            />
            <span>{{ t('builder.categoryModal.activeLabel') }}</span>
          </div>
          <USwitch v-model="isActive" />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="close"
        >
          {{ t('builder.categoryModal.cancel') }}
        </UButton>
        <UButton
          color="primary"
          icon="i-lucide-folder-plus"
          :loading="isSubmitting"
          :disabled="nameError !== undefined || isSubmitting"
          @click="submit"
        >
          {{ t('builder.categoryModal.create') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
