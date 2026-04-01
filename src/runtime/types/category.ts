import type { FormForgeJsonObject } from './json'

export interface FormForgeCategory {
  id: number
  key: string
  name: string
  description: string | null
  is_active: boolean
  meta: FormForgeJsonObject
  created_at: string | null
  updated_at: string | null
}

export interface FormForgeCategoryCreateInput {
  key?: string
  name: string
  description?: string | null
  is_active?: boolean
  meta?: FormForgeJsonObject
}

export interface FormForgeCategoryUpdateInput {
  name?: string
  description?: string | null
  is_active?: boolean
  meta?: FormForgeJsonObject
}

export interface FormForgeCategoryListQuery {
  per_page?: number
  search?: string
  is_active?: boolean
}

export type FormForgePaginationLinks = FormForgeJsonObject

export type FormForgePaginationMeta = FormForgeJsonObject

export interface FormForgeCategoryListResponse {
  data: FormForgeCategory[]
  meta?: FormForgePaginationMeta
  links?: FormForgePaginationLinks
}

export interface FormForgeCategorySelectOption {
  label: string
  value: string
  disabled: boolean
}
