import { computed, useNuxtApp, useRuntimeConfig } from '#imports'
import type { FormForgeJsonObject, FormForgeJsonValue } from '../types'

export type FormForgeLocale = 'en' | 'fr'

export interface UseFormForgeI18nOptions {
  locale?: string | (() => string | undefined)
}

type FormForgeTranslationValues = Record<string, string | number>

const TRANSLATIONS = {
  en: {
    'builder.fieldType.text': 'Short text',
    'builder.fieldType.textarea': 'Long text',
    'builder.fieldType.email': 'Email',
    'builder.fieldType.number': 'Number',
    'builder.fieldType.select': 'Select',
    'builder.fieldType.select_menu': 'Select menu',
    'builder.fieldType.radio': 'Multiple choice',
    'builder.fieldType.checkbox': 'Checkbox',
    'builder.fieldType.checkbox_group': 'Checkbox group',
    'builder.fieldType.switch': 'Switch',
    'builder.fieldType.date': 'Date',
    'builder.fieldType.time': 'Time',
    'builder.fieldType.datetime': 'Date & time',
    'builder.fieldType.date_range': 'Date range',
    'builder.fieldType.datetime_range': 'Datetime range',
    'builder.fieldType.file': 'File upload',
    'builder.targetType.page': 'Page',
    'builder.targetType.field': 'Field',
    'builder.formTitlePlaceholder': 'Form title',
    'builder.categoryPlaceholder': 'Category',
    'builder.categoryNone': 'No category',
    'builder.loadingForm': 'Loading form...',
    'builder.lastSave': 'Last save: {value}',
    'builder.save': 'Save',
    'builder.publish': 'Publish',
    'builder.unpublish': 'Unpublish',
    'builder.pageCounter': 'Page {current} / {total}',
    'builder.pageTitlePlaceholder': 'Page title',
    'builder.pageDescriptionPlaceholder': 'Page description (optional)',
    'builder.tooltip.mergePage': 'Merge with previous page',
    'builder.tooltip.deletePage': 'Delete page',
    'builder.questionPlaceholder': 'Question',
    'builder.tooltip.duplicateQuestion': 'Duplicate question',
    'builder.tooltip.deleteQuestion': 'Delete question',
    'builder.tooltip.addCategory': 'Add category',
    'builder.required': 'Required',
    'builder.optionLabelPlaceholder': 'Option label',
    'builder.addOption': 'Add option',
    'builder.advancedSettings': 'Advanced settings',
    'builder.placeholderPlaceholder': 'Placeholder',
    'builder.helpTextPlaceholder': 'Help text',
    'builder.minPlaceholder': 'Min',
    'builder.maxPlaceholder': 'Max',
    'builder.stepPlaceholder': 'Step',
    'builder.multiple': 'Multiple',
    'builder.acceptedExtensionsPlaceholder': 'Accepted extensions (.pdf,.png)',
    'builder.conditions': 'Conditions',
    'builder.addCondition': 'Add condition',
    'builder.condition.action.show': 'Show',
    'builder.condition.action.hide': 'Hide',
    'builder.condition.action.skip': 'Skip',
    'builder.condition.action.require': 'Require',
    'builder.condition.action.disable': 'Disable',
    'builder.condition.match.all': 'All',
    'builder.condition.match.any': 'Any',
    'builder.condition.operator.eq': 'Equals',
    'builder.condition.operator.neq': 'Not equals',
    'builder.condition.operator.in': 'In',
    'builder.condition.operator.not_in': 'Not in',
    'builder.condition.operator.gt': 'Greater than',
    'builder.condition.operator.gte': 'Greater or equal',
    'builder.condition.operator.lt': 'Less than',
    'builder.condition.operator.lte': 'Less or equal',
    'builder.condition.operator.contains': 'Contains',
    'builder.condition.operator.not_contains': 'Does not contain',
    'builder.condition.operator.is_empty': 'Is empty',
    'builder.condition.operator.not_empty': 'Is not empty',
    'builder.valuePlaceholder': 'Value',
    'builder.remove': 'Remove',
    'builder.addClause': 'Add clause',
    'builder.deleteCondition': 'Delete condition',
    'builder.rail.addQuestion': 'Add question',
    'builder.rail.addPage': 'Add page',
    'builder.loadingBuilder': 'Loading builder...',
    'builder.error.loadForm': 'Failed to load form',
    'builder.error.save': 'Save failed',
    'builder.error.publish': 'Publish failed',
    'builder.error.unpublish': 'Unpublish failed',
    'builder.error.categoryCreate': 'Category creation failed',
    'builder.toast.saveSuccess': 'Form saved',
    'builder.toast.publishSuccess': 'Form published',
    'builder.toast.unpublishSuccess': 'Form unpublished',
    'builder.optionDefaultLabel': 'Option',
    'builder.optionsCount': '{count} options',
    'builder.categoryModal.title': 'Create category',
    'builder.categoryModal.description': 'Add a category and assign it to this form.',
    'builder.categoryModal.nameLabel': 'Name',
    'builder.categoryModal.namePlaceholder': 'Category name',
    'builder.categoryModal.nameRequired': 'Category name is required',
    'builder.categoryModal.descriptionLabel': 'Description',
    'builder.categoryModal.descriptionPlaceholder': 'Description (optional)',
    'builder.categoryModal.activeLabel': 'Active category',
    'builder.categoryModal.cancel': 'Cancel',
    'builder.categoryModal.create': 'Create category',
    'renderer.submit': 'Submit',
    'renderer.loadingForm': 'Loading form',
    'renderer.error.loadForm': 'Unable to load form',
    'renderer.error.submit': 'Submission failed',
    'renderer.error.missingFormKey': 'Missing form key',
    'renderer.alert.fixFields': 'Please fix the following fields',
    'renderer.alert.submitted': 'Form submitted',
    'renderer.pageTitle': 'Page {index}',
    'renderer.navigation.previous': 'Previous',
    'renderer.navigation.next': 'Next',
    'response.loading': 'Loading response',
    'response.empty': 'No response data available',
    'response.error.missingResponseUuid': 'Response UUID is required',
    'response.error.missingFormKey': 'Form key is required',
    'response.error.load': 'Unable to load response',
    'response.error.loadForm': 'Unable to load form schema',
    'response.page.fallback': 'Page {index}',
    'response.question.fallback': 'Question {index}',
    'response.answer.empty': 'No answer',
    'response.answer.yes': 'Yes',
    'response.answer.no': 'No',
    'response.action.preview': 'Preview',
    'response.action.download': 'Download',
    'response.file.unnamed': 'File',
    'response.file.missingUrlHint': 'File URL is unavailable. Enable FORMFORGE_HTTP_FILE_URLS_ENABLED in FormForge config.'
  },
  fr: {
    'builder.fieldType.text': 'Réponse courte',
    'builder.fieldType.textarea': 'Réponse longue',
    'builder.fieldType.email': 'E-mail',
    'builder.fieldType.number': 'Nombre',
    'builder.fieldType.select': 'Sélection',
    'builder.fieldType.select_menu': 'Menu de sélection',
    'builder.fieldType.radio': 'Choix multiples',
    'builder.fieldType.checkbox': 'Case à cocher',
    'builder.fieldType.checkbox_group': 'Groupe de cases',
    'builder.fieldType.switch': 'Interrupteur',
    'builder.fieldType.date': 'Date',
    'builder.fieldType.time': 'Heure',
    'builder.fieldType.datetime': 'Date et heure',
    'builder.fieldType.date_range': 'Plage de dates',
    'builder.fieldType.datetime_range': 'Plage date/heure',
    'builder.fieldType.file': 'Téléversement de fichier',
    'builder.targetType.page': 'Page',
    'builder.targetType.field': 'Champ',
    'builder.formTitlePlaceholder': 'Titre du formulaire',
    'builder.categoryPlaceholder': 'Catégorie',
    'builder.categoryNone': 'Aucune catégorie',
    'builder.loadingForm': 'Chargement du formulaire...',
    'builder.lastSave': 'Dernière sauvegarde : {value}',
    'builder.save': 'Sauvegarder',
    'builder.publish': 'Publier',
    'builder.unpublish': 'Dépublier',
    'builder.pageCounter': 'Page {current} / {total}',
    'builder.pageTitlePlaceholder': 'Titre de la page',
    'builder.pageDescriptionPlaceholder': 'Description de la page (optionnel)',
    'builder.tooltip.mergePage': 'Fusionner avec la page précédente',
    'builder.tooltip.deletePage': 'Supprimer la page',
    'builder.questionPlaceholder': 'Question',
    'builder.tooltip.duplicateQuestion': 'Dupliquer la question',
    'builder.tooltip.deleteQuestion': 'Supprimer la question',
    'builder.tooltip.addCategory': 'Ajouter une catégorie',
    'builder.required': 'Obligatoire',
    'builder.optionLabelPlaceholder': 'Libellé de l’option',
    'builder.addOption': 'Ajouter une option',
    'builder.advancedSettings': 'Paramètres avancés',
    'builder.placeholderPlaceholder': 'Placeholder',
    'builder.helpTextPlaceholder': 'Texte d’aide',
    'builder.minPlaceholder': 'Min',
    'builder.maxPlaceholder': 'Max',
    'builder.stepPlaceholder': 'Pas',
    'builder.multiple': 'Multiple',
    'builder.acceptedExtensionsPlaceholder': 'Extensions acceptées (.pdf,.png)',
    'builder.conditions': 'Conditions',
    'builder.addCondition': 'Ajouter une condition',
    'builder.condition.action.show': 'Afficher',
    'builder.condition.action.hide': 'Masquer',
    'builder.condition.action.skip': 'Passer',
    'builder.condition.action.require': 'Rendre obligatoire',
    'builder.condition.action.disable': 'Désactiver',
    'builder.condition.match.all': 'Toutes',
    'builder.condition.match.any': 'Au moins une',
    'builder.condition.operator.eq': 'Égal à',
    'builder.condition.operator.neq': 'Différent de',
    'builder.condition.operator.in': 'Dans',
    'builder.condition.operator.not_in': 'Pas dans',
    'builder.condition.operator.gt': 'Supérieur à',
    'builder.condition.operator.gte': 'Supérieur ou égal à',
    'builder.condition.operator.lt': 'Inférieur à',
    'builder.condition.operator.lte': 'Inférieur ou égal à',
    'builder.condition.operator.contains': 'Contient',
    'builder.condition.operator.not_contains': 'Ne contient pas',
    'builder.condition.operator.is_empty': 'Est vide',
    'builder.condition.operator.not_empty': 'N’est pas vide',
    'builder.valuePlaceholder': 'Valeur',
    'builder.remove': 'Retirer',
    'builder.addClause': 'Ajouter une clause',
    'builder.deleteCondition': 'Supprimer la condition',
    'builder.rail.addQuestion': 'Ajouter une question',
    'builder.rail.addPage': 'Ajouter une page',
    'builder.loadingBuilder': 'Chargement du builder...',
    'builder.error.loadForm': 'Échec du chargement du formulaire',
    'builder.error.save': 'Échec de la sauvegarde',
    'builder.error.publish': 'Échec de la publication',
    'builder.error.unpublish': 'Échec de la dépublication',
    'builder.error.categoryCreate': 'Échec de la création de catégorie',
    'builder.toast.saveSuccess': 'Formulaire sauvegardé',
    'builder.toast.publishSuccess': 'Formulaire publié',
    'builder.toast.unpublishSuccess': 'Formulaire dépublié',
    'builder.optionDefaultLabel': 'Option',
    'builder.optionsCount': '{count} options',
    'builder.categoryModal.title': 'Créer une catégorie',
    'builder.categoryModal.description': 'Ajoutez une catégorie et assignez-la à ce formulaire.',
    'builder.categoryModal.nameLabel': 'Nom',
    'builder.categoryModal.namePlaceholder': 'Nom de la catégorie',
    'builder.categoryModal.nameRequired': 'Le nom de la catégorie est requis',
    'builder.categoryModal.descriptionLabel': 'Description',
    'builder.categoryModal.descriptionPlaceholder': 'Description (optionnel)',
    'builder.categoryModal.activeLabel': 'Catégorie active',
    'builder.categoryModal.cancel': 'Annuler',
    'builder.categoryModal.create': 'Créer la catégorie',
    'renderer.submit': 'Envoyer',
    'renderer.loadingForm': 'Chargement du formulaire',
    'renderer.error.loadForm': 'Impossible de charger le formulaire',
    'renderer.error.submit': 'Échec de l’envoi',
    'renderer.error.missingFormKey': 'Clé du formulaire manquante',
    'renderer.alert.fixFields': 'Veuillez corriger les champs suivants',
    'renderer.alert.submitted': 'Formulaire envoyé',
    'renderer.pageTitle': 'Page {index}',
    'renderer.navigation.previous': 'Précédent',
    'renderer.navigation.next': 'Suivant',
    'response.loading': 'Chargement de la réponse',
    'response.empty': 'Aucune donnée de réponse disponible',
    'response.error.missingResponseUuid': 'UUID de réponse requis',
    'response.error.missingFormKey': 'Clé du formulaire requise',
    'response.error.load': 'Impossible de charger la réponse',
    'response.error.loadForm': 'Impossible de charger le schéma du formulaire',
    'response.page.fallback': 'Page {index}',
    'response.question.fallback': 'Question {index}',
    'response.answer.empty': 'Aucune réponse',
    'response.answer.yes': 'Oui',
    'response.answer.no': 'Non',
    'response.action.preview': 'Aperçu',
    'response.action.download': 'Télécharger',
    'response.file.unnamed': 'Fichier',
    'response.file.missingUrlHint': 'URL de fichier indisponible. Activez FORMFORGE_HTTP_FILE_URLS_ENABLED dans la configuration FormForge.'
  }
} as const

type FormForgeTranslationKey = keyof typeof TRANSLATIONS.en

function normalizeLocale(locale: string | undefined): FormForgeLocale {
  if (locale === undefined || locale === '') {
    return 'en'
  }

  const lowered = locale.toLowerCase()
  if (lowered.startsWith('fr')) {
    return 'fr'
  }

  return 'en'
}

function readRuntimeLocale(value: FormForgeJsonValue | undefined): string | undefined {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return undefined
  }

  const locale = (value as FormForgeJsonObject).locale
  return typeof locale === 'string' ? locale : undefined
}

function resolveLocaleOption(locale: UseFormForgeI18nOptions['locale']): string | undefined {
  if (typeof locale === 'function') {
    return locale()
  }

  return locale
}

function readNuxtI18nLocale(value: unknown): string | undefined {
  if (value === null || typeof value !== 'object') {
    return undefined
  }

  if ('locale' in value) {
    const localeValue = (value as { locale?: unknown }).locale

    if (typeof localeValue === 'string') {
      return localeValue
    }

    if (localeValue !== null && typeof localeValue === 'object' && 'value' in localeValue) {
      const refValue = (localeValue as { value?: unknown }).value
      if (typeof refValue === 'string') {
        return refValue
      }
    }
  }

  if ('global' in value) {
    const globalValue = (value as { global?: unknown }).global
    if (globalValue !== null && typeof globalValue === 'object' && 'locale' in globalValue) {
      const localeValue = (globalValue as { locale?: unknown }).locale

      if (typeof localeValue === 'string') {
        return localeValue
      }

      if (localeValue !== null && typeof localeValue === 'object' && 'value' in localeValue) {
        const refValue = (localeValue as { value?: unknown }).value
        if (typeof refValue === 'string') {
          return refValue
        }
      }
    }
  }

  return undefined
}

function interpolate(template: string, values?: FormForgeTranslationValues): string {
  if (values === undefined) {
    return template
  }

  return template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (token, key: string) => {
    const value = values[key]
    return value === undefined ? token : String(value)
  })
}

export function useFormForgeI18n(options: UseFormForgeI18nOptions = {}) {
  const runtimeConfig = useRuntimeConfig()
  const nuxtApp = useNuxtApp()

  const locale = computed<FormForgeLocale>(() => {
    const nuxtLocale = readNuxtI18nLocale((nuxtApp as { $i18n?: unknown }).$i18n)
    const runtimeLocale = readRuntimeLocale((runtimeConfig.public as FormForgeJsonObject | undefined)?.formforge)
    const optionLocale = resolveLocaleOption(options.locale)
    return normalizeLocale(optionLocale ?? nuxtLocale ?? runtimeLocale)
  })

  function t(key: FormForgeTranslationKey, values?: FormForgeTranslationValues): string {
    const table = TRANSLATIONS[locale.value]
    const fallbackTable = TRANSLATIONS.en
    const template = table[key] ?? fallbackTable[key] ?? key
    return interpolate(template, values)
  }

  return {
    locale,
    t
  }
}
