<script setup lang="ts">
import { computed, ref, useRoute, watch } from '#imports'
import { useFormForgeGetForm } from '../../composables/useFormForgeGetForm'
import { useFormForgeI18n } from '../../composables/useFormForgeI18n'
import { useFormForgeResponses } from '../../composables/useFormForgeResponses'
import type { FormForgeClientConfig, FormForgeJsonObject } from '../../types'
import {
  createFormForgeResponsePages,
  getFormForgeResponsePayload,
  type FormForgeResponseFileItem,
  type FormForgeResponsePage
} from '../../utils/response-answer'

type FormForgeResponseLayout = 'line' | 'column'

interface Props {
  responseUuid: string
  formKey?: string
  endpoint?: string
  layout?: FormForgeResponseLayout
  clientConfig?: FormForgeClientConfig
}

const props = withDefaults(defineProps<Props>(), {
  formKey: undefined,
  endpoint: undefined,
  layout: 'line',
  clientConfig: undefined
})

const route = useRoute()
const { locale, t } = useFormForgeI18n({
  locale: () => props.clientConfig?.locale
})

const responseResource = ref<FormForgeJsonObject | null>(null)
const localError = ref<string | null>(null)
const formLoadError = ref<string | null>(null)
const previewImage = ref<FormForgeResponseFileItem | null>(null)

const resolvedFormKey = computed<string>(() => {
  if (typeof props.formKey === 'string' && props.formKey.trim() !== '') {
    return props.formKey.trim()
  }

  const routeForm = route.params.form
  if (typeof routeForm === 'string' && routeForm.trim() !== '') {
    return routeForm.trim()
  }

  if (Array.isArray(routeForm) && typeof routeForm[0] === 'string' && routeForm[0].trim() !== '') {
    return routeForm[0].trim()
  }

  return ''
})

const resolvedResponseUuid = computed<string>(() => {
  return typeof props.responseUuid === 'string' ? props.responseUuid.trim() : ''
})

const responses = useFormForgeResponses({
  key: resolvedFormKey.value === '' ? '__missing_form_key__' : resolvedFormKey.value,
  immediate: false,
  endpoint: props.endpoint,
  querySync: {
    enabled: false
  },
  clientConfig: props.clientConfig
})

const formSchema = useFormForgeGetForm({
  endpoint: props.endpoint,
  clientConfig: props.clientConfig
})

const loading = computed<boolean>(() => responses.loading.value || formSchema.loading.value)
const isLineLayout = computed<boolean>(() => props.layout === 'line')
const isPreviewOpen = computed<boolean>(() => previewImage.value !== null)

const error = computed<string | null>(() => {
  return localError.value ?? responses.error.value
})

const payload = computed<Record<string, unknown>>(() => {
  return getFormForgeResponsePayload(responseResource.value)
})

const responsePages = computed<FormForgeResponsePage[]>(() => createFormForgeResponsePages(
  formSchema.form.value,
  payload.value,
  t,
  locale.value
))

function openImagePreview(file: FormForgeResponseFileItem): void {
  if (file.url === null) {
    return
  }

  previewImage.value = file
}

function closeImagePreview(): void {
  previewImage.value = null
}

async function downloadFile(file: FormForgeResponseFileItem): Promise<void> {
  if (file.url === null || import.meta.server) {
    return
  }

  try {
    const response = await fetch(file.url, {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`)
    }

    const blob = await response.blob()
    const objectUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = file.name
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(objectUrl)
  } catch {
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.name
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

async function loadResponseView(): Promise<void> {
  localError.value = null
  formLoadError.value = null
  responseResource.value = null
  previewImage.value = null
  formSchema.clear()

  if (resolvedResponseUuid.value === '') {
    localError.value = t('response.error.missingResponseUuid')
    return
  }

  if (resolvedFormKey.value === '') {
    localError.value = t('response.error.missingFormKey')
    return
  }

  try {
    responseResource.value = await responses.getResponse(resolvedResponseUuid.value)
  } catch (caughtError) {
    localError.value = caughtError instanceof Error ? caughtError.message : t('response.error.load')
    return
  }

  try {
    await formSchema.getForm({
      key: resolvedFormKey.value
    })
  } catch (caughtError) {
    formLoadError.value = caughtError instanceof Error ? caughtError.message : t('response.error.loadForm')
  }
}

watch(
  () => [resolvedFormKey.value, resolvedResponseUuid.value] as const,
  () => {
    loadResponseView().catch(() => {})
  },
  {
    immediate: true
  }
)
</script>

<template>
  <div class="formforge ff:formforge:w-full">
    <p
      v-if="loading"
      class="ff:formforge:text-sm ff:formforge:text-default"
    >
      {{ t('response.loading') }}
    </p>

    <p
      v-else-if="error !== null"
      class="ff:formforge:text-sm ff:formforge:text-error"
    >
      {{ error }}
    </p>

    <p
      v-else-if="responsePages.length === 0"
      class="ff:formforge:text-sm ff:formforge:text-default"
    >
      {{ t('response.empty') }}
    </p>

    <div
      v-else
      class="ff:formforge:stack-12"
    >
      <p
        v-if="formLoadError !== null"
        class="ff:formforge:text-sm ff:formforge:text-warning"
      >
        {{ formLoadError }}
      </p>

      <section
        v-for="(page, pageIndex) in responsePages"
        :key="page.id"
        class="ff:formforge:stack-4"
      >
        <div class="ff:formforge:stack-1">
          <h3 class="ff:formforge:text-base ff:formforge:weight-600 ff:formforge:text-default">
            {{ page.title || t('response.page.fallback', { index: pageIndex + 1 }) }}
          </h3>
          <p
            v-if="typeof page.description === 'string' && page.description.trim() !== ''"
            class="ff:formforge:text-sm ff:formforge:text-default"
          >
            {{ page.description }}
          </p>
        </div>

        <div class="ff:formforge:stack-5">
          <article
            v-for="item in page.items"
            :key="item.id"
            class="ff:formforge:stack-2"
          >
            <div
              v-if="isLineLayout"
              class="ff:formforge:grid ff:formforge:grid-cols-1 ff:formforge:gap-2 ff:formforge:md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] ff:formforge:md:gap-6"
            >
              <p class="ff:formforge:whitespace-pre-wrap ff:formforge:text-sm ff:formforge:weight-500 ff:formforge:text-default">
                <span v-html="item.question" />
              </p>

              <div
                v-if="item.answer.kind === 'text'"
                class="ff:formforge:whitespace-pre-wrap ff:formforge:text-sm ff:formforge:text-default"
              >
                {{ item.answer.value }}
              </div>

              <div
                v-else
                class="ff:formforge:stack-2"
              >
                <div
                  v-for="file in item.answer.value"
                  :key="file.id"
                  class="ff:formforge:flex ff:formforge:items-center ff:formforge:gap-3"
                >
                  <button
                    v-if="file.isImage && file.url !== null"
                    type="button"
                    class="ff:formforge:inline-flex ff:formforge:h-12 ff:formforge:w-12 ff:formforge:items-center ff:formforge:justify-center ff:formforge:overflow-hidden ff:formforge:rounded ff:formforge:border-thin ff:formforge:border-default ff:formforge:bg-elevated"
                    @click="openImagePreview(file)"
                  >
                    <img
                      :src="file.url"
                      :alt="file.name"
                      class="ff:formforge:h-full ff:formforge:w-full ff:formforge:object-cover"
                    >
                  </button>

                  <UIcon
                    v-else
                    name="i-lucide-file"
                    class="ff:formforge:h-5 ff:formforge:w-5 ff:formforge:shrink-0 ff:formforge:text-default"
                  />

                  <div class="ff:formforge:min-w-0 ff:formforge:flex-1">
                    <p class="ff:formforge:truncate ff:formforge:text-sm ff:formforge:text-default">
                      {{ file.name }}
                    </p>
                    <p
                      v-if="file.mimeType"
                      class="ff:formforge:text-xs ff:formforge:text-default"
                    >
                      {{ file.mimeType }}
                    </p>
                  </div>

                  <div class="ff:formforge:flex ff:formforge:items-center ff:formforge:gap-1">
                    <UButton
                      v-if="file.url !== null"
                      :href="file.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-external-link"
                      size="xs"
                    >
                      {{ t('response.action.preview') }}
                    </UButton>

                    <UButton
                      v-if="file.url !== null"
                      type="button"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-download"
                      size="xs"
                      @click="downloadFile(file)"
                    >
                      {{ t('response.action.download') }}
                    </UButton>

                    <UTooltip
                      v-else
                      :text="t('response.file.missingUrlHint')"
                    >
                      <span class="ff:formforge:inline-flex ff:formforge:h-7 ff:formforge:w-7 ff:formforge:items-center ff:formforge:justify-center ff:formforge:text-warning">
                        <UIcon
                          name="i-lucide-triangle-alert"
                          class="ff:formforge:h-4 ff:formforge:w-4"
                        />
                      </span>
                    </UTooltip>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="ff:formforge:stack-1"
            >
              <p class="ff:formforge:whitespace-pre-wrap ff:formforge:text-sm ff:formforge:weight-500 ff:formforge:text-default">
                <span v-html="item.question" />
              </p>

              <p
                v-if="item.answer.kind === 'text'"
                class="ff:formforge:whitespace-pre-wrap ff:formforge:text-sm ff:formforge:text-default"
              >
                {{ item.answer.value }}
              </p>

              <div
                v-else
                class="ff:formforge:stack-2"
              >
                <div
                  v-for="file in item.answer.value"
                  :key="file.id"
                  class="ff:formforge:flex ff:formforge:items-center ff:formforge:gap-3"
                >
                  <button
                    v-if="file.isImage && file.url !== null"
                    type="button"
                    class="ff:formforge:inline-flex ff:formforge:h-12 ff:formforge:w-12 ff:formforge:items-center ff:formforge:justify-center ff:formforge:overflow-hidden ff:formforge:rounded ff:formforge:border-thin ff:formforge:border-default ff:formforge:bg-elevated"
                    @click="openImagePreview(file)"
                  >
                    <img
                      :src="file.url"
                      :alt="file.name"
                      class="ff:formforge:h-full ff:formforge:w-full ff:formforge:object-cover"
                    >
                  </button>

                  <UIcon
                    v-else
                    name="i-lucide-file"
                    class="ff:formforge:h-5 ff:formforge:w-5 ff:formforge:shrink-0 ff:formforge:text-default"
                  />

                  <div class="ff:formforge:min-w-0 ff:formforge:flex-1">
                    <p class="ff:formforge:truncate ff:formforge:text-sm ff:formforge:text-default">
                      {{ file.name }}
                    </p>
                    <p
                      v-if="file.mimeType"
                      class="ff:formforge:text-xs ff:formforge:text-default"
                    >
                      {{ file.mimeType }}
                    </p>
                  </div>

                  <div class="ff:formforge:flex ff:formforge:items-center ff:formforge:gap-1">
                    <UButton
                      v-if="file.url !== null"
                      :href="file.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-external-link"
                      size="xs"
                    >
                      {{ t('response.action.preview') }}
                    </UButton>

                    <UButton
                      v-if="file.url !== null"
                      type="button"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-download"
                      size="xs"
                      @click="downloadFile(file)"
                    >
                      {{ t('response.action.download') }}
                    </UButton>

                    <UTooltip
                      v-else
                      :text="t('response.file.missingUrlHint')"
                    >
                      <span class="ff:formforge:inline-flex ff:formforge:h-7 ff:formforge:w-7 ff:formforge:items-center ff:formforge:justify-center ff:formforge:text-warning">
                        <UIcon
                          name="i-lucide-triangle-alert"
                          class="ff:formforge:h-4 ff:formforge:w-4"
                        />
                      </span>
                    </UTooltip>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <UModal
      :open="isPreviewOpen"
      :ui="{ content: 'formforge' }"
      @update:open="(open: boolean) => !open && closeImagePreview()"
    >
      <template #content>
        <div class="ff:formforge:stack-3 ff:formforge:p-3">
          <img
            v-if="previewImage?.url"
            :src="previewImage.url"
            :alt="previewImage.name"
            class="ff:formforge:max-h-[80vh] ff:formforge:w-full ff:formforge:rounded ff:formforge:object-contain"
          >
          <p
            v-if="previewImage"
            class="ff:formforge:truncate ff:formforge:text-sm ff:formforge:text-muted"
          >
            {{ previewImage.name }}
          </p>
        </div>
      </template>
    </UModal>
  </div>
</template>
