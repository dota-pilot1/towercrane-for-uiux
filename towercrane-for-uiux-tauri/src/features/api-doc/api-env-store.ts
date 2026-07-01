import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { API_BASE_URL } from "./http";
import { getApiBaseOrigin, type ApiEnvironment } from "./types";

const DEFAULT_ENVIRONMENTS: ApiEnvironment[] = [
  {
    id: "local",
    name: "로컬",
    variables: [
      { key: "BASE_URL", value: getApiBaseOrigin(), description: "로컬 API origin" },
      { key: "API_BASE", value: API_BASE_URL, description: "로컬 API base" },
      { key: "TOKEN", value: "", description: "직접 지정할 토큰" },
    ],
  },
  {
    id: "dev",
    name: "개발",
    variables: [
      { key: "BASE_URL", value: "https://dev-api.example.com", description: "개발 서버 origin" },
      { key: "API_BASE", value: "https://dev-api.example.com/api", description: "개발 API base" },
      { key: "TOKEN", value: "", description: "직접 지정할 토큰" },
    ],
  },
  {
    id: "prod",
    name: "운영",
    variables: [
      { key: "BASE_URL", value: "https://api.example.com", description: "운영 서버 origin" },
      { key: "API_BASE", value: "https://api.example.com/api", description: "운영 API base" },
      { key: "TOKEN", value: "", description: "직접 지정할 토큰" },
    ],
  },
];

const STANDARD_ENV_KEYS: Record<string, string> = {
  api_base: "API_BASE",
  base_url: "BASE_URL",
  token: "TOKEN",
};

function normalizeEnvKey(key: string) {
  const trimmedKey = key.trim();
  return STANDARD_ENV_KEYS[trimmedKey.toLowerCase()] ?? trimmedKey;
}

function normalizeVariables(
  variables: ApiEnvironment["variables"],
  defaultVariables: ApiEnvironment["variables"] = [],
) {
  const merged = new Map<string, ApiEnvironment["variables"][number]>();

  defaultVariables.forEach((variable) => {
    merged.set(variable.key, variable);
  });

  variables.forEach((variable) => {
    const key = normalizeEnvKey(variable.key);
    if (!key) return;
    merged.set(key, { ...variable, key });
  });

  return Array.from(merged.values());
}

function normalizeEnvironments(environments: ApiEnvironment[]) {
  const normalizedDefaultEnvs = DEFAULT_ENVIRONMENTS.map((defaultEnv) => {
    const savedEnv = environments.find((env) => env.id === defaultEnv.id);
    return {
      ...defaultEnv,
      ...savedEnv,
      variables: normalizeVariables(savedEnv?.variables ?? [], defaultEnv.variables),
    };
  });

  const customEnvs = environments
    .filter((env) => !DEFAULT_ENVIRONMENTS.some((defaultEnv) => defaultEnv.id === env.id))
    .map((env) => ({
      ...env,
      variables: normalizeVariables(env.variables),
    }));

  return [...normalizedDefaultEnvs, ...customEnvs];
}

function getEnvVarsMap(environment: ApiEnvironment | undefined) {
  return Object.fromEntries(
    (environment?.variables ?? []).map((item) => [normalizeEnvKey(item.key), item.value]),
  );
}

type ApiEnvState = {
  environments: ApiEnvironment[];
  activeEnvId: string;
  setActiveEnv: (id: string) => void;
  updateEnvironments: (environments: ApiEnvironment[]) => void;
  getActiveVarsMap: () => Record<string, string>;
};

export const useApiEnvStore = create<ApiEnvState>()(
  persist(
    (set, get) => ({
      environments: DEFAULT_ENVIRONMENTS,
      activeEnvId: "local",
      setActiveEnv: (activeEnvId) => set({ activeEnvId }),
      updateEnvironments: (environments) =>
        set({ environments: normalizeEnvironments(environments) }),
      getActiveVarsMap: () => {
        const { environments, activeEnvId } = get();
        const normalizedEnvironments = normalizeEnvironments(environments);
        const active =
          normalizedEnvironments.find((env) => env.id === activeEnvId) ??
          normalizedEnvironments[0];
        return getEnvVarsMap(active);
      },
    }),
    {
      name: "towercrane-tauri-api-doc-env-store",
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<ApiEnvState> | undefined;
        return {
          ...currentState,
          ...state,
          environments: normalizeEnvironments(state?.environments ?? currentState.environments),
          activeEnvId: state?.activeEnvId ?? currentState.activeEnvId,
        };
      },
    },
  ),
);
