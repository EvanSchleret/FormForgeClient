import type { FormForgeAddressFieldSchema, FormForgeFieldType, FormForgeTemporalMode } from '../types'

export type FormForgeLocale = 'en' | 'fr'

const DEFAULT_ADDRESS_FIELDS: Record<FormForgeLocale, FormForgeAddressFieldSchema[]> = {
  en: [
    { key: 'line1', label: 'Address line 1', visible: true, required: true },
    { key: 'line2', label: 'Address line 2', visible: false, required: false },
    { key: 'city', label: 'City', visible: true, required: true },
    { key: 'state', label: 'State', visible: false, required: false },
    { key: 'zip', label: 'Zip', visible: true, required: true },
    { key: 'country', label: 'Country', visible: true, required: true }
  ],
  fr: [
    { key: 'line1', label: "Ligne d'adresse 1", visible: true, required: true },
    { key: 'line2', label: "Ligne d'adresse 2", visible: false, required: false },
    { key: 'city', label: 'Ville', visible: true, required: true },
    { key: 'state', label: 'État', visible: false, required: false },
    { key: 'zip', label: 'Code postal', visible: true, required: true },
    { key: 'country', label: 'Pays', visible: true, required: true }
  ]
}

const DEFAULT_FIELD_LABELS: Record<FormForgeLocale, Record<string, string>> = {
  en: {
    text: 'Free text',
    textarea: 'Long text',
    email: 'Email',
    number: 'Number',
    select: 'Dropdown',
    select_menu: 'Dropdown menu',
    radio: 'Single choice',
    checkbox: 'Checkbox',
    consent: 'Consent',
    checkbox_group: 'Multiple choice',
    switch: 'Switch',
    temporal: 'Date',
    date: 'Date',
    time: 'Time',
    file: 'File upload',
    address: 'Address'
  },
  fr: {
    text: 'Texte libre',
    textarea: 'Réponse longue',
    email: 'E-mail',
    number: 'Nombre',
    select: 'Sélection',
    select_menu: 'Menu déroulant',
    radio: 'Choix unique',
    checkbox: 'Case à cocher',
    consent: 'Consentement',
    checkbox_group: 'Choix multiples',
    switch: 'Interrupteur',
    temporal: 'Date',
    date: 'Date',
    time: 'Heure',
    file: 'Téléversement de fichier',
    address: 'Adresse'
  }
}

const DEFAULT_ANSWER_PLACEHOLDER: Record<FormForgeLocale, string> = {
  en: 'Enter your answer here ...',
  fr: 'Entrez votre réponse ici ...'
}

const DEFAULT_CONSENT_LABEL: Record<FormForgeLocale, string> = {
  en: 'I agree',
  fr: "J'accepte"
}

function normalizeLocale(locale?: string): FormForgeLocale {
  if (typeof locale !== 'string' || locale.trim() === '') {
    return 'en'
  }

  return locale.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export function createDefaultAddressFields(locale?: string): FormForgeAddressFieldSchema[] {
  return DEFAULT_ADDRESS_FIELDS[normalizeLocale(locale)].map((field) => ({ ...field }))
}

export function resolveDefaultFieldLabel(
  type: FormForgeFieldType,
  locale?: string,
  temporalMode?: FormForgeTemporalMode
): string {
  const resolvedLocale = normalizeLocale(locale)

  if (type === 'temporal') {
    return temporalMode === 'time'
      ? DEFAULT_FIELD_LABELS[resolvedLocale].time
      : DEFAULT_FIELD_LABELS[resolvedLocale].date
  }

  return DEFAULT_FIELD_LABELS[resolvedLocale][type] ?? DEFAULT_FIELD_LABELS[resolvedLocale].text
}

export function resolveDefaultAnswerPlaceholder(locale?: string): string {
  return DEFAULT_ANSWER_PLACEHOLDER[normalizeLocale(locale)]
}

export function resolveDefaultConsentLabel(locale?: string): string {
  return DEFAULT_CONSENT_LABEL[normalizeLocale(locale)]
}
