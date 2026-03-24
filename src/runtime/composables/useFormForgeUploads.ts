import { ref } from '#imports'
import { useFormForgeClient } from './useFormForgeClient'
import type { FormForgeClient, FormForgeClientConfig, FormForgeStageUploadInput, FormForgeStagedUploadResponse } from '../types'

export interface UseFormForgeUploadsOptions {
  key: string
  version?: string
  client?: FormForgeClient
  clientConfig?: FormForgeClientConfig
}

export interface FormForgeUploadOptions {
  version?: string
}

export function useFormForgeUploads(options: UseFormForgeUploadsOptions) {
  const client = options.client ?? useFormForgeClient(options.clientConfig)
  const uploading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const lastUpload = ref<FormForgeStagedUploadResponse | null>(null)

  async function stageUpload(input: FormForgeStageUploadInput, stageOptions: FormForgeUploadOptions = {}): Promise<FormForgeStagedUploadResponse> {
    uploading.value = true
    error.value = null

    try {
      const response = await client.stageUpload(
        options.key,
        input,
        {
          version: stageOptions.version ?? options.version
        }
      )
      lastUpload.value = response
      return response
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'Failed to stage upload'
      throw caughtError
    } finally {
      uploading.value = false
    }
  }

  return {
    client,
    uploading,
    error,
    lastUpload,
    stageUpload
  }
}
