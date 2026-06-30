import { describe, expect, it } from 'vitest'
import { sanitizeFormForgeInlineRichText, sanitizeFormForgeRichText } from '../src/runtime/utils/rich-text'

describe('sanitizeFormForgeRichText', () => {
  it('keeps supported formatting and strips unsafe links and scripts', () => {
    const sanitized = sanitizeFormForgeRichText(
      '<p>Hello <strong>world</strong> <script>alert(1)</script><a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a></p>'
    )

    expect(sanitized).toContain('<p>')
    expect(sanitized).toContain('<strong>world</strong>')
    expect(sanitized).toContain('<a href="https://example.com">good</a>')
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).not.toContain('javascript:alert(1)')
    expect(sanitized).not.toContain('</a></a>')
  })

  it('renders labels inline by stripping paragraph tags', () => {
    expect(sanitizeFormForgeInlineRichText('<p>Prénom</p>')).toBe('Prénom')
    expect(sanitizeFormForgeInlineRichText('<p><strong>Prénom</strong></p>')).toBe('<strong>Prénom</strong>')
  })
})
