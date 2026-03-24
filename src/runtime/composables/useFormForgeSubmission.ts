import { useFormForgeSubmit } from './useFormForgeSubmit'
import type { FormForgeSubmitOptions, UseFormForgeSubmitOptions } from './useFormForgeSubmit'

export type UseFormForgeSubmissionOptions = UseFormForgeSubmitOptions
export type FormForgeSubmissionOptions = FormForgeSubmitOptions

export function useFormForgeSubmission(options: UseFormForgeSubmissionOptions) {
  return useFormForgeSubmit(options)
}
