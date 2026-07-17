export function resolveFormForgeSubmitVisibility(
  showSubmit: boolean | undefined,
  usesExternalModel: boolean
): boolean {
  return showSubmit ?? !usesExternalModel
}
