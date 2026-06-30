import type {
  FormForgeFieldValidationConfig,
  FormForgeFieldValidationOperator
} from '../types'

export type FormForgeValidationMode = 'text' | 'address' | 'temporal'

const TEXT_TO_TEMPORAL_OPERATOR_MAP: Record<string, FormForgeFieldValidationOperator> = {
  min: 'after',
  max: 'before'
}

const TEMPORAL_TO_TEXT_OPERATOR_MAP: Record<string, FormForgeFieldValidationOperator> = {
  after: 'min',
  before: 'max',
  between: 'min',
  not_between: 'max'
}

export function normalizeFormForgeValidationOperator(
  operator: FormForgeFieldValidationOperator,
  mode: FormForgeValidationMode
): FormForgeFieldValidationOperator {
  if (mode === 'temporal') {
    return TEXT_TO_TEMPORAL_OPERATOR_MAP[operator] ?? operator
  }

  return TEMPORAL_TO_TEXT_OPERATOR_MAP[operator] ?? operator
}

export function normalizeFormForgeValidationConfig(
  config: FormForgeFieldValidationConfig,
  mode: FormForgeValidationMode
): FormForgeFieldValidationConfig {
  let mutated = false
  const nextRules = config.rules.map((rule) => {
    const operator = normalizeFormForgeValidationOperator(rule.operator, mode)
    if (operator !== rule.operator) {
      mutated = true
    }

    return operator === rule.operator
      ? rule
      : {
          ...rule,
          operator
        }
  })

  if (!mutated) {
    return config
  }

  return {
    ...config,
    rules: nextRules
  }
}
