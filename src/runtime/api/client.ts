import type {
  FormForgeCategory,
  FormForgeCategoryCreateInput,
  FormForgeCategoryListQuery,
  FormForgeCategoryListResponse,
  FormForgeCategoryUpdateInput,
  FormForgeBaseURLParamsInput,
  FormForgeClientConfig,
  FormForgeDraftResponse,
  FormForgeDraftSaveInput,
  FormForgeDiffResponse,
  FormForgeFormSchema,
  FormForgeJsonObject,
  FormForgeManagementCreateInput,
  FormForgeManagementForm,
  FormForgeManagementPatchInput,
  FormForgeResolveInput,
  FormForgeResponsesListResponse,
  FormForgeRevisionSummary,
  FormForgeResolvedScope,
  FormForgeSchemaVersionsResponse,
  FormForgeScope,
  FormForgeScopedRouteDefinition,
  FormForgeScopeParamsInput,
  FormForgeStageUploadInput,
  FormForgeStagedUploadResponse,
  FormForgeSubmitInput,
  FormForgeSubmissionResponse
} from '../types'
import { createFormForgeHttpAdapter } from './http'
import { deleteCurrentFormForgeDraft, fetchCurrentFormForgeDraft, saveFormForgeDraft } from './drafts'
import { fetchFormForgeDiff, fetchFormForgeForms, fetchFormForgeRevisions, createFormForgeForm, deleteFormForgeForm, patchFormForgeForm, publishFormForgeForm, type FormForgeManagementRequestOptions, type FormForgeMutationOptions, unpublishFormForgeForm } from './management'
import { createFormForgeCategory, deleteFormForgeCategory, fetchFormForgeCategories, fetchFormForgeCategory, patchFormForgeCategory } from './categories'
import { fetchFormForgeSchema, fetchFormForgeSchemaVersion, fetchFormForgeSchemaVersions, resolveFormForgeSchema } from './schema'
import { deleteFormForgeResponse, fetchFormForgeResponse, fetchFormForgeResponses } from './responses'
import { submitFormForgeJson, submitFormForgeMultipart } from './submission'
import { stageFormForgeUpload } from './upload'
import type { FormForgeRequestOptions } from './request'

export interface FormForgeSubmitRequestOptions extends FormForgeRequestOptions {
  version?: string
}

export interface FormForgeSubmitMultipartOptions extends FormForgeRequestOptions {
  version?: string
  test?: boolean
}

export type FormForgeSchemaRequestOptions = FormForgeRequestOptions
export type FormForgeDraftRequestOptions = FormForgeRequestOptions
export type FormForgeResponsesRequestOptions = FormForgeRequestOptions
export type FormForgeCategoryRequestOptions = FormForgeRequestOptions

export interface FormForgeClient {
  config: Readonly<FormForgeClientConfig>
  getForm(key: string, options?: FormForgeSchemaRequestOptions): Promise<FormForgeFormSchema>
  getFormVersions(key: string, options?: FormForgeSchemaRequestOptions): Promise<FormForgeSchemaVersionsResponse>
  getFormVersion(key: string, version: string, options?: FormForgeSchemaRequestOptions): Promise<FormForgeFormSchema>
  resolveForm(key: string, input?: FormForgeResolveInput, options?: FormForgeSubmitRequestOptions): Promise<FormForgeFormSchema>
  submitForm(key: string, input: FormForgeSubmitInput, options?: FormForgeSubmitRequestOptions): Promise<FormForgeSubmissionResponse>
  submitFormMultipart(key: string, formData: FormData, options?: FormForgeSubmitMultipartOptions): Promise<FormForgeSubmissionResponse>
  stageUpload(key: string, input: FormForgeStageUploadInput, options?: FormForgeSubmitRequestOptions): Promise<FormForgeStagedUploadResponse>
  saveDraft(key: string, input: FormForgeDraftSaveInput, options?: FormForgeDraftRequestOptions): Promise<FormForgeDraftResponse>
  getCurrentDraft(key: string, options?: FormForgeDraftRequestOptions): Promise<FormForgeDraftResponse>
  deleteCurrentDraft(key: string, options?: FormForgeDraftRequestOptions): Promise<FormForgeDraftResponse>
  listResponses(
    key: string,
    query?: Record<string, string | number | boolean | undefined>,
    options?: FormForgeResponsesRequestOptions
  ): Promise<FormForgeResponsesListResponse>
  getResponse(key: string, submissionId: string, options?: FormForgeResponsesRequestOptions): Promise<FormForgeJsonObject>
  deleteResponse(key: string, submissionId: string, options?: FormForgeResponsesRequestOptions): Promise<FormForgeJsonObject>
  listForms(includeDeleted?: boolean, options?: FormForgeManagementRequestOptions): Promise<FormForgeManagementForm[]>
  createForm(input: FormForgeManagementCreateInput, options?: FormForgeMutationOptions): Promise<FormForgeManagementForm>
  patchForm(key: string, input: FormForgeManagementPatchInput, options?: FormForgeMutationOptions): Promise<FormForgeManagementForm>
  publishForm(key: string, options?: FormForgeMutationOptions): Promise<FormForgeManagementForm>
  unpublishForm(key: string, options?: FormForgeMutationOptions): Promise<FormForgeManagementForm>
  deleteForm(key: string, options?: FormForgeMutationOptions): Promise<FormForgeManagementForm>
  getRevisions(key: string, includeDeleted?: boolean, options?: FormForgeManagementRequestOptions): Promise<FormForgeRevisionSummary[]>
  getDiff(key: string, fromVersion: number, toVersion: number, options?: FormForgeManagementRequestOptions): Promise<FormForgeDiffResponse>
  listCategories(query?: FormForgeCategoryListQuery, options?: FormForgeCategoryRequestOptions): Promise<FormForgeCategoryListResponse>
  getCategory(categoryKey: string, options?: FormForgeCategoryRequestOptions): Promise<FormForgeCategory>
  createCategory(input: FormForgeCategoryCreateInput, options?: FormForgeMutationOptions): Promise<FormForgeCategory>
  patchCategory(categoryKey: string, input: FormForgeCategoryUpdateInput, options?: FormForgeMutationOptions): Promise<FormForgeCategory>
  deleteCategory(categoryKey: string, options?: FormForgeMutationOptions): Promise<FormForgeCategory>
}

class FormForgeClientImpl implements FormForgeClient {
  public readonly config: Readonly<FormForgeClientConfig>

  private readonly http

  constructor(config: FormForgeClientConfig = {}) {
    this.config = {
      ...config
    }
    this.http = createFormForgeHttpAdapter(this.config)
  }

  private resolveScopeParams(input: FormForgeScopeParamsInput | undefined): Record<string, string | number | undefined> {
    if (input === undefined) {
      return {}
    }

    if (typeof input === 'function') {
      return input()
    }

    return input
  }

  private resolveBaseURLParams(input: FormForgeBaseURLParamsInput | undefined): Record<string, string | number | undefined> {
    if (input === undefined) {
      return {}
    }

    if (typeof input === 'function') {
      return input()
    }

    return input
  }

  private resolveNamedScope(name: string): FormForgeResolvedScope {
    const scopedRoutes = this.config.scopedRoutes ?? {}
    const routeDefinition: FormForgeScopedRouteDefinition | undefined = scopedRoutes[name]

    if (routeDefinition === undefined) {
      throw new Error(`Unknown FormForge scope "${name}"`)
    }

    const sourceParams = this.resolveScopeParams(this.config.scopeParams)
    const baseURLParams = this.resolveBaseURLParams(this.config.baseURLParams)
    const params: Record<string, string | number> = {}

    for (const [scopeParam, sourceParam] of Object.entries(routeDefinition.paramsFromRoute)) {
      const value = sourceParams[sourceParam] ?? baseURLParams[sourceParam]

      if (value === undefined || value === '') {
        throw new Error(`Missing scope param source "${sourceParam}" for named scope "${name}"`)
      }

      params[scopeParam] = value
    }

    return {
      prefix: routeDefinition.prefix,
      params
    }
  }

  private resolveRequestScope(scope: FormForgeScope | undefined): FormForgeResolvedScope | undefined {
    const targetScope: FormForgeScope | undefined = scope ?? this.config.defaultScope

    if (targetScope === undefined) {
      return undefined
    }

    if (typeof targetScope === 'string') {
      return this.resolveNamedScope(targetScope)
    }

    return targetScope
  }

  private withRequestScope<TOptions extends FormForgeRequestOptions>(options: TOptions): TOptions {
    const resolvedScope = this.resolveRequestScope(options.scope)

    if (resolvedScope === undefined) {
      return options
    }

    return {
      ...options,
      scope: resolvedScope
    }
  }

  async getForm(key: string, options: FormForgeSchemaRequestOptions = {}): Promise<FormForgeFormSchema> {
    return fetchFormForgeSchema(this.http, key, this.withRequestScope(options))
  }

  async getFormVersions(key: string, options: FormForgeSchemaRequestOptions = {}): Promise<FormForgeSchemaVersionsResponse> {
    return fetchFormForgeSchemaVersions(this.http, key, this.withRequestScope(options))
  }

  async getFormVersion(key: string, version: string, options: FormForgeSchemaRequestOptions = {}): Promise<FormForgeFormSchema> {
    return fetchFormForgeSchemaVersion(this.http, key, version, this.withRequestScope(options))
  }

  async resolveForm(
    key: string,
    input: FormForgeResolveInput = {},
    options: FormForgeSubmitRequestOptions = {}
  ): Promise<FormForgeFormSchema> {
    return resolveFormForgeSchema(this.http, key, input, options.version, this.withRequestScope(options))
  }

  async submitForm(key: string, input: FormForgeSubmitInput, options: FormForgeSubmitRequestOptions = {}): Promise<FormForgeSubmissionResponse> {
    return submitFormForgeJson(this.http, key, input, this.withRequestScope(options))
  }

  async submitFormMultipart(key: string, formData: FormData, options: FormForgeSubmitMultipartOptions = {}): Promise<FormForgeSubmissionResponse> {
    return submitFormForgeMultipart(this.http, key, formData, this.withRequestScope(options))
  }

  async stageUpload(key: string, input: FormForgeStageUploadInput, options: FormForgeSubmitRequestOptions = {}): Promise<FormForgeStagedUploadResponse> {
    return stageFormForgeUpload(this.http, key, input, this.withRequestScope(options))
  }

  async saveDraft(key: string, input: FormForgeDraftSaveInput, options: FormForgeDraftRequestOptions = {}): Promise<FormForgeDraftResponse> {
    return saveFormForgeDraft(this.http, key, input, this.withRequestScope(options))
  }

  async getCurrentDraft(key: string, options: FormForgeDraftRequestOptions = {}): Promise<FormForgeDraftResponse> {
    return fetchCurrentFormForgeDraft(this.http, key, this.withRequestScope(options))
  }

  async deleteCurrentDraft(key: string, options: FormForgeDraftRequestOptions = {}): Promise<FormForgeDraftResponse> {
    return deleteCurrentFormForgeDraft(this.http, key, this.withRequestScope(options))
  }

  async listResponses(
    key: string,
    query: Record<string, string | number | boolean | undefined> = {},
    options: FormForgeResponsesRequestOptions = {}
  ): Promise<FormForgeResponsesListResponse> {
    return fetchFormForgeResponses(this.http, key, query, this.withRequestScope(options))
  }

  async getResponse(
    key: string,
    submissionId: string,
    options: FormForgeResponsesRequestOptions = {}
  ): Promise<FormForgeJsonObject> {
    return fetchFormForgeResponse(this.http, key, submissionId, this.withRequestScope(options))
  }

  async deleteResponse(
    key: string,
    submissionId: string,
    options: FormForgeResponsesRequestOptions = {}
  ): Promise<FormForgeJsonObject> {
    return deleteFormForgeResponse(this.http, key, submissionId, this.withRequestScope(options))
  }

  async listForms(includeDeleted: boolean = false, options: FormForgeManagementRequestOptions = {}): Promise<FormForgeManagementForm[]> {
    return fetchFormForgeForms(this.http, includeDeleted, this.withRequestScope(options))
  }

  async createForm(input: FormForgeManagementCreateInput, options: FormForgeMutationOptions = {}): Promise<FormForgeManagementForm> {
    return createFormForgeForm(this.http, input, this.withRequestScope(options))
  }

  async patchForm(key: string, input: FormForgeManagementPatchInput, options: FormForgeMutationOptions = {}): Promise<FormForgeManagementForm> {
    return patchFormForgeForm(this.http, key, input, this.withRequestScope(options))
  }

  async publishForm(key: string, options: FormForgeMutationOptions = {}): Promise<FormForgeManagementForm> {
    return publishFormForgeForm(this.http, key, this.withRequestScope(options))
  }

  async unpublishForm(key: string, options: FormForgeMutationOptions = {}): Promise<FormForgeManagementForm> {
    return unpublishFormForgeForm(this.http, key, this.withRequestScope(options))
  }

  async deleteForm(key: string, options: FormForgeMutationOptions = {}): Promise<FormForgeManagementForm> {
    return deleteFormForgeForm(this.http, key, this.withRequestScope(options))
  }

  async getRevisions(
    key: string,
    includeDeleted: boolean = false,
    options: FormForgeManagementRequestOptions = {}
  ): Promise<FormForgeRevisionSummary[]> {
    return fetchFormForgeRevisions(this.http, key, includeDeleted, this.withRequestScope(options))
  }

  async getDiff(
    key: string,
    fromVersion: number,
    toVersion: number,
    options: FormForgeManagementRequestOptions = {}
  ): Promise<FormForgeDiffResponse> {
    return fetchFormForgeDiff(this.http, key, fromVersion, toVersion, this.withRequestScope(options))
  }

  async listCategories(
    query: FormForgeCategoryListQuery = {},
    options: FormForgeCategoryRequestOptions = {}
  ): Promise<FormForgeCategoryListResponse> {
    return fetchFormForgeCategories(this.http, query, this.withRequestScope(options))
  }

  async getCategory(categoryKey: string, options: FormForgeCategoryRequestOptions = {}): Promise<FormForgeCategory> {
    return fetchFormForgeCategory(this.http, categoryKey, this.withRequestScope(options))
  }

  async createCategory(input: FormForgeCategoryCreateInput, options: FormForgeMutationOptions = {}): Promise<FormForgeCategory> {
    return createFormForgeCategory(this.http, input, this.withRequestScope(options))
  }

  async patchCategory(categoryKey: string, input: FormForgeCategoryUpdateInput, options: FormForgeMutationOptions = {}): Promise<FormForgeCategory> {
    return patchFormForgeCategory(this.http, categoryKey, input, this.withRequestScope(options))
  }

  async deleteCategory(categoryKey: string, options: FormForgeMutationOptions = {}): Promise<FormForgeCategory> {
    return deleteFormForgeCategory(this.http, categoryKey, this.withRequestScope(options))
  }
}

export function createFormForgeClient(config: FormForgeClientConfig = {}): FormForgeClient {
  return new FormForgeClientImpl(config)
}
