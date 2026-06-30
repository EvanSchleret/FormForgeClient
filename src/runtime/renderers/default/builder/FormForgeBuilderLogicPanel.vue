<script setup lang="ts">
import { useFormForgeI18n } from '../../../composables/useFormForgeI18n'
import type {
  FormForgeFieldSchema,
  FormForgePageLogicClause,
  FormForgePageLogicRule,
  FormForgePageLogicOperator,
  FormForgePageSchema
} from '../../../types'
import {
  createPageLogicRule,
  createPageLogicThen,
  ensurePageLogic,
  findFieldByKey,
  getFuturePageQuestions,
  isChoiceFieldType,
  isConsentFieldType,
  pageLogicOperatorRequiresValue,
  pageLogicOperatorsForFieldType
} from '../../../utils/page-logic'

interface Props {
  page: FormForgePageSchema
  pages: FormForgePageSchema[]
  pageIndex: number
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const logic = ensurePageLogic(props.page)
const { t } = useFormForgeI18n()

function logicMatchItems(): Array<{ label: string, value: 'all' | 'any' }> {
  return [
    { label: t('builder.logic.match.all'), value: 'all' },
    { label: t('builder.logic.match.any'), value: 'any' }
  ]
}

function logicFallbackActionItems(): Array<{ label: string, value: 'next' | 'goto_block' }> {
  return [
    { label: t('builder.logic.fallback.next'), value: 'next' },
    { label: t('builder.logic.fallback.goto'), value: 'goto_block' }
  ]
}

function fieldItems(): Array<{ label: string, value: string }> {
  return props.page.fields.map((field) => ({
    label: field.label === undefined || field.label === '' ? field.field_key : field.label,
    value: field.field_key
  }))
}

function futureQuestionItems(): Array<{ label: string, value: string }> {
  return getFuturePageQuestions(props.pages, props.pageIndex).map((field) => ({
    label: field.label === undefined || field.label === '' ? field.field_key : field.label,
    value: field.field_key
  }))
}

function futureBlockItems(): Array<{ label: string, value: number }> {
  return props.pages
    .slice(props.pageIndex + 1)
    .map((page, index) => ({
      label: t('builder.logic.destinationBlockLabel', {
        index: props.pageIndex + index + 2
      }),
      value: props.pageIndex + index + 2
    }))
}

function logicRuleOperatorItems(field: FormForgeFieldSchema | undefined): Array<{ label: string, value: string }> {
  if (field === undefined) {
    return []
  }

  return pageLogicOperatorsForFieldType(field.type).map((operator) => ({
    label: logicOperatorLabel(operator),
    value: operator
  }))
}

function logicClauseOperator(field: FormForgeFieldSchema | undefined, operator: string): FormForgePageLogicOperator {
  const items = logicRuleOperatorItems(field)
  const available = new Set(items.map((item) => item.value))

  if (available.has(operator)) {
    return operator as FormForgePageLogicOperator
  }

  return (items[0]?.value ?? operator) as FormForgePageLogicOperator
}

function defaultLogicOperatorForField(field: FormForgeFieldSchema | undefined): FormForgePageLogicOperator {
  return (logicRuleOperatorItems(field)[0]?.value ?? 'eq') as FormForgePageLogicOperator
}

function logicOperatorLabel(operator: string): string {
  const labels: Record<string, string> = {
    eq: t('builder.logic.operator.eq'),
    neq: t('builder.logic.operator.neq'),
    contains: t('builder.logic.operator.contains'),
    not_contains: t('builder.logic.operator.not_contains'),
    starts_with: t('builder.logic.operator.starts_with'),
    not_starts_with: t('builder.logic.operator.not_starts_with'),
    ends_with: t('builder.logic.operator.ends_with'),
    not_ends_with: t('builder.logic.operator.not_ends_with'),
    is_submitted: t('builder.logic.operator.is_submitted'),
    is_not_submitted: t('builder.logic.operator.is_not_submitted'),
    accepted: t('builder.logic.operator.accepted'),
    ignored: t('builder.logic.operator.ignored')
  }

  return labels[operator] ?? operator
}

function logicClauseRequiresValue(clause: FormForgePageLogicClause): boolean {
  const field = findFieldByKey(props.page, clause.field_key)

  if (field === undefined) {
    return true
  }

  return pageLogicOperatorRequiresValue(field.type, clause.operator)
}

function logicClauseChoiceItems(clause: FormForgePageLogicClause): Array<{ label: string, value: string | number | boolean | null }> {
  const field = findFieldByKey(props.page, clause.field_key)

  if (field === undefined || !Array.isArray(field.options)) {
    return []
  }

  return field.options.map((option, index) => ({
    label: typeof option === 'object' && option !== null && 'label' in option && typeof option.label === 'string' && option.label !== ''
      ? option.label
      : t('builder.optionPlaceholder', { index: index + 1 }),
    value: typeof option === 'object' && option !== null && 'value' in option ? option.value : option
  }))
}

function logicClauseConsentItems(): Array<{ label: string, value: boolean }> {
  return [
    { label: t('builder.logic.consent.accepted'), value: true },
    { label: t('builder.logic.consent.ignored'), value: false }
  ]
}

function thenActionItems(): Array<{ label: string, value: 'require' | 'goto_block' }> {
  return [
    { label: t('builder.logic.then.require'), value: 'require' },
    { label: t('builder.logic.then.goto'), value: 'goto_block' }
  ]
}

function addLogicRule(): void {
  logic.rules.push(createPageLogicRule())
}

function addThenAction(rule: FormForgePageLogicRule): void {
  rule.then.push(createPageLogicThen())
}

function removeThenAction(rule: FormForgePageLogicRule, thenIndex: number): void {
  if (rule.then.length <= 1) {
    return
  }

  rule.then.splice(thenIndex, 1)
}

function setThenAction(rule: FormForgePageLogicRule, thenIndex: number, action: 'require' | 'goto_block'): void {
  const thenAction = rule.then[thenIndex]
  if (thenAction === undefined) {
    return
  }

  thenAction.action = action

  if (action === 'require') {
    thenAction.block_index = null
    if (typeof thenAction.field_key !== 'string') {
      thenAction.field_key = null
    }
    return
  }

  thenAction.field_key = null
}

function thenTargetItems(action: 'require' | 'goto_block'): Array<{ label: string, value: string | number }> {
  return action === 'require' ? futureQuestionItems() : futureBlockItems()
}

function thenTargetPlaceholder(action: 'require' | 'goto_block'): string {
  return action === 'require'
    ? t('builder.logic.requireQuestionPlaceholder')
    : t('builder.logic.gotoBlockPlaceholder')
}

function usedRequiredFieldKeys(rule: FormForgePageLogicRule, excludeIndex: number): Set<string> {
  const keys = new Set<string>()

  for (const [index, thenAction] of rule.then.entries()) {
    if (index === excludeIndex) {
      continue
    }

    if (thenAction.action === 'require' && typeof thenAction.field_key === 'string' && thenAction.field_key !== '') {
      keys.add(thenAction.field_key)
    }
  }

  return keys
}

function availableThenQuestionItems(rule: FormForgePageLogicRule, thenIndex: number): Array<{ label: string, value: string }> {
  const usedKeys = usedRequiredFieldKeys(rule, thenIndex)

  return futureQuestionItems().filter((item) => !usedKeys.has(item.value))
}

function addLogicClause(rule: FormForgePageLogicRule): void {
  rule.when.push({
    field_key: '',
    operator: 'eq',
    value: null
  })
}

function removeLogicClause(rule: FormForgePageLogicRule, clauseIndex: number): void {
  if (rule.when.length <= 1) {
    return
  }

  rule.when.splice(clauseIndex, 1)
}
</script>

<template>
  <div class="grid gap-4">
    <div class="flex items-center justify-between gap-3">
      <div class="text-sm">
        {{ logic.rules.length === 0 ? t('builder.logic.empty') : t('builder.logic.rulesCount', { count: logic.rules.length }) }}
      </div>
      <UButton
        color="neutral"
        variant="soft"
        icon="i-lucide-plus"
        :disabled="readonly"
        @click="addLogicRule"
      >
        {{ t('builder.logic.addRule') }}
      </UButton>
    </div>

    <UCard
      v-for="rule in logic.rules"
      :key="rule.rule_key"
      :ui="{
        body: 'grid gap-4'
      }"
    >
      <div class="grid gap-2">
        <span class="text-sm font-bold text-default">
          {{ t('builder.logic.rule') }}
        </span>
        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <USelect
            v-model="rule.match"
            :items="logicMatchItems()"
            :disabled="readonly"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            :disabled="readonly"
            @click="logic.rules = logic.rules.filter((candidate: FormForgePageLogicRule) => candidate.rule_key !== rule.rule_key)"
          />
        </div>
      </div>

      <div class="grid gap-3">
        <div
          v-for="(clause, clauseIndex) in rule.when"
          :key="`${rule.rule_key}-${clauseIndex}`"
          class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] lg:items-center"
        >
          <USelect
            :model-value="clause.field_key"
            :items="fieldItems()"
            :disabled="readonly"
            @update:model-value="(value: string) => {
              const field = findFieldByKey(props.page, value)
              clause.field_key = value
              clause.operator = defaultLogicOperatorForField(field)
              clause.value = null
            }"
          />
          <USelect
            :model-value="logicClauseOperator(findFieldByKey(props.page, clause.field_key), clause.operator)"
            :items="logicRuleOperatorItems(findFieldByKey(props.page, clause.field_key))"
            :disabled="readonly"
            @update:model-value="(value: string) => {
              clause.operator = value as FormForgePageLogicClause['operator']
              if (!logicClauseRequiresValue(clause)) {
                clause.value = null
              }
            }"
          />
          <USelectMenu
            v-if="logicClauseRequiresValue(clause) && findFieldByKey(props.page, clause.field_key) !== undefined && isChoiceFieldType(findFieldByKey(props.page, clause.field_key)!.type)"
            :model-value="clause.value"
            :items="logicClauseChoiceItems(clause)"
            :disabled="readonly"
            @update:model-value="(value: unknown) => { clause.value = value as FormForgePageLogicClause['value'] }"
          />
          <USelect
            v-else-if="logicClauseRequiresValue(clause) && findFieldByKey(props.page, clause.field_key) !== undefined && isConsentFieldType(findFieldByKey(props.page, clause.field_key)!.type)"
            :model-value="clause.value"
            :items="logicClauseConsentItems()"
            :disabled="readonly"
            @update:model-value="(value: boolean) => { clause.value = value }"
          />
          <UInput
            v-else-if="logicClauseRequiresValue(clause)"
            :model-value="typeof clause.value === 'string' ? clause.value : String(clause.value ?? '')"
            :disabled="readonly"
            :placeholder="t('builder.logic.valuePlaceholder')"
            @update:model-value="(value: string) => { clause.value = value }"
          />
          <div v-else />

          <UButton
            color="neutral"
            variant="soft"
            :disabled="readonly || rule.when.length <= 1"
            @click="removeLogicClause(rule, clauseIndex)"
          >
            {{ t('builder.remove') }}
          </UButton>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          :disabled="readonly"
          @click="addLogicClause(rule)"
        >
          {{ t('builder.logic.addClause') }}
        </UButton>
      </div>

      <div class="grid gap-2">
        <span class="text-sm font-bold text-default">{{ t('builder.logic.then') }}</span>
        <div class="grid gap-3">
          <div
            v-for="(thenAction, thenIndex) in rule.then"
            :key="`${rule.rule_key}-${thenIndex}`"
            class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center"
          >
            <USelect
              :model-value="thenAction.action"
              :items="thenActionItems()"
              :disabled="readonly"
              @update:model-value="(value: 'require' | 'goto_block') => setThenAction(rule, thenIndex, value)"
            />
            <USelectMenu
              v-if="thenAction.action === 'require'"
              v-model="thenAction.field_key"
              :items="availableThenQuestionItems(rule, thenIndex)"
              value-key="value"
              label-key="label"
              :search-input="false"
              :disabled="readonly"
              :placeholder="thenTargetPlaceholder('require')"
            />
            <USelectMenu
              v-else
              v-model="thenAction.block_index"
              :items="thenTargetItems('goto_block')"
              value-key="value"
              label-key="label"
              :search-input="false"
              :disabled="readonly"
              :placeholder="thenTargetPlaceholder('goto_block')"
            />
            <UButton
              color="neutral"
              variant="soft"
              :disabled="readonly || rule.then.length <= 1"
              @click="removeThenAction(rule, thenIndex)"
            >
              {{ t('builder.remove') }}
            </UButton>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-plus"
            :disabled="readonly"
            @click="addThenAction(rule)"
          >
            {{ t('builder.logic.then.addAction') }}
          </UButton>
        </div>
      </div>

      <div class="grid gap-2">
        <span class="text-sm font-bold text-default">{{ t('builder.logic.fallback') }}</span>
        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <USelect
            v-model="rule.fallback.action"
            :items="logicFallbackActionItems()"
            :disabled="readonly"
          />
          <USelectMenu
            v-if="rule.fallback.action === 'goto_block'"
            v-model="rule.fallback.block_index"
            :items="futureBlockItems()"
            value-key="value"
            label-key="label"
            :search-input="false"
            :disabled="readonly"
            :placeholder="t('builder.logic.gotoBlockPlaceholder')"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
