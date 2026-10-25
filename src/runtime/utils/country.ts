const FORM_FORGE_COUNTRY_CODES = `
  AF AL DZ AS AD AO AI AQ AG AR AM AW
  AU AT AZ BS BH BD BB BY BE BZ BJ BM
  BT BO BA BW BV BR IO BN BG BF BI KH
  CM CA CV KY CF TD CL CN CX CC CO KM
  CG CD CK CR CI HR CU CY CZ DK DJ DM
  DO EC EG SV GQ ER EE ET FK FO FJ FI
  FR GF PF TF GA GM GE DE GH GI GR GL
  GD GP GU GT GN GW GY HT HM VA HN HK
  HU IS IN ID IR IQ IE IL IT JM JP JO
  KZ KE KI KP KR KW KG LA LV LB LS LR
  LY LI LT LU MO MG MW MY MV ML MT MH
  MQ MR MU YT MX FM MD MC MN MS MA MZ
  MM NA NR NP NL NC NZ NI NE NG NU NF
  MP MK NO OM PK PW PS PA PG PY PE PH
  PN PL PT PR QA RE RO RU RW SH KN LC
  PM VC WS SM ST SA SN SC SL SG SK SI
  SB SO ZA GS ES LK SD SR SJ SZ SE CH
  SY TW TJ TZ TH TL TG TK TO TT TN TR
  TM TC TV UG UA AE GB US UM UY UZ VU
  VE VN VG VI WF EH YE ZM ZW AX BQ CW
  GG IM JE ME BL MF RS SX SS XK
`.trim().split(/\s+/)

const countryCodeSet = new Set(FORM_FORGE_COUNTRY_CODES)
const countryOptionsByLocale = new Map<string, FormForgeCountryOption[]>()
const countryCodesByNameByLocale = new Map<string, Map<string, string>>()

export interface FormForgeCountryOption {
  label: string
  value: string
}

function normalizeCountryName(value: string, locale: string): string {
  return value.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase(locale)
    .replace(/[\s\-’'().,]/g, '')
}

function createRegionDisplayNames(locale: string): Intl.DisplayNames | null {
  if (typeof Intl.DisplayNames !== 'function') {
    return null
  }

  return new Intl.DisplayNames([locale], { type: 'region' })
}

function countryCodesByName(locale: string): Map<string, string> {
  const cached = countryCodesByNameByLocale.get(locale)
  if (cached !== undefined) {
    return cached
  }

  const labels = new Map<string, string>()
  const displayNames = createRegionDisplayNames(locale)

  for (const code of FORM_FORGE_COUNTRY_CODES) {
    const name = displayNames?.of(code)
    if (name !== undefined) {
      labels.set(normalizeCountryName(name, locale), code)
    }
  }

  countryCodesByNameByLocale.set(locale, labels)
  return labels
}

export function getFormForgeCountryOptions(locale: string): FormForgeCountryOption[] {
  const resolvedLocale = locale.trim() || 'en'
  const cached = countryOptionsByLocale.get(resolvedLocale)
  if (cached !== undefined) {
    return cached
  }

  const displayNames = createRegionDisplayNames(resolvedLocale)
  const options = FORM_FORGE_COUNTRY_CODES
    .map((code) => ({
      label: displayNames?.of(code) ?? code,
      value: code
    }))
    .sort((left, right) => left.label.localeCompare(right.label, resolvedLocale))

  countryOptionsByLocale.set(resolvedLocale, options)
  return options
}

export function normalizeFormForgeCountryCode(value: string, locale: string): string | null {
  const trimmed = value.trim()
  if (trimmed === '') {
    return null
  }

  const normalizedCode = trimmed.toUpperCase()
  if (countryCodeSet.has(normalizedCode)) {
    return normalizedCode
  }

  const resolvedLocale = locale.trim() || 'en'
  const localizedCode = countryCodesByName(resolvedLocale).get(normalizeCountryName(trimmed, resolvedLocale))
  if (localizedCode !== undefined) {
    return localizedCode
  }

  return countryCodesByName('en').get(normalizeCountryName(trimmed, 'en')) ?? null
}

export function getFormForgeCountryName(value: string, locale: string): string {
  const countryCode = normalizeFormForgeCountryCode(value, locale)
  if (countryCode === null) {
    return value
  }

  const displayNames = createRegionDisplayNames(locale.trim() || 'en')
  return displayNames?.of(countryCode) ?? countryCode
}
