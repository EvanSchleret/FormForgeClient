import type { FormForgeResolvedScope, FormForgeScope } from '../types'

export interface FormForgeRequestOptions {
  endpoint?: string
  scope?: FormForgeScope
}

const TEMPLATE_PARAM_PATTERN: RegExp = /\{([a-zA-Z0-9_]+)(?::[^}]+)?\}/g

function normalizePath(path: string): string {
  if (path.startsWith('/')) {
    return path
  }

  return `/${path}`
}

function stripWrappingSlashes(value: string): string {
  return value.replaceAll(/^\/+|\/+$/g, '')
}

function replaceTemplateParams(
  template: string,
  params: Record<string, string | number>,
  strict: boolean,
  context?: string
): string {
  return template.replaceAll(TEMPLATE_PARAM_PATTERN, (token: string, key: string) => {
    const value = params[key]

    if (value === undefined || value === '') {
      if (strict) {
        throw new Error(`Missing required scope param "${key}" for scope prefix "${context ?? template}"`)
      }

      return token
    }

    return encodeURIComponent(String(value))
  })
}

function resolveScopeInput(scope: FormForgeScope | undefined): FormForgeResolvedScope | undefined {
  if (scope === undefined) {
    return undefined
  }

  if (typeof scope === 'string') {
    throw new Error(`Named scope "${scope}" is not resolved. Use createFormForgeClient with scopedRoutes/defaultScope or pass a scope object.`)
  }

  return scope
}

export function applyFormForgeScope(path: string, scope: FormForgeScope | undefined): string {
  const resolvedScope = resolveScopeInput(scope)
  const normalizedPath = normalizePath(path)

  if (resolvedScope === undefined) {
    return normalizedPath
  }

  const trimmedPrefix = stripWrappingSlashes(resolvedScope.prefix)
  if (trimmedPrefix === '') {
    return normalizedPath
  }

  const resolvedPrefix = replaceTemplateParams(trimmedPrefix, resolvedScope.params, true, resolvedScope.prefix)

  if (normalizedPath === '/') {
    return `/${resolvedPrefix}`
  }

  return `/${resolvedPrefix}${normalizedPath}`
}

export function resolveEndpointPath(
  endpoint: string | undefined,
  fallback: string,
  params: Record<string, string | number> = {},
  scope: FormForgeScope | undefined = undefined
): string {
  const template = typeof endpoint === 'string' && endpoint !== '' ? endpoint : fallback

  const resolvedPath = replaceTemplateParams(template, params, false)
  return applyFormForgeScope(resolvedPath, scope)
}
