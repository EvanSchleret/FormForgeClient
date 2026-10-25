import type { useFormForgeI18n } from '../composables/useFormForgeI18n'
import type { FormForgeJsonObject } from '../types'
import { getFormForgeCountryName } from './country'
import { sanitizeFormForgeInlineRichText } from './rich-text'

const ADDRESS_KEYS = ['line1', 'line2', 'city', 'state', 'zip', 'country'] as const

export interface FormForgeResponseFileItem {
  id: string
  name: string
  url: string | null
  mimeType?: string
  isImage: boolean
}

export interface FormForgeResponseAnswerText {
  kind: 'text'
  value: string
}

export interface FormForgeResponseAnswerFiles {
  kind: 'files'
  value: FormForgeResponseFileItem[]
}

export type FormForgeResponseAnswer = FormForgeResponseAnswerText | FormForgeResponseAnswerFiles

export interface FormForgeResponseItem {
  id: string
  question: string
  answer: FormForgeResponseAnswer
}

export interface FormForgeResponsePage {
  id: string
  title: string
  description?: string
  items: FormForgeResponseItem[]
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

type FormForgeResponseTranslator = ReturnType<typeof useFormForgeI18n>['t']

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function formatAddressPart(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return null
}

export function formatFormForgeAddressAnswer(value: unknown, locale: string = 'en'): string | null {
  if (!isRecord(value)) {
    return null
  }

  const parts = ADDRESS_KEYS
    .map((key) => {
      const part = key === 'country' && typeof value[key] === 'string'
        ? getFormForgeCountryName(value[key], locale)
        : value[key]

      return formatAddressPart(part)
    })
    .filter((part): part is string => part !== null)

  return parts.length > 0 ? parts.join(', ') : null
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

function normalizeFileItem(
  value: unknown,
  index: number,
  t: FormForgeResponseTranslator
): FormForgeResponseFileItem | null {
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

function collectFiles(
  value: unknown,
  allowFiles: boolean,
  t: FormForgeResponseTranslator
): FormForgeResponseFileItem[] {
  if (!allowFiles) {
    return []
  }

  if (Array.isArray(value)) {
    const files: FormForgeResponseFileItem[] = []
    for (const [index, item] of value.entries()) {
      const normalized = normalizeFileItem(item, index, t)
      if (normalized !== null) {
        files.push(normalized)
      }
    }
    return files
  }

  const single = normalizeFileItem(value, 0, t)
  if (single !== null) {
    return [single]
  }

  return []
}

function formatAnswerText(value: unknown, fieldType: string | undefined, t: FormForgeResponseTranslator, locale: string): string {
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

    return value.map((item) => formatAnswerText(item, undefined, t, locale)).join(', ')
  }

  if (isRecord(value)) {
    if (fieldType === 'address') {
      const addressText = formatFormForgeAddressAnswer(value, locale)
      if (addressText !== null) {
        return addressText
      }
    }

    const start = value.start
    const end = value.end

    if (start !== undefined || end !== undefined) {
      const startText = formatAnswerText(start, undefined, t, locale)
      const endText = formatAnswerText(end, undefined, t, locale)

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

function makeAnswer(
  value: unknown,
  allowFiles: boolean,
  fieldType: string | undefined,
  t: FormForgeResponseTranslator,
  locale: string
): FormForgeResponseAnswer {
  const files = collectFiles(value, allowFiles, t)
  if (files.length > 0) {
    return {
      kind: 'files',
      value: files
    }
  }

  return {
    kind: 'text',
    value: formatAnswerText(value, fieldType, t, locale)
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

function normalizePages(schemaValue: unknown, t: FormForgeResponseTranslator): SchemaPageLike[] {
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

function createPagesFromSchema(
  schemaValue: unknown,
  payload: Record<string, unknown>,
  t: FormForgeResponseTranslator,
  locale: string
): FormForgeResponsePage[] {
  const pages = normalizePages(schemaValue, t)

  return pages.map((page, pageIndex) => ({
    id: page.pageKey,
    title: page.title.trim() !== '' ? page.title : t('response.page.fallback', { index: pageIndex + 1 }),
    description: page.description,
    items: page.fields.map((field, fieldIndex) => ({
      id: field.fieldKey,
      question: typeof field.label === 'string' && field.label.trim() !== ''
        ? sanitizeFormForgeInlineRichText(field.label)
        : t('response.question.fallback', { index: fieldIndex + 1 }),
      answer: makeAnswer(
        mapFieldAnswerValue(field, payload[field.name]),
        field.type === 'file',
        field.type,
        t,
        locale
      )
    }))
  }))
}

function createPagesFromPayload(payload: Record<string, unknown>, t: FormForgeResponseTranslator, locale: string): FormForgeResponsePage[] {
  const entries = Object.entries(payload)
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
        answer: makeAnswer(value, true, undefined, t, locale)
      }))
    }
  ]
}

export function createFormForgeResponsePages(
  schemaValue: unknown,
  payload: Record<string, unknown>,
  t: FormForgeResponseTranslator,
  locale: string = 'en'
): FormForgeResponsePage[] {
  return schemaValue !== null
    ? createPagesFromSchema(schemaValue, payload, t, locale)
    : createPagesFromPayload(payload, t, locale)
}

export function getFormForgeResponsePayload(response: FormForgeJsonObject | null): Record<string, unknown> {
  if (response === null) {
    return {}
  }

  const payload = response.payload
  return isRecord(payload) ? payload : {}
}
