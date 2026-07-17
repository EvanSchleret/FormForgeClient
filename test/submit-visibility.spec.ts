import { describe, expect, it } from 'vitest'
import { resolveFormForgeSubmitVisibility } from '../src/runtime/utils/submit-visibility'

describe('resolveFormForgeSubmitVisibility', () => {
  it('hides the submit button in v-model mode by default', () => {
    expect(resolveFormForgeSubmitVisibility(undefined, true)).toBe(false)
  })

  it('shows the submit button when explicitly enabled in v-model mode', () => {
    expect(resolveFormForgeSubmitVisibility(true, true)).toBe(true)
  })

  it('hides the submit button when explicitly disabled', () => {
    expect(resolveFormForgeSubmitVisibility(false, false)).toBe(false)
  })

  it('shows the submit button by default without v-model', () => {
    expect(resolveFormForgeSubmitVisibility(undefined, false)).toBe(true)
  })
})
