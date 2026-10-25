import type { FormForgeClient, FormForgeFormSchema } from '../types'
import type { FormForgeRequestOptions } from '../api/request'

type FormForgeSchemaClient = Pick<FormForgeClient, 'getForm' | 'getFormVersion'>
type FormForgeSchemaRequestOptions = Pick<FormForgeRequestOptions, 'endpoint' | 'scope' | 'accessToken'>

export function fetchFormForgeClientSchema(
  client: FormForgeSchemaClient,
  key: string,
  version: string | undefined,
  options: FormForgeSchemaRequestOptions
): Promise<FormForgeFormSchema> {
  if (version !== undefined && version !== '') {
    return client.getFormVersion(key, version, options)
  }

  return client.getForm(key, options)
}
