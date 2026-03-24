import type {
  FormForgeClientConfig,
  FormForgeDraftResponse,
  FormForgeDraftSaveInput,
  FormForgeDiffResponse,
  FormForgeFormSchema,
  FormForgeJsonObject,
  FormForgeManagementCreateInput,
  FormForgeManagementPatchInput,
  FormForgeResolveInput,
  FormForgeResponsesListResponse,
  FormForgeRevisionSummary,
  FormForgeSchemaVersionsResponse,
  FormForgeStageUploadInput,
  FormForgeStagedUploadResponse,
  FormForgeSubmitInput,
  FormForgeSubmissionResponse
} from '../types'
import { createFormForgeHttpAdapter } from './http'
import { deleteCurrentFormForgeDraft, fetchCurrentFormForgeDraft, saveFormForgeDraft } from './drafts'
import { fetchFormForgeDiff, fetchFormForgeForms, fetchFormForgeRevisions, createFormForgeForm, deleteFormForgeForm, patchFormForgeForm, publishFormForgeForm, type FormForgeMutationOptions, unpublishFormForgeForm } from './management'
import { fetchFormForgeSchema, fetchFormForgeSchemaVersion, fetchFormForgeSchemaVersions, resolveFormForgeSchema } from './schema'
import { deleteFormForgeResponse, fetchFormForgeResponse, fetchFormForgeResponses } from './responses'
import { submitFormForgeJson, submitFormForgeMultipart } from './submission'
import { stageFormForgeUpload } from './upload'

export interface FormForgeSubmitRequestOptions {
  version?: string
}

export interface FormForgeSubmitMultipartOptions {
  version?: string
  test?: boolean
}

export interface FormForgeClient {
  config: Readonly<FormForgeClientConfig>
  getForm(key: string): Promise<FormForgeFormSchema>
  getFormVersions(key: string): Promise<FormForgeSchemaVersionsResponse>
  getFormVersion(key: string, version: string): Promise<FormForgeFormSchema>
  resolveForm(key: string, input?: FormForgeResolveInput, options?: FormForgeSubmitRequestOptions): Promise<FormForgeFormSchema>
  submitForm(key: string, input: FormForgeSubmitInput, options?: FormForgeSubmitRequestOptions): Promise<FormForgeSubmissionResponse>
  submitFormMultipart(key: string, formData: FormData, options?: FormForgeSubmitMultipartOptions): Promise<FormForgeSubmissionResponse>
  stageUpload(key: string, input: FormForgeStageUploadInput, options?: FormForgeSubmitRequestOptions): Promise<FormForgeStagedUploadResponse>
  saveDraft(key: string, input: FormForgeDraftSaveInput): Promise<FormForgeDraftResponse>
  getCurrentDraft(key: string): Promise<FormForgeDraftResponse>
  deleteCurrentDraft(key: string): Promise<FormForgeDraftResponse>
  listResponses(key: string, query?: Record<string, string | number | boolean | undefined>): Promise<FormForgeResponsesListResponse>
  getResponse(key: string, submissionId: string): Promise<FormForgeJsonObject>
  deleteResponse(key: string, submissionId: string): Promise<FormForgeJsonObject>
  listForms(includeDeleted?: boolean): Promise<FormForgeJsonObject[]>
  createForm(input: FormForgeManagementCreateInput, options?: FormForgeMutationOptions): Promise<FormForgeJsonObject>
  patchForm(key: string, input: FormForgeManagementPatchInput, options?: FormForgeMutationOptions): Promise<FormForgeJsonObject>
  publishForm(key: string, options?: FormForgeMutationOptions): Promise<FormForgeJsonObject>
  unpublishForm(key: string, options?: FormForgeMutationOptions): Promise<FormForgeJsonObject>
  deleteForm(key: string, options?: FormForgeMutationOptions): Promise<FormForgeJsonObject>
  getRevisions(key: string, includeDeleted?: boolean): Promise<FormForgeRevisionSummary[]>
  getDiff(key: string, fromVersion: number, toVersion: number): Promise<FormForgeDiffResponse>
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

  async getForm(key: string): Promise<FormForgeFormSchema> {
    return fetchFormForgeSchema(this.http, key)
  }

  async getFormVersions(key: string): Promise<FormForgeSchemaVersionsResponse> {
    return fetchFormForgeSchemaVersions(this.http, key)
  }

  async getFormVersion(key: string, version: string): Promise<FormForgeFormSchema> {
    return fetchFormForgeSchemaVersion(this.http, key, version)
  }

  async resolveForm(
    key: string,
    input: FormForgeResolveInput = {},
    options: FormForgeSubmitRequestOptions = {}
  ): Promise<FormForgeFormSchema> {
    return resolveFormForgeSchema(this.http, key, input, options.version)
  }

  async submitForm(key: string, input: FormForgeSubmitInput, options: FormForgeSubmitRequestOptions = {}): Promise<FormForgeSubmissionResponse> {
    return submitFormForgeJson(this.http, key, input, options)
  }

  async submitFormMultipart(key: string, formData: FormData, options: FormForgeSubmitMultipartOptions = {}): Promise<FormForgeSubmissionResponse> {
    return submitFormForgeMultipart(this.http, key, formData, options)
  }

  async stageUpload(key: string, input: FormForgeStageUploadInput, options: FormForgeSubmitRequestOptions = {}): Promise<FormForgeStagedUploadResponse> {
    return stageFormForgeUpload(this.http, key, input, options)
  }

  async saveDraft(key: string, input: FormForgeDraftSaveInput): Promise<FormForgeDraftResponse> {
    return saveFormForgeDraft(this.http, key, input)
  }

  async getCurrentDraft(key: string): Promise<FormForgeDraftResponse> {
    return fetchCurrentFormForgeDraft(this.http, key)
  }

  async deleteCurrentDraft(key: string): Promise<FormForgeDraftResponse> {
    return deleteCurrentFormForgeDraft(this.http, key)
  }

  async listResponses(
    key: string,
    query: Record<string, string | number | boolean | undefined> = {}
  ): Promise<FormForgeResponsesListResponse> {
    return fetchFormForgeResponses(this.http, key, query)
  }

  async getResponse(key: string, submissionId: string): Promise<FormForgeJsonObject> {
    return fetchFormForgeResponse(this.http, key, submissionId)
  }

  async deleteResponse(key: string, submissionId: string): Promise<FormForgeJsonObject> {
    return deleteFormForgeResponse(this.http, key, submissionId)
  }

  async listForms(includeDeleted: boolean = false): Promise<FormForgeJsonObject[]> {
    return fetchFormForgeForms(this.http, includeDeleted)
  }

  async createForm(input: FormForgeManagementCreateInput, options: FormForgeMutationOptions = {}): Promise<FormForgeJsonObject> {
    return createFormForgeForm(this.http, input, options)
  }

  async patchForm(key: string, input: FormForgeManagementPatchInput, options: FormForgeMutationOptions = {}): Promise<FormForgeJsonObject> {
    return patchFormForgeForm(this.http, key, input, options)
  }

  async publishForm(key: string, options: FormForgeMutationOptions = {}): Promise<FormForgeJsonObject> {
    return publishFormForgeForm(this.http, key, options)
  }

  async unpublishForm(key: string, options: FormForgeMutationOptions = {}): Promise<FormForgeJsonObject> {
    return unpublishFormForgeForm(this.http, key, options)
  }

  async deleteForm(key: string, options: FormForgeMutationOptions = {}): Promise<FormForgeJsonObject> {
    return deleteFormForgeForm(this.http, key, options)
  }

  async getRevisions(key: string, includeDeleted: boolean = false): Promise<FormForgeRevisionSummary[]> {
    return fetchFormForgeRevisions(this.http, key, includeDeleted)
  }

  async getDiff(key: string, fromVersion: number, toVersion: number): Promise<FormForgeDiffResponse> {
    return fetchFormForgeDiff(this.http, key, fromVersion, toVersion)
  }
}

export function createFormForgeClient(config: FormForgeClientConfig = {}): FormForgeClient {
  return new FormForgeClientImpl(config)
}
