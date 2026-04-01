import { onBeforeUnmount, ref, watch } from '#imports'
import { toFormForgeJsonSubmissionPayload } from '../utils/submission'
import { useFormForgeClient } from './useFormForgeClient'
import type { FormForgeClient, FormForgeClientConfig, FormForgeFormSchema, FormForgeScope, FormForgeSubmissionPayload } from '../types'
import type { FormForgeRequestOptions } from '../api/request'

export interface UseFormForgeResolverOptions {
  key: string
  version?: string
  endpoint?: string
  scope?: FormForgeScope
  delay?: number
  payload?: () => FormForgeSubmissionPayload
  immediate?: boolean
  watchPayload?: boolean
  debug?: boolean
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export interface FormForgeResolveOptions extends FormForgeRequestOptions {
  debug?: boolean
}

export function useFormForgeResolver(options: UseFormForgeResolverOptions) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const delay = options.delay ?? 200

  const resolving = ref<boolean>(false)
  const error = ref<string | null>(null)
  const schema = ref<FormForgeFormSchema | null>(null)

  let timer: ReturnType<typeof setTimeout> | undefined
  let requestId = 0

  function clearScheduledResolve(): void {
    if (timer === undefined) {
      return
    }

    clearTimeout(timer)
    timer = undefined
  }

  async function resolveNow(payload: FormForgeSubmissionPayload = {}, resolveOptions: FormForgeResolveOptions = {}): Promise<FormForgeFormSchema> {
    const nextRequestId = requestId + 1
    requestId = nextRequestId
    resolving.value = true
    error.value = null

    try {
      const resolved = await client.resolveForm(
        options.key,
        {
          payload: toFormForgeJsonSubmissionPayload(payload),
          debug: resolveOptions.debug === true
        },
        {
          version: options.version,
          endpoint: resolveOptions.endpoint ?? options.endpoint,
          scope: resolveOptions.scope ?? options.scope
        }
      )

      if (requestId === nextRequestId) {
        schema.value = resolved
      }

      return resolved
    } catch (caughtError) {
      if (requestId === nextRequestId) {
        error.value = caughtError instanceof Error ? caughtError.message : 'Failed to resolve schema'
      }

      throw caughtError
    } finally {
      if (requestId === nextRequestId) {
        resolving.value = false
      }
    }
  }

  function resolve(payload: FormForgeSubmissionPayload = {}, resolveOptions: FormForgeResolveOptions = {}): Promise<FormForgeFormSchema> {
    clearScheduledResolve()

    return new Promise((resolvePromise, rejectPromise) => {
      timer = setTimeout(() => {
        resolveNow(payload, resolveOptions)
          .then(resolvePromise)
          .catch(rejectPromise)
      }, delay)
    })
  }

  onBeforeUnmount(() => {
    clearScheduledResolve()
  })

  if (options.payload !== undefined && options.watchPayload === true) {
    watch(options.payload, (nextPayload) => {
      resolve(nextPayload, {
        debug: options.debug
      }).catch(() => {})
    }, {
      deep: true
    })
  }

  if (options.payload !== undefined && options.immediate === true) {
    resolve(options.payload(), {
      debug: options.debug
    }).catch(() => {})
  }

  return {
    client,
    schema,
    resolving,
    error,
    resolve,
    resolveNow,
    clearScheduledResolve
  }
}
