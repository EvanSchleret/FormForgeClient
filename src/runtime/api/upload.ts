import type { FormForgeHttpAdapter, FormForgeJsonObject, FormForgeStageUploadInput, FormForgeStagedUploadResponse } from '../types'
import { pickFormForgeDataEnvelope } from '../utils/object'

interface FormForgeStageUploadOptions {
  version?: string
}

function buildUploadPath(key: string, version: string | undefined): string {
  if (version !== undefined && version !== '') {
    return `/forms/${key}/versions/${version}/uploads/stage`
  }

  return `/forms/${key}/uploads/stage`
}

export async function stageFormForgeUpload(
  http: FormForgeHttpAdapter,
  key: string,
  input: FormForgeStageUploadInput,
  options: FormForgeStageUploadOptions = {}
): Promise<FormForgeStagedUploadResponse> {
  const formData: FormData = new FormData()

  if (input.field !== undefined) {
    formData.append('field', input.field)
  }

  if (input.field_key !== undefined) {
    formData.append('field_key', input.field_key)
  }

  formData.append('file', input.file)

  const response = await http<FormForgeJsonObject>({
    path: buildUploadPath(key, options.version),
    method: 'POST',
    body: formData
  })

  const data: FormForgeJsonObject = pickFormForgeDataEnvelope(response.data)
  const stagedValue = data.staged as FormForgeJsonObject

  return {
    data: {
      staged: {
        upload_token: String(stagedValue.upload_token ?? ''),
        expires_at: typeof stagedValue.expires_at === 'string' ? stagedValue.expires_at : undefined
      }
    },
    meta: response.data.meta as FormForgeJsonObject | undefined
  }
}
