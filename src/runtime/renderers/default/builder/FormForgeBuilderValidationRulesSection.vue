<script setup lang="ts">
import { toRef } from '#imports'
import { parseDate, parseTime } from '@internationalized/date'
import type { DateValue, Time } from '@internationalized/date'
import { useFormForgeI18n } from '../../../composables/useFormForgeI18n'
import { normalizeFormForgeValidationConfig } from '../../../utils/validation'
import type {
  FormForgeFieldSchema,
  FormForgeFieldValidationConfig,
  FormForgeFieldValidationMatch,
  FormForgeFieldValidationOperator,
  FormForgeFieldValidationRule,
  FormForgeTemporalValidationRangeValue,
  FormForgeTemporalMode
} from '../../../types'
import { defaultAddressFields } from './builderFieldHelpers'

interface Props {
  field: FormForgeFieldSchema
  readonly?: boolean
  mode: 'text' | 'address' | 'temporal'
  temporalMode?: FormForgeTemporalMode
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  temporalMode: undefined
})

const field = toRef(props, 'field')
const { t, locale } = useFormForgeI18n()

function fieldMeta(): Record<string, unknown> {
  if (typeof field.value.meta !== 'object' || field.value.meta === null || Array.isArray(field.value.meta)) {
    field.value.meta = {}
  }

  return field.value.meta as Record<string, unknown>
}

function isValidationConfig(value: unknown): value is FormForgeFieldValidationConfig {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && ((value as FormForgeFieldValidationConfig).match === 'all' || (value as FormForgeFieldValidationConfig).match === 'any')
    && Array.isArray((value as FormForgeFieldValidationConfig).rules)
}

function isTemporalRangeValidationValue(value: unknown): value is FormForgeTemporalValidationRangeValue {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && ('start' in value || 'end' in value)
}

function isTemporalRangeValidationOperator(operator: FormForgeFieldValidationOperator): boolean {
  return operator === 'between' || operator === 'not_between'
}

function validationConfig(): FormForgeFieldValidationConfig | null {
  const candidate = fieldMeta().validation
  if (!isValidationConfig(candidate)) {
    return null
  }

  const normalized = normalizeFormForgeValidationConfig(candidate, props.mode)
  if (normalized !== candidate) {
    fieldMeta().validation = normalized
  }

  return normalized
}

function validationModeLabel(): string {
  if (props.mode === 'address') {
    return t('builder.addressFields')
  }

  if (props.mode === 'temporal') {
    if (props.temporalMode === 'time') {
      return t('builder.temporalMode.time')
    }

    return t('builder.temporalMode.date')
  }

  if (field.value.type === 'number') {
    return t('builder.validation.target.number')
  }

  return t('builder.validation.target.text')
}

function isValidationEnabled(): boolean {
  return validationConfig() !== null
}

function isTextValidationMode(): boolean {
  return props.mode === 'text' || props.mode === 'address'
}

function isTemporalValidationMode(): boolean {
  return props.mode === 'temporal'
}

function readNumber(value: number | string | null | undefined, fallback: number): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string' && value !== '') {
    const parsed = Number.parseFloat(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return fallback
}

function createValidationRule(operator: FormForgeFieldValidationOperator, value: string | number | null, target: string | null = null): FormForgeFieldValidationRule {
  return {
    validation_key: `vr_${Math.random().toString(36).slice(2, 8)}`,
    target,
    operator,
    value,
    unit: operator === 'min' || operator === 'max' ? 'characters' : null
  }
}

function createTemporalValidationRule(operator: FormForgeFieldValidationOperator): FormForgeFieldValidationRule {
  if (isTemporalRangeValidationOperator(operator)) {
    return {
      validation_key: `vr_${Math.random().toString(36).slice(2, 8)}`,
      target: null,
      operator,
      value: {
        start: null,
        end: null
      },
      unit: null
    }
  }

  return {
    validation_key: `vr_${Math.random().toString(36).slice(2, 8)}`,
    target: null,
    operator,
    value: null,
    unit: null
  }
}

function ensureValidationConfig(): FormForgeFieldValidationConfig {
  const existing = validationConfig()
  if (existing !== null) {
    return existing
  }

  const next: FormForgeFieldValidationConfig = {
    match: 'all',
    rules: [
      props.mode === 'temporal'
        ? createTemporalValidationRule('after')
        : createValidationRule(
            'min',
            readNumber(field.value.min, 0),
            props.mode === 'address' ? defaultAddressFields(locale.value)[0]?.key ?? 'line1' : null
          )
    ]
  }

  fieldMeta().validation = next
  return next
}

function clearValidationConfig(): void {
  const meta = fieldMeta()
  delete meta.validation
  field.value.min = null
  field.value.max = null
}

function setValidationEnabled(enabled: boolean): void {
  if (!isTextValidationMode() && !isTemporalValidationMode()) {
    return
  }

  if (!enabled) {
    clearValidationConfig()
    return
  }

  ensureValidationConfig()
}

function validationRuleItems(): Array<{ label: string, value: FormForgeFieldValidationOperator }> {
  if (props.mode === 'temporal') {
    return [
      { label: t('builder.validation.operator.after'), value: 'after' },
      { label: t('builder.validation.operator.before'), value: 'before' },
      { label: t('builder.validation.operator.between'), value: 'between' },
      { label: t('builder.validation.operator.notBetween'), value: 'not_between' }
    ]
  }

  return [
    { label: t('builder.validation.operator.min'), value: 'min' },
    { label: t('builder.validation.operator.max'), value: 'max' },
    { label: t('builder.validation.operator.regex'), value: 'regex' },
    { label: t('builder.validation.operator.eq'), value: 'eq' },
    { label: t('builder.validation.operator.neq'), value: 'neq' },
    { label: t('builder.validation.operator.contains'), value: 'contains' },
    { label: t('builder.validation.operator.notContains'), value: 'not_contains' }
  ]
}

function validationTargetItems(): Array<{ label: string, value: string }> {
  if (props.mode !== 'address') {
    return []
  }

  const addressFields = Array.isArray(field.value.address_fields) && field.value.address_fields.length > 0
    ? field.value.address_fields
    : defaultAddressFields(locale.value)

  return addressFields
    .filter((addressField) => addressField.visible)
    .map((addressField) => ({
      label: addressField.label,
      value: addressField.key
    }))
}

function validationRuleTarget(rule: FormForgeFieldValidationRule): string {
  if (typeof rule.target === 'string' && rule.target !== '') {
    return rule.target
  }

  return validationTargetItems()[0]?.value ?? 'line1'
}

function validationMatchItems(): Array<{ label: string, value: FormForgeFieldValidationMatch }> {
  return [
    { label: t('builder.validation.match.all'), value: 'all' },
    { label: t('builder.validation.match.any'), value: 'any' }
  ]
}

function validationRules(): FormForgeFieldValidationRule[] {
  return validationConfig()?.rules ?? []
}

function isValidationRuleNumeric(rule: FormForgeFieldValidationRule): boolean {
  return rule.operator === 'min' || rule.operator === 'max'
}

function validationRuleValue(rule: FormForgeFieldValidationRule): string {
  if (typeof rule.value === 'number' || typeof rule.value === 'string') {
    return String(rule.value)
  }

  if (isTemporalRangeValidationValue(rule.value)) {
    return rule.value.start ?? ''
  }

  return ''
}

function validationRuleNumericValue(rule: FormForgeFieldValidationRule): number {
  if (typeof rule.value === 'number') {
    return rule.value
  }

  if (typeof rule.value === 'string' && rule.value !== '') {
    const parsed = Number.parseFloat(rule.value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return 0
}

function parseTemporalValue(value: string | null): DateValue | Time | undefined {
  if (value === null || value === '') {
    return undefined
  }

  try {
    if (props.temporalMode === 'time') {
      return parseTime(value)
    }

    return parseDate(value)
  } catch {
    return undefined
  }
}

function validationRuleTemporalValue(rule: FormForgeFieldValidationRule): DateValue | Time | undefined {
  if (isTemporalRangeValidationValue(rule.value)) {
    return parseTemporalValue(rule.value.start ?? rule.value.end ?? null)
  }

  return parseTemporalValue(typeof rule.value === 'string' ? rule.value : null)
}

function validationRuleTemporalRangeState(rule: FormForgeFieldValidationRule): FormForgeTemporalValidationRangeValue {
  if (isTemporalRangeValidationValue(rule.value)) {
    return {
      start: rule.value.start ?? null,
      end: rule.value.end ?? null
    }
  }

  return {
    start: typeof rule.value === 'string' ? rule.value : null,
    end: null
  }
}

function validationRuleTemporalRangeStartValue(rule: FormForgeFieldValidationRule): DateValue | Time | undefined {
  const range = validationRuleTemporalRangeState(rule)
  return parseTemporalValue(range.start)
}

function validationRuleTemporalRangeEndValue(rule: FormForgeFieldValidationRule): DateValue | Time | undefined {
  const range = validationRuleTemporalRangeState(rule)
  return parseTemporalValue(range.end)
}

function serializeTemporalValue(value: DateValue | Time | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }

  return value.toString()
}

function validationRulePlaceholder(operator: FormForgeFieldValidationOperator): string {
  if (operator === 'regex') {
    return '^[A-Z].*'
  }

  return t('builder.validation.valuePlaceholder')
}

function validationRuleUnitItems(rule: FormForgeFieldValidationRule): Array<{ label: string, value: 'characters' }> {
  if (rule.operator !== 'min' && rule.operator !== 'max') {
    return []
  }

  return [
    { label: t('builder.validation.unit.characters'), value: 'characters' }
  ]
}

function updateValidationMatch(value: FormForgeFieldValidationMatch): void {
  ensureValidationConfig().match = value
}

function setValidationRuleValue(rule: FormForgeFieldValidationRule, value: string): void {
  if (isValidationRuleNumeric(rule)) {
    const parsed = Number.parseFloat(value)
    rule.value = Number.isNaN(parsed) ? 0 : parsed

    if (props.mode !== 'address') {
      const config = ensureValidationConfig()
      const minRule = config.rules.find((candidate) => candidate.operator === 'min')
      const maxRule = config.rules.find((candidate) => candidate.operator === 'max')
      field.value.min = minRule === undefined ? null : Number(minRule.value)
      field.value.max = maxRule === undefined ? null : Number(maxRule.value)
    }

    return
  }

  rule.value = value
}

function setValidationRuleTemporalValue(rule: FormForgeFieldValidationRule, value: DateValue | Time | null | undefined): void {
  rule.value = serializeTemporalValue(value)
}

function setValidationRuleTemporalRangeValue(rule: FormForgeFieldValidationRule, key: keyof FormForgeTemporalValidationRangeValue, value: DateValue | Time | null | undefined): void {
  const current = validationRuleTemporalRangeState(rule)
  rule.value = {
    ...current,
    [key]: serializeTemporalValue(value)
  }
}

function setValidationRuleTarget(rule: FormForgeFieldValidationRule, target: string): void {
  rule.target = target
}

function setValidationRuleOperator(rule: FormForgeFieldValidationRule, operator: FormForgeFieldValidationOperator): void {
  rule.operator = operator
  rule.unit = operator === 'min' || operator === 'max' ? 'characters' : null

  if (props.mode === 'temporal') {
    if (isTemporalRangeValidationOperator(operator)) {
      rule.value = isTemporalRangeValidationValue(rule.value)
        ? rule.value
        : {
            start: validationRuleValue(rule) || null,
            end: null
          }
      return
    }

    if (isTemporalRangeValidationValue(rule.value)) {
      rule.value = rule.value.start ?? rule.value.end ?? null
    }

    return
  }

  if (isValidationRuleNumeric(rule)) {
    rule.value = validationRuleNumericValue(rule)
  }

  if (props.mode !== 'address') {
    const config = ensureValidationConfig()
    const minRule = config.rules.find((candidate) => candidate.operator === 'min')
    const maxRule = config.rules.find((candidate) => candidate.operator === 'max')
    field.value.min = minRule === undefined ? null : Number(minRule.value)
    field.value.max = maxRule === undefined ? null : Number(maxRule.value)
  }
}

function addValidationRule(afterIndex: number): void {
  const config = ensureValidationConfig()
  const nextRule = props.mode === 'temporal'
    ? createTemporalValidationRule('after')
    : createValidationRule('contains', '')

  config.rules.splice(afterIndex + 1, 0, nextRule)
}

function removeValidationRule(ruleIndex: number): void {
  const config = validationConfig()
  if (config === null) {
    return
  }

  if (config.rules.length <= 1) {
    clearValidationConfig()
    return
  }

  config.rules.splice(ruleIndex, 1)
}

function validationDescription(): string {
  if (props.mode === 'temporal') {
    return t('builder.validation.dateDescription')
  }

  return t('builder.validationRulesDescription')
}
</script>

<template>
  <div class="grid gap-4">
    <UCard
      v-if="mode === 'text'"
      :ui="{ body: 'grid gap-4' }"
    >
      <div class="grid gap-4">
        <div class="flex items-start justify-between gap-4">
          <div class="grid gap-1">
            <span class="text-sm font-medium text-default">{{ t('builder.longResponse') }}</span>
            <p class="text-sm text-muted">
              {{ t('builder.longResponseDescription') }}
            </p>
          </div>
          <USwitch
            :model-value="field.type === 'textarea'"
            :disabled="readonly"
            @update:model-value="(value: boolean) => {
              if (field.type === 'text' || field.type === 'textarea') {
                field.type = value ? 'textarea' : 'text'
              }
            }"
          />
        </div>

        <div class="flex items-start justify-between gap-4">
          <div class="grid gap-1">
            <span class="text-sm font-medium text-default">{{ t('builder.validationRules') }}</span>
            <p class="text-sm text-muted">
              {{ t('builder.validationRulesDescription') }}
            </p>
          </div>
          <USwitch
            :model-value="isValidationEnabled()"
            :disabled="readonly"
            @update:model-value="(value: boolean) => setValidationEnabled(value)"
          />
        </div>
      </div>
    </UCard>

    <UCard
      v-if="mode === 'address' || mode === 'temporal' || mode === 'text'"
      :ui="{ body: 'grid gap-4' }"
    >
      <div
        v-if="mode === 'temporal'"
        class="flex items-center justify-between gap-4"
      >
        <div class="grid gap-1">
          <span class="text-sm font-medium text-default">
            {{ t('builder.temporalHourCycle.label') }}
          </span>
          <p class="text-sm text-muted">
            {{ t('builder.temporalHourCycle.description') }}
          </p>
        </div>
        <USwitch
          :model-value="props.field.hour_cycle !== 12"
          :disabled="readonly"
          :aria-label="t('builder.temporalHourCycle.label')"
          @update:model-value="(value: boolean) => { field.hour_cycle = value ? 24 : 12 }"
        />
      </div>

      <div class="flex items-start justify-between gap-4">
        <div class="grid gap-1">
          <span class="text-sm font-medium text-default">{{ t('builder.validationRules') }}</span>
          <p class="text-sm text-muted">
            {{ validationDescription() }}
          </p>
        </div>
        <USwitch
          :model-value="isValidationEnabled()"
          :disabled="readonly"
          @update:model-value="(value: boolean) => setValidationEnabled(value)"
        />
      </div>

      <div
        v-if="isValidationEnabled()"
        class="grid gap-4 border-t border-gray-200 pt-4 dark:border-white/10"
      >
        <div class="flex items-center gap-4">
          <div class="min-w-0 flex-1 grid gap-1">
            <span class="text-sm font-medium text-default">{{ t('builder.validationRules') }}</span>
            <p class="text-sm text-muted">
              {{ validationModeLabel() }}
            </p>
          </div>
          <div
            v-if="validationRules().length > 1"
            class="shrink-0"
          >
            <USelect
              :model-value="validationConfig()?.match ?? 'all'"
              :items="validationMatchItems()"
              :disabled="readonly"
              class="w-56"
              @update:model-value="(value: FormForgeFieldValidationMatch) => updateValidationMatch(value)"
            />
          </div>
        </div>

        <div class="grid gap-3">
          <div
            v-for="(rule, ruleIndex) in validationRules()"
            :key="rule.validation_key"
            class="flex flex-col gap-3 lg:flex-row lg:items-end"
          >
            <USelect
              v-if="mode === 'address'"
              :model-value="validationRuleTarget(rule)"
              :items="validationTargetItems()"
              :disabled="readonly"
              class="w-full lg:w-72 lg:shrink-0"
              @update:model-value="(value: string) => setValidationRuleTarget(rule, value)"
            />

            <USelect
              :model-value="rule.operator"
              :items="validationRuleItems()"
              :disabled="readonly"
              class="w-full lg:w-72 lg:shrink-0"
              @update:model-value="(value: FormForgeFieldValidationOperator) => setValidationRuleOperator(rule, value)"
            />

            <template v-if="mode === 'temporal'">
              <template v-if="isTemporalRangeValidationOperator(rule.operator)">
                <div class="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <div class="grid gap-1">
                    <span class="text-sm font-medium text-muted">
                      {{ t('builder.validation.rangeStart') }}
                    </span>
                    <UInputTime
                      v-if="temporalMode === 'time'"
                      :model-value="validationRuleTemporalRangeStartValue(rule)"
                      :disabled="readonly"
                      :hour-cycle="props.field.hour_cycle === 12 ? 12 : 24"
                      class="min-w-0"
                      @update:model-value="(value: Time | null | undefined) => setValidationRuleTemporalRangeValue(rule, 'start', value)"
                    />
                    <UInputDate
                      v-else
                      :model-value="validationRuleTemporalRangeStartValue(rule)"
                      :disabled="readonly"
                      class="min-w-0"
                      @update:model-value="(value: DateValue | null | undefined) => setValidationRuleTemporalRangeValue(rule, 'start', value)"
                    />
                  </div>

                  <div class="grid gap-1">
                    <span class="text-sm font-medium text-muted">
                      {{ t('builder.validation.rangeEnd') }}
                    </span>
                    <UInputTime
                      v-if="temporalMode === 'time'"
                      :model-value="validationRuleTemporalRangeEndValue(rule)"
                      :disabled="readonly"
                      :hour-cycle="props.field.hour_cycle === 12 ? 12 : 24"
                      class="min-w-0"
                      @update:model-value="(value: Time | null | undefined) => setValidationRuleTemporalRangeValue(rule, 'end', value)"
                    />
                    <UInputDate
                      v-else
                      :model-value="validationRuleTemporalRangeEndValue(rule)"
                      :disabled="readonly"
                      class="min-w-0"
                      @update:model-value="(value: DateValue | null | undefined) => setValidationRuleTemporalRangeValue(rule, 'end', value)"
                    />
                  </div>
                </div>
              </template>
              <template v-else>
                <UInputTime
                  v-if="temporalMode === 'time'"
                  :model-value="validationRuleTemporalValue(rule)"
                  :disabled="readonly"
                  :hour-cycle="props.field.hour_cycle === 12 ? 12 : 24"
                  class="min-w-0 flex-1"
                  @update:model-value="(value: Time | null | undefined) => setValidationRuleTemporalValue(rule, value)"
                />
                <UInputDate
                  v-else
                  :model-value="validationRuleTemporalValue(rule)"
                  :disabled="readonly"
                  class="min-w-0 flex-1"
                  @update:model-value="(value: DateValue | null | undefined) => setValidationRuleTemporalValue(rule, value)"
                />
              </template>
            </template>

            <template v-else-if="isValidationRuleNumeric(rule)">
              <UInputNumber
                :model-value="validationRuleNumericValue(rule)"
                :disabled="readonly"
                :placeholder="validationRulePlaceholder(rule.operator)"
                :min="0"
                class="min-w-0 flex-1"
                @update:model-value="(value: number | null) => setValidationRuleValue(rule, String(value ?? 0))"
              />
              <USelect
                :model-value="rule.unit ?? 'characters'"
                :items="validationRuleUnitItems(rule)"
                :disabled="readonly"
                class="w-full lg:w-40 lg:shrink-0"
                @update:model-value="(value: 'characters') => { rule.unit = value }"
              />
            </template>

            <template v-else>
              <UInput
                :model-value="validationRuleValue(rule)"
                :disabled="readonly"
                :placeholder="validationRulePlaceholder(rule.operator)"
                class="min-w-0 flex-1"
                @update:model-value="(value: string) => setValidationRuleValue(rule, value)"
              />
            </template>

            <div class="flex shrink-0 items-center justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-plus"
                :disabled="readonly"
                @click.stop="addValidationRule(ruleIndex)"
              />
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                :disabled="readonly"
                @click.stop="removeValidationRule(ruleIndex)"
              />
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
