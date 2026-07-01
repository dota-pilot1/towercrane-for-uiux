import type { ApiBlockContent, HttpMethod } from "./types";

export type ApiDocImportExportFile =
  | ApiDocImportExportV1File
  | ApiDocImportExportV2File;

export type ApiDocImportExportV1File = {
  version: 1;
  source: "towercrane-postman-lite";
  exportedAt?: string;
  collections: ApiDocImportCollection[];
};

export type ApiDocImportExportV2File = {
  version: 2;
  source: "towercrane-api-spec";
  exportedAt?: string;
  workspaces: ApiDocImportWorkspace[];
};

export type ApiDocImportWorkspace = {
  name: string;
  description?: string | null;
  icon?: string | null;
  emoji?: string | null;
  collections: ApiDocImportCollection[];
};

export type ApiDocImportCollection = {
  name: string;
  icon?: string | null;
  emoji?: string | null;
  endpoints: ApiDocImportEndpoint[];
};

export type ApiDocImportEndpoint = {
  title: string;
  method: HttpMethod;
  path: string;
  request: Omit<ApiBlockContent, "lastResponse">;
};

export type ApiDocImportResult = {
  success: boolean;
  importedWorkspaces: number;
  importedCollections: number;
  importedEndpoints: number;
  importedBlocks: number;
  importedWorkspaceIds: string[];
  importedCategoryIds: string[];
};
