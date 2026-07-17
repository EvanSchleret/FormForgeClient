import type {
  FormForgeFieldOption,
  FormForgeFieldSchema,
  FormForgeFieldType,
  FormForgeFileFieldSchema
} from '../types'
import {
  createDefaultAddressFields,
  resolveDefaultAnswerPlaceholder,
  resolveDefaultConsentLabel
} from './defaults'

function createChoiceOptions(type: FormForgeFieldType): FormForgeFieldOption[] {
  const count = type === 'checkbox_group' ? 3 : 2

  return Array.from({ length: count }, (_, index) => ({
    label: '',
    value: `option_${index + 1}`
  }))
}

function createAddressValue(): Record<string, null> {
  return {
    line1: null,
    line2: null,
    city: null,
    state: null,
    zip: null,
    country: null
  }
}

function isChoiceFieldType(type: FormForgeFieldType): boolean {
  return type === 'select' || type === 'select_menu' || type === 'radio' || type === 'checkbox_group'
}

export function normalizeFormForgeFieldTypeChange(
  field: FormForgeFieldSchema,
  nextType: FormForgeFieldType,
  locale?: string
): void {
  field.type = nextType
  field.rules = []
  field.meta = {}
  field.default = null
  field.placeholder = undefined
  field.min = null
  field.max = null
  field.step = null
  field.options = undefined
  field.address_fields = undefined
  field.display = undefined
  field.temporal_mode = undefined
  field.hour_cycle = undefined
  field.consent_label = undefined

  const fileField = field as FormForgeFileFieldSchema
  fileField.multiple = undefined
  fileField.accept = undefined
  fileField.max_size = undefined
  fileField.max_files = undefined
  fileField.storage = undefined

  if (nextType === 'text' || nextType === 'number') {
    field.placeholder = resolveDefaultAnswerPlaceholder(locale)
  }

  if (isChoiceFieldType(nextType)) {
    field.options = createChoiceOptions(nextType)
    field.display = nextType === 'radio' || nextType === 'checkbox_group' ? 'list' : 'menu'
  }

  if (nextType === 'consent') {
    field.consent_label = resolveDefaultConsentLabel(locale)
  }

  if (nextType === 'temporal' || nextType === 'date' || nextType === 'time') {
    field.temporal_mode = nextType === 'time' ? 'time' : 'date'
    field.hour_cycle = nextType === 'time' ? 24 : undefined
  }

  if (nextType === 'file') {
    fileField.multiple = false
    fileField.accept = []
  }

  if (nextType === 'address') {
    field.default = createAddressValue()
    field.address_fields = createDefaultAddressFields(locale)
  }
}
