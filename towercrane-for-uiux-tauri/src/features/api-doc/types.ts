import { API_BASE_URL } from "./http";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type BodyType = "none" | "json" | "raw";

export type ApiDocTeam = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  emoji?: string | null;
  orderIdx: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  categoryCount?: number;
  endpointCount?: number;
};

export type ApiDocCategory = {
  id: string;
  teamId?: string | null;
  name: string;
  icon?: string | null;
  emoji?: string | null;
  orderIdx: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiDocEndpoint = {
  id: string;
  categoryId: string;
  title: string;
  method: HttpMethod;
  path: string;
  orderIdx: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiDocBlock = {
  id?: string;
  endpointId?: string;
  blockType: "API";
  content: string;
  orderIdx?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type KeyValueItem = {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
};

export type ApiResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
  timestamp: string;
};

export type ApiBlockContent = {
  method: HttpMethod;
  url: string;
  authEnabled: boolean;
  headers: KeyValueItem[];
  params: KeyValueItem[];
  body: {
    type: BodyType;
    content: string;
  };
  description?: string;
  lastResponse?: ApiResponse | null;
};

export type ApiEnvironmentVariable = {
  key: string;
  value: string;
  description?: string;
};

export type ApiEnvironment = {
  id: string;
  name: string;
  variables: ApiEnvironmentVariable[];
};

export type CreateApiDocTeamRequest = {
  name: string;
  description?: string | null;
  icon?: string | null;
  emoji?: string | null;
};

export type UpdateApiDocTeamRequest = Partial<CreateApiDocTeamRequest>;

export type CreateApiDocCategoryRequest = {
  teamId?: string | null;
  name: string;
  icon?: string | null;
  emoji?: string | null;
};

export type UpdateApiDocCategoryRequest = Partial<CreateApiDocCategoryRequest>;

export type CreateApiDocEndpointRequest = {
  categoryId: string;
  title: string;
  method: HttpMethod;
  path: string;
};

export type UpdateApiDocEndpointRequest = Partial<CreateApiDocEndpointRequest>;

export function getApiBaseOrigin() {
  return API_BASE_URL.replace(/\/api\/?$/, "");
}

export function createDefaultApiBlockContent(
  endpoint?: Pick<ApiDocEndpoint, "method" | "path"> | null,
): ApiBlockContent {
  const path = endpoint?.path?.trim();
  return {
    method: endpoint?.method ?? "GET",
    url: path
      ? path.startsWith("http") || path.startsWith("{{")
        ? path
        : `{{API_BASE}}${path.startsWith("/") ? path : `/${path}`}`
      : "{{API_BASE}}/endpoint",
    authEnabled: true,
    headers: [
      { key: "Content-Type", value: "application/json", enabled: true },
    ],
    params: [],
    body: { type: "none", content: "" },
    description: "",
    lastResponse: null,
  };
}

export function parseApiBlockContent(
  blocks: ApiDocBlock[],
  endpoint?: Pick<ApiDocEndpoint, "method" | "path"> | null,
) {
  const block = blocks.find((item) => item.blockType === "API");
  if (!block) return createDefaultApiBlockContent(endpoint);

  try {
    const parsed = JSON.parse(block.content) as Partial<ApiBlockContent>;
    return {
      ...createDefaultApiBlockContent(endpoint),
      ...parsed,
      body: {
        ...createDefaultApiBlockContent(endpoint).body,
        ...parsed.body,
      },
    };
  } catch {
    return createDefaultApiBlockContent(endpoint);
  }
}

export function resolveEnvVars(text: string, envVars: Record<string, string>) {
  return text.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => envVars[key] ?? `{{${key}}}`,
  );
}

export function isJsonString(text: string) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

export function prettyJson(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
