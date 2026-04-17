<script setup lang="ts">
import { computed, ref, useRoute, watch } from '#imports'
import { useFormForgeGetForm } from '../../composables/useFormForgeGetForm'
import { useFormForgeI18n } from '../../composables/useFormForgeI18n'
import { useFormForgeResponses } from '../../composables/useFormForgeResponses'
import type { FormForgeClientConfig, FormForgeJsonObject } from '../../types'

type FormForgeResponseLayout = 'line' | 'column'

interface ResponseFileItem {
  id: string
  name: string
  url: string | null
  mimeType?: string
  isImage: boolean
}

interface ResponseAnswerText {
  kind: 'text'
  value: string
}

interface ResponseAnswerFiles {
  kind: 'files'
  value: ResponseFileItem[]
}

type ResponseAnswer = ResponseAnswerText | ResponseAnswerFiles

interface ResponseItem {
  id: string
  question: string
  answer: ResponseAnswer
}

interface ResponsePage {
  id: string
  title: string
  description?: string
  items: ResponseItem[]
}

interface SchemaFieldLike {
  fieldKey: string
  name: string
  type?: string
  label?: string
  optionLabels: Record<string, string>
}

interface SchemaPageLike {
  pageKey: string
  title: string
  description?: string
  fields: SchemaFieldLike[]
}

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
const { t } = useFormForgeI18n({
  locale: () => props.clientConfig?.locale
})

const responseResource = ref<FormForgeJsonObject | null>(null)
const localError = ref<string | null>(null)
const formLoadError = ref<string | null>(null)
const previewImage = ref<ResponseFileItem | null>(null)

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
  if (responseResource.value === null) {
    return {}
  }

  const responsePayload = responseResource.value.payload
  if (isRecord(responsePayload)) {
    return responsePayload
  }

  return {}
})

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return false
  }

  return true
}

function pickString(value: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const candidate = value[key]
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate
    }
  }

  return undefined
}

function basename(path: string): string {
  const value = path.split('/').at(-1)
  if (typeof value === 'string' && value !== '') {
    return value
  }

  return path
}

function looksLikeImage(name: string, mimeType?: string): boolean {
  if (typeof mimeType === 'string' && mimeType.startsWith('image/')) {
    return true
  }

  return /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(name)
}

function looksLikeFileReference(value: string): boolean {
  const trimmed = value.trim()

  if (trimmed === '') {
    return false
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return true
  }

  if (trimmed.includes('/')) {
    return true
  }

  return /\.(pdf|docx?|xlsx?|csv|txt|zip|png|jpe?g|gif|webp|svg|bmp|ico|avif)(\?.*)?$/i.test(trimmed)
}

function normalizeFileItem(value: unknown, index: number): ResponseFileItem | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!looksLikeFileReference(trimmed)) {
      return null
    }

    const name = basename(trimmed)

    return {
      id: `file-${index}`,
      name,
      url: trimmed,
      isImage: looksLikeImage(name)
    }
  }

  if (!isRecord(value)) {
    return null
  }

  if ('start' in value || 'end' in value) {
    return null
  }

  const url = pickString(value, ['url', 'download_url', 'preview_url', 'signed_url', 'public_url', 'path']) ?? null
  const mimeType = pickString(value, ['mime_type', 'mimeType'])
  const name =
    pickString(value, ['original_name', 'file_name', 'filename', 'name'])
    ?? (url !== null ? basename(url) : t('response.file.unnamed'))

  const hasFileSignal =
    url !== null
    || mimeType !== undefined
    || 'disk' in value
    || 'size' in value
    || 'extension' in value

  if (!hasFileSignal) {
    return null
  }

  return {
    id: `file-${index}`,
    name,
    url,
    mimeType,
    isImage: looksLikeImage(name, mimeType)
  }
}

function collectFiles(value: unknown, allowFiles: boolean): ResponseFileItem[] {
  if (!allowFiles) {
    return []
  }

  if (Array.isArray(value)) {
    const files: ResponseFileItem[] = []
    for (const [index, item] of value.entries()) {
      const normalized = normalizeFileItem(item, index)
      if (normalized !== null) {
        files.push(normalized)
      }
    }
    return files
  }

  const single = normalizeFileItem(value, 0)
  if (single !== null) {
    return [single]
  }

  return []
}

function formatAnswerText(value: unknown): string {
  if (value === undefined || value === null) {
    return t('response.answer.empty')
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? t('response.answer.empty') : trimmed
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'boolean') {
    return value ? t('response.answer.yes') : t('response.answer.no')
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return t('response.answer.empty')
    }

    return value.map((item) => formatAnswerText(item)).join(', ')
  }

  if (isRecord(value)) {
    const start = value.start
    const end = value.end

    if (start !== undefined || end !== undefined) {
      const startText = formatAnswerText(start)
      const endText = formatAnswerText(end)

      if (startText === t('response.answer.empty') && endText === t('response.answer.empty')) {
        return t('response.answer.empty')
      }

      if (startText === t('response.answer.empty')) {
        return endText
      }

      if (endText === t('response.answer.empty')) {
        return startText
      }

      return `${startText} - ${endText}`
    }

    return JSON.stringify(value)
  }

  return t('response.answer.empty')
}

function makeAnswer(value: unknown, allowFiles: boolean): ResponseAnswer {
  const files = collectFiles(value, allowFiles)
  if (files.length > 0) {
    return {
      kind: 'files',
      value: files
    }
  }

  return {
    kind: 'text',
    value: formatAnswerText(value)
  }
}

function toOptionKey(value: unknown): string | null {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'string') {
    return `string:${value}`
  }

  if (typeof value === 'number') {
    return `number:${value}`
  }

  if (typeof value === 'boolean') {
    return `boolean:${value ? 'true' : 'false'}`
  }

  return null
}

function normalizeOptionLabels(options: unknown): Record<string, string> {
  if (!Array.isArray(options)) {
    return {}
  }

  const labels: Record<string, string> = {}

  for (const option of options) {
    if (option === null || typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
      const key = toOptionKey(option)
      if (key !== null) {
        labels[key] = String(option ?? '')
      }

      continue
    }

    if (!isRecord(option)) {
      continue
    }

    const optionValue = option.value
    const key = toOptionKey(optionValue)
    if (key === null) {
      continue
    }

    const label = typeof option.label === 'string' ? option.label : String(optionValue ?? '')
    labels[key] = label
  }

  return labels
}

function mapOptionValue(optionLabels: Record<string, string>, value: unknown): unknown {
  const optionKey = toOptionKey(value)
  if (optionKey === null) {
    return value
  }

  return optionLabels[optionKey] ?? value
}

function mapFieldAnswerValue(field: SchemaFieldLike, value: unknown): unknown {
  const optionLabelCount = Object.keys(field.optionLabels).length
  if (optionLabelCount === 0) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((entry) => mapOptionValue(field.optionLabels, entry))
  }

  return mapOptionValue(field.optionLabels, value)
}

function normalizeField(value: unknown, index: number): SchemaFieldLike | null {
  if (!isRecord(value)) {
    return null
  }

  const fieldKey = typeof value.field_key === 'string' && value.field_key !== ''
    ? value.field_key
    : `field_${index + 1}`
  const name = typeof value.name === 'string' && value.name !== ''
    ? value.name
    : ''
  const label = typeof value.label === 'string' ? value.label : undefined
  const type = typeof value.type === 'string' ? value.type : undefined
  const optionLabels = normalizeOptionLabels(value.options)

  if (name === '') {
    return null
  }

  return {
    fieldKey,
    name,
    type,
    label,
    optionLabels
  }
}

function normalizePages(schemaValue: unknown): SchemaPageLike[] {
  if (!isRecord(schemaValue)) {
    return []
  }

  const schemaPages = schemaValue.pages
  if (Array.isArray(schemaPages) && schemaPages.length > 0) {
    const pages: SchemaPageLike[] = []

    for (const [pageIndex, pageValue] of schemaPages.entries()) {
      if (!isRecord(pageValue)) {
        continue
      }

      const pageKey = typeof pageValue.page_key === 'string' && pageValue.page_key !== ''
        ? pageValue.page_key
        : `page_${pageIndex + 1}`
      const title = typeof pageValue.title === 'string'
        ? pageValue.title
        : t('response.page.fallback', { index: pageIndex + 1 })
      const description = typeof pageValue.description === 'string' && pageValue.description.trim() !== ''
        ? pageValue.description
        : undefined
      const rawFields = Array.isArray(pageValue.fields) ? pageValue.fields : []
      const fields: SchemaFieldLike[] = []

      for (const [fieldIndex, fieldValue] of rawFields.entries()) {
        const field = normalizeField(fieldValue, fieldIndex)
        if (field !== null) {
          fields.push(field)
        }
      }

      pages.push({
        pageKey,
        title,
        description,
        fields
      })
    }

    if (pages.length > 0) {
      return pages
    }
  }

  const rawFields = Array.isArray(schemaValue.fields) ? schemaValue.fields : []
  const fields: SchemaFieldLike[] = []

  for (const [fieldIndex, fieldValue] of rawFields.entries()) {
    const field = normalizeField(fieldValue, fieldIndex)
    if (field !== null) {
      fields.push(field)
    }
  }

  if (fields.length === 0) {
    return []
  }

  return [
    {
      pageKey: 'page_1',
      title: t('response.page.fallback', { index: 1 }),
      fields
    }
  ]
}

function createPagesFromSchema(schemaValue: unknown): ResponsePage[] {
  const pages = normalizePages(schemaValue)

  return pages.map((page, pageIndex) => ({
    id: page.pageKey,
    title: page.title.trim() !== '' ? page.title : t('response.page.fallback', { index: pageIndex + 1 }),
    description: page.description,
    items: page.fields.map((field, fieldIndex) => ({
      id: field.fieldKey,
      question: typeof field.label === 'string' && field.label.trim() !== ''
        ? field.label
        : t('response.question.fallback', { index: fieldIndex + 1 }),
      answer: makeAnswer(
        mapFieldAnswerValue(field, payload.value[field.name]),
        field.type === 'file'
      )
    }))
  }))
}

function createPagesFromPayload(): ResponsePage[] {
  const entries = Object.entries(payload.value)
  if (entries.length === 0) {
    return []
  }

  return [
    {
      id: 'page_1',
      title: t('response.page.fallback', { index: 1 }),
      items: entries.map(([key, value], index) => ({
        id: `payload-${key}`,
        question: key !== '' ? key : t('response.question.fallback', { index: index + 1 }),
        answer: makeAnswer(value, true)
      }))
    }
  ]
}

const responsePages = computed<ResponsePage[]>(() => {
  const schema = formSchema.form.value as unknown
  if (schema !== null) {
    return createPagesFromSchema(schema)
  }

  return createPagesFromPayload()
})

function openImagePreview(file: ResponseFileItem): void {
  if (file.url === null) {
    return
  }

  previewImage.value = file
}

function closeImagePreview(): void {
  previewImage.value = null
}

async function downloadFile(file: ResponseFileItem): Promise<void> {
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
  <div class="w-full">
    <p
      v-if="loading"
      class="text-sm text-neutral-500"
    >
      {{ t('response.loading') }}
    </p>

    <p
      v-else-if="error !== null"
      class="text-sm text-red-600"
    >
      {{ error }}
    </p>

    <p
      v-else-if="responsePages.length === 0"
      class="text-sm text-neutral-500"
    >
      {{ t('response.empty') }}
    </p>

    <div
      v-else
      class="space-y-12"
    >
      <p
        v-if="formLoadError !== null"
        class="text-sm text-amber-700"
      >
        {{ formLoadError }}
      </p>

      <section
        v-for="(page, pageIndex) in responsePages"
        :key="page.id"
        class="space-y-4"
      >
        <div class="space-y-1">
          <h3 class="text-base font-semibold text-default">
            {{ page.title || t('response.page.fallback', { index: pageIndex + 1 }) }}
          </h3>
          <p
            v-if="typeof page.description === 'string' && page.description.trim() !== ''"
            class="text-sm text-neutral-500"
          >
            {{ page.description }}
          </p>
        </div>

        <div class="space-y-5">
          <article
            v-for="item in page.items"
            :key="item.id"
            class="space-y-2"
          >
            <div
              v-if="isLineLayout"
              class="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-6"
            >
              <p class="whitespace-pre-wrap text-sm font-medium text-default">
                {{ item.question }}
              </p>

              <div
                v-if="item.answer.kind === 'text'"
                class="whitespace-pre-wrap text-sm text-default"
              >
                {{ item.answer.value }}
              </div>

              <div
                v-else
                class="space-y-2"
              >
                <div
                  v-for="file in item.answer.value"
                  :key="file.id"
                  class="flex items-center gap-3"
                >
                  <button
                    v-if="file.isImage && file.url !== null"
                    type="button"
                    class="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded border border-neutral-200 bg-white"
                    @click="openImagePreview(file)"
                  >
                    <img
                      :src="file.url"
                      :alt="file.name"
                      class="h-full w-full object-cover"
                    >
                  </button>

                  <UIcon
                    v-else
                    name="i-lucide-file"
                    class="h-5 w-5 shrink-0 text-neutral-500"
                  />

                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm text-default">
                      {{ file.name }}
                    </p>
                    <p
                      v-if="file.mimeType"
                      class="text-xs text-neutral-500"
                    >
                      {{ file.mimeType }}
                    </p>
                  </div>

                  <div class="flex items-center gap-1">
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
                      <span class="inline-flex h-7 w-7 items-center justify-center text-amber-600">
                        <UIcon
                          name="i-lucide-triangle-alert"
                          class="h-4 w-4"
                        />
                      </span>
                    </UTooltip>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="space-y-1"
            >
              <p class="whitespace-pre-wrap text-sm font-medium text-default">
                {{ item.question }}
              </p>

              <p
                v-if="item.answer.kind === 'text'"
                class="whitespace-pre-wrap text-sm text-default"
              >
                {{ item.answer.value }}
              </p>

              <div
                v-else
                class="space-y-2"
              >
                <div
                  v-for="file in item.answer.value"
                  :key="file.id"
                  class="flex items-center gap-3"
                >
                  <button
                    v-if="file.isImage && file.url !== null"
                    type="button"
                    class="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded border border-neutral-200 bg-white"
                    @click="openImagePreview(file)"
                  >
                    <img
                      :src="file.url"
                      :alt="file.name"
                      class="h-full w-full object-cover"
                    >
                  </button>

                  <UIcon
                    v-else
                    name="i-lucide-file"
                    class="h-5 w-5 shrink-0 text-neutral-500"
                  />

                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm text-default">
                      {{ file.name }}
                    </p>
                    <p
                      v-if="file.mimeType"
                      class="text-xs text-neutral-500"
                    >
                      {{ file.mimeType }}
                    </p>
                  </div>

                  <div class="flex items-center gap-1">
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
                      <span class="inline-flex h-7 w-7 items-center justify-center text-amber-600">
                        <UIcon
                          name="i-lucide-triangle-alert"
                          class="h-4 w-4"
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
      @update:open="(open: boolean) => !open && closeImagePreview()"
    >
      <template #content>
        <div class="space-y-3 p-3">
          <img
            v-if="previewImage?.url"
            :src="previewImage.url"
            :alt="previewImage.name"
            class="max-h-[80vh] w-full rounded object-contain"
          >
          <p
            v-if="previewImage"
            class="truncate text-sm text-neutral-600"
          >
            {{ previewImage.name }}
          </p>
        </div>
      </template>
    </UModal>
  </div>
</template>
