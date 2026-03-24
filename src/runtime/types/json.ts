export type FormForgeJsonPrimitive = string | number | boolean | null

export interface FormForgeJsonObject {
  [key: string]: FormForgeJsonValue
}

export type FormForgeJsonValue = FormForgeJsonPrimitive | FormForgeJsonObject | FormForgeJsonValue[]
