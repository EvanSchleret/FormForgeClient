import { defineNuxtPlugin, useRoute, useRuntimeConfig } from '#imports'
import { createFormForgeClient } from './api'
import type { FormForgeBeforeRequestContext, FormForgeClientConfig } from './types'

interface FormForgeNuxtAppHookBridge {
  callHook(name: 'formforge:beforeRequest', context: FormForgeBeforeRequestContext): Promise<void>
}

interface FormForgeNuxtRouteBridge {
  _route?: {
    value?: {
      params?: Record<string, unknown>
      query?: Record<string, unknown>
      path?: string
    }
  }
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
  const matched = value.match(/^\{([a-zA-Z0-9_]+)\}$/)
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

export default defineNuxtPlugin((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig()
  const route = useRoute()
  const publicConfig = runtimeConfig.public.formforge as FormForgeClientConfig | undefined
  const hookedNuxtApp = nuxtApp as typeof nuxtApp & FormForgeNuxtAppHookBridge & FormForgeNuxtRouteBridge

  const routeParamsResolver = (): Record<string, string | number | undefined> => {
    const appRouteQuery = hookedNuxtApp._route?.value?.query
    const appRouteParams = hookedNuxtApp._route?.value?.params
    const appRoutePath = hookedNuxtApp._route?.value?.path
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
    const inferredFromPath = inferParamsFromPath(publicConfig?.baseURL, composableRoutePath || appRoutePath)
    return withInferredMissingValues(mergedRouteValues, inferredFromPath)
  }

  const runtimeBaseURLParams = publicConfig?.baseURLParams
  const runtimeScopeParams = publicConfig?.scopeParams
  const resolvedBaseURLParams = (() => {
    if (runtimeBaseURLParams === undefined) {
      return routeParamsResolver
    }

    if (typeof runtimeBaseURLParams === 'function') {
      return () => ({
        ...routeParamsResolver(),
        ...runtimeBaseURLParams()
      })
    }

    return () => ({
      ...routeParamsResolver(),
      ...runtimeBaseURLParams
    })
  })()

  const resolvedScopeParams = (() => {
    if (runtimeScopeParams === undefined) {
      return routeParamsResolver
    }

    if (typeof runtimeScopeParams === 'function') {
      return () => ({
        ...routeParamsResolver(),
        ...runtimeScopeParams()
      })
    }

    return () => ({
      ...routeParamsResolver(),
      ...runtimeScopeParams
    })
  })()

  const client = createFormForgeClient({
    ...(publicConfig ?? {}),
    baseURLParams: resolvedBaseURLParams,
    scopeParams: resolvedScopeParams,
    beforeRequest: async (context) => {
      await publicConfig?.beforeRequest?.(context)
      await hookedNuxtApp.callHook('formforge:beforeRequest', context)
    }
  })

  return {
    provide: {
      formforge: client
    }
  }
})
