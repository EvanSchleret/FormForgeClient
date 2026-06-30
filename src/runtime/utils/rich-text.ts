const ALLOWED_TAGS = new Set(['a', 'b', 'br', 'em', 'i', 'li', 'ol', 'p', 'strong', 'u', 'ul'])

function sanitizeHref(value: string): string | null {
  const href = value.trim()

  if (href === '') {
    return null
  }

  if (/^(https?:|mailto:|tel:|\/|#)/i.test(href)) {
    return href
  }

  return null
}

function sanitizeAttributes(tagName: string, rawAttributes: string): string {
  if (tagName !== 'a') {
    return ''
  }

  const hrefMatch = rawAttributes.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>`]+))/i)
  if (hrefMatch === null) {
    return ''
  }

  const hrefValue = hrefMatch[2] ?? hrefMatch[3] ?? hrefMatch[4] ?? ''
  const safeHref = sanitizeHref(hrefValue)

  if (safeHref === null) {
    return ''
  }

  return ` href="${safeHref.replaceAll('"', '&quot;')}"`
}

export function sanitizeFormForgeRichText(value: string | null | undefined): string {
  if (typeof value !== 'string' || value === '') {
    return ''
  }

  const tokens = value.match(/<\/?[^>]+>|[^<]+/g)

  if (tokens === null) {
    return ''
  }

  let output = ''
  const openTags: string[] = []

  for (const token of tokens) {
    if (!token.startsWith('<')) {
      output += token
      continue
    }

    const closing = token.startsWith('</')
    const match = token.match(/^<\/?\s*([a-zA-Z0-9-]+)([^>]*)\/?\s*>$/)

    if (match === null) {
      continue
    }

    const tagName = match[1]?.toLowerCase() ?? ''

    if (!ALLOWED_TAGS.has(tagName)) {
      continue
    }

    if (tagName === 'br') {
      output += '<br>'
      continue
    }

    if (closing) {
      const openTag = openTags.at(-1)
      if (openTag !== tagName) {
        continue
      }

      openTags.pop()
      output += `</${tagName}>`
      continue
    }

    const attributes = sanitizeAttributes(tagName, match[2] ?? '')
    output += `<${tagName}${attributes}>`

    openTags.push(tagName)
  }

  return output
}

export function sanitizeFormForgeInlineRichText(value: string | null | undefined): string {
  return sanitizeFormForgeRichText(value)
    .replaceAll(/<\/?p[^>]*>/gi, '')
    .trim()
}
