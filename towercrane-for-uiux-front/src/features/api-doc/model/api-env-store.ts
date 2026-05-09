import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { API_BASE_URL } from '../../../shared/api/http'
import type { ApiEnvironment } from '../../../entities/api-doc/model/types'
import { getApiBaseOrigin } from '../../../entities/api-doc/model/types'

const DEFAULT_ENVIRONMENTS: ApiEnvironment[] = [
  {
    id: 'local',
    name: '로컬',
    variables: [
      { key: 'BASE_URL', value: getApiBaseOrigin(), description: '로컬 API origin' },
      { key: 'API_BASE', value: API_BASE_URL, description: '로컬 API base' },
      { key: 'TOKEN', value: '', description: '직접 지정할 토큰' },
    ],
  },
  {
    id: 'dev',
    name: '개발',
    variables: [
      { key: 'BASE_URL', value: 'https://dev-api.example.com', description: '개발 서버 origin' },
      { key: 'API_BASE', value: 'https://dev-api.example.com/api', description: '개발 API base' },
      { key: 'TOKEN', value: '', description: '직접 지정할 토큰' },
    ],
  },
  {
    id: 'prod',
    name: '운영',
    variables: [
      { key: 'BASE_URL', value: 'https://api.example.com', description: '운영 서버 origin' },
      { key: 'API_BASE', value: 'https://api.example.com/api', description: '운영 API base' },
      { key: 'TOKEN', value: '', description: '직접 지정할 토큰' },
    ],
  },
]

type ApiEnvState = {
  environments: ApiEnvironment[]
  activeEnvId: string
  setActiveEnv: (id: string) => void
  updateEnvironments: (environments: ApiEnvironment[]) => void
  getActiveVarsMap: () => Record<string, string>
}

export const useApiEnvStore = create<ApiEnvState>()(
  persist(
    (set, get) => ({
      environments: DEFAULT_ENVIRONMENTS,
      activeEnvId: 'local',
      setActiveEnv: (activeEnvId) => set({ activeEnvId }),
      updateEnvironments: (environments) => set({ environments }),
      getActiveVarsMap: () => {
        const { environments, activeEnvId } = get()
        const active = environments.find((env) => env.id === activeEnvId)
        return Object.fromEntries((active?.variables ?? []).map((item) => [item.key, item.value]))
      },
    }),
    {
      name: 'towercrane-api-doc-env-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

