import { useNuxtApp, useRoute, useRuntimeConfig } from '#imports'
import { createFormForgeClient } from '../api'
import type { FormForgeClient, FormForgeClientConfig, FormForgeScopedRouteMap } from '../types'

interface FormForgeNuxtRouteBridge {
  _route?: {
    value?: {
      params?: Record<string, unknown>
      query?: Record<string, unknown>
      path?: string
    }
  }
}

function hasConfigOverrides(config: FormForgeClientConfig): boolean {
  return Object.keys(config).length > 0
}

function readRouteValue(value: unknown): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  if (Array.isArray(value)) {
    const first = value[0]
    if (typeof first === 'string' || typeof first === 'number') {
      return first
    }
  }

  return undefined
}

function mergeRouteValues(
  primaryValues: Record<string, unknown> | undefined,
  secondaryValues: Record<string, unknown> | undefined
): Record<string, string | number | undefined> {
  const merged: Record<string, string | number | undefined> = {}

  for (const [key, value] of Object.entries(secondaryValues ?? {})) {
    const resolvedValue = readRouteValue(value)
    if (resolvedValue !== undefined) {
      merged[key] = resolvedValue
    }
  }

  for (const [key, value] of Object.entries(primaryValues ?? {})) {
    const resolvedValue = readRouteValue(value)
    if (resolvedValue !== undefined) {
      merged[key] = resolvedValue
    }
  }

  return merged
}

function templateSegmentKey(value: string): string | null {
  const matched = value.match(/^\{([a-zA-Z0-9_]+)(?::[^}]+)?\}$/)
  return matched?.[1] ?? null
}

function toPathSegments(path: string | undefined): string[] {
  if (typeof path !== 'string' || path === '') {
    return []
  }

  let normalizedPath = path

  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      normalizedPath = new URL(path).pathname
    } catch {
      normalizedPath = path
    }
  }

  const withoutQueryOrHash = normalizedPath.split('#')[0]?.split('?')[0] ?? normalizedPath
  return withoutQueryOrHash
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment !== '')
    .map((segment) => decodeURIComponent(segment))
}

function inferParamsFromPath(
  baseURLTemplate: string | undefined,
  currentPath: string | undefined
): Record<string, string> {
  const inferred: Record<string, string> = {}
  const templateSegments = toPathSegments(baseURLTemplate)
  const currentSegments = toPathSegments(currentPath)

  if (templateSegments.length === 0 || currentSegments.length === 0) {
    return inferred
  }

  for (let index = 0; index < templateSegments.length; index += 1) {
    const templateSegment = templateSegments[index]
    if (templateSegment === undefined) {
      continue
    }

    const key = templateSegmentKey(templateSegment)
    if (key === null) {
      continue
    }

    let candidate: string | undefined
    const previousTemplate = templateSegments[index - 1]
    const nextTemplate = templateSegments[index + 1]
    const previousLiteral = previousTemplate !== undefined && templateSegmentKey(previousTemplate) === null ? previousTemplate : undefined
    const nextLiteral = nextTemplate !== undefined && templateSegmentKey(nextTemplate) === null ? nextTemplate : undefined

    if (previousLiteral !== undefined) {
      for (let segmentIndex = 0; segmentIndex < currentSegments.length - 1; segmentIndex += 1) {
        if (currentSegments[segmentIndex] === previousLiteral) {
          candidate = currentSegments[segmentIndex + 1]
          break
        }
      }
    }

    if (candidate === undefined && nextLiteral !== undefined) {
      for (let segmentIndex = 1; segmentIndex < currentSegments.length; segmentIndex += 1) {
        if (currentSegments[segmentIndex] === nextLiteral) {
          candidate = currentSegments[segmentIndex - 1]
          break
        }
      }
    }

    if (candidate !== undefined && candidate !== '') {
      inferred[key] = candidate
    }
  }

  return inferred
}

function withInferredMissingValues(
  base: Record<string, string | number | undefined>,
  inferred: Record<string, string>
): Record<string, string | number | undefined> {
  const resolved: Record<string, string | number | undefined> = {
    ...base
  }

  for (const [key, value] of Object.entries(inferred)) {
    if (resolved[key] === undefined || resolved[key] === '') {
      resolved[key] = value
    }
  }

  return resolved
}

function inferScopeSourcesFromPath(
  scopedRoutes: FormForgeScopedRouteMap | undefined,
  currentPath: string | undefined
): Record<string, string> {
  const inferredSources: Record<string, string> = {}

  for (const scopedRoute of Object.values(scopedRoutes ?? {})) {
    const inferredScopeParams = inferParamsFromPath(scopedRoute.prefix, currentPath)
    for (const [scopeParam, sourceParam] of Object.entries(scopedRoute.paramsFromRoute)) {
      const inferredValue = inferredScopeParams[scopeParam]
      if (inferredValue !== undefined && inferredValue !== '' && inferredSources[sourceParam] === undefined) {
        inferredSources[sourceParam] = inferredValue
      }
    }
  }

  return inferredSources
}

export function useFormForgeClient(config: FormForgeClientConfig = {}): FormForgeClient {
  const nuxtApp = useNuxtApp() as ReturnType<typeof useNuxtApp> & FormForgeNuxtRouteBridge
  const route = useRoute()
  const injectedClient = nuxtApp.$formforge as FormForgeClient | undefined
  const baseConfig = injectedClient?.config ?? (useRuntimeConfig().public.formforge as FormForgeClientConfig | undefined)

  if (injectedClient !== undefined && !hasConfigOverrides(config)) {
    return injectedClient
  }

  const routeParamsResolver = (): Record<string, string | number | undefined> => {
    const appRouteQuery = nuxtApp._route?.value?.query
    const appRouteParams = nuxtApp._route?.value?.params
    const appRoutePath = nuxtApp._route?.value?.path
    const composableRouteQuery = route.query as Record<string, unknown>
    const composableRouteParams = route.params as Record<string, unknown>
    const composableRoutePath = route.path
    const mergedRouteValues = mergeRouteValues(
      {
        ...composableRouteQuery,
        ...composableRouteParams
      },
      {
        ...appRouteQuery,
        ...appRouteParams
      }
    )
    const resolvedPath = composableRoutePath || appRoutePath
    const resolvedBaseURL = config.baseURL ?? baseConfig?.baseURL
    const resolvedScopedRoutes = config.scopedRoutes ?? baseConfig?.scopedRoutes
    const inferredFromBaseURL = inferParamsFromPath(resolvedBaseURL, resolvedPath)
    const withBaseURLValues = withInferredMissingValues(mergedRouteValues, inferredFromBaseURL)
    const inferredFromScopes = inferScopeSourcesFromPath(resolvedScopedRoutes, resolvedPath)
    return withInferredMissingValues(withBaseURLValues, inferredFromScopes)
  }

  const mergedConfig: FormForgeClientConfig = {
    ...(baseConfig),
    ...config
  }

  const configBaseURLParams = config.baseURLParams
  const runtimeBaseURLParams = baseConfig?.baseURLParams
  const configScopeParams = config.scopeParams
  const runtimeScopeParams = baseConfig?.scopeParams

  if (configBaseURLParams !== undefined) {
    if (typeof configBaseURLParams === 'function') {
      mergedConfig.baseURLParams = () => ({
        ...routeParamsResolver(),
        ...configBaseURLParams()
      })
    } else {
      mergedConfig.baseURLParams = () => ({
        ...routeParamsResolver(),
        ...configBaseURLParams
      })
    }
  } else if (runtimeBaseURLParams !== undefined) {
    if (typeof runtimeBaseURLParams === 'function') {
      mergedConfig.baseURLParams = () => ({
        ...routeParamsResolver(),
        ...runtimeBaseURLParams()
      })
    } else {
      mergedConfig.baseURLParams = () => ({
        ...routeParamsResolver(),
        ...runtimeBaseURLParams
      })
    }
  } else {
    mergedConfig.baseURLParams = routeParamsResolver
  }

  if (configScopeParams !== undefined) {
    if (typeof configScopeParams === 'function') {
      mergedConfig.scopeParams = () => ({
        ...routeParamsResolver(),
        ...configScopeParams()
      })
    } else {
      mergedConfig.scopeParams = () => ({
        ...routeParamsResolver(),
        ...configScopeParams
      })
    }
  } else if (runtimeScopeParams !== undefined) {
    if (typeof runtimeScopeParams === 'function') {
      mergedConfig.scopeParams = () => ({
        ...routeParamsResolver(),
        ...runtimeScopeParams()
      })
    } else {
      mergedConfig.scopeParams = () => ({
        ...routeParamsResolver(),
        ...runtimeScopeParams
      })
    }
  } else {
    mergedConfig.scopeParams = routeParamsResolver
  }

  return createFormForgeClient(mergedConfig)
}
