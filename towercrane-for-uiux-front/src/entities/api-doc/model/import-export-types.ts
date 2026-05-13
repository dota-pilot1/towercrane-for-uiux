import type { ApiBlockContent, HttpMethod } from './types'

export type ApiDocImportExportFile = {
  version: 1
  source: 'towercrane-postman-lite'
  exportedAt?: string
  collections: ApiDocImportCollection[]
}

export type ApiDocImportCollection = {
  name: string
  icon?: string | null
  emoji?: string | null
  endpoints: ApiDocImportEndpoint[]
}

export type ApiDocImportEndpoint = {
  title: string
  method: HttpMethod
  path: string
  request: Omit<ApiBlockContent, 'lastResponse'>
}

export type ApiDocImportResult = {
  success: boolean
  importedCollections: number
  importedEndpoints: number
  importedBlocks: number
  importedCategoryIds: string[]
}
