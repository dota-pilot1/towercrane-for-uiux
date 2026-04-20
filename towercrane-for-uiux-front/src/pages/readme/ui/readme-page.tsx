import { useState } from 'react'
import { BookOpenText, FolderKanban, Settings } from 'lucide-react'
import { Card } from '../../../shared/ui/card'

type ReadmeTab = 'setup' | 'overview'

export function ReadmePage() {
  const [tab, setTab] = useState<ReadmeTab>('setup')

  return (
    <Card className="rounded-[28px] p-0 overflow-hidden">
      <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="border-r border-[var(--surface-border-soft)] bg-[var(--surface-muted)] p-5">
          <div className="flex items-center gap-3 text-brand-primary mb-6 font-medium">
            <BookOpenText className="size-4" />
            <span className="text-sm tracking-wide">README</span>
          </div>
          <div className="space-y-1.5 font-medium">
            <SidebarButton
              active={tab === 'setup'}
              onClick={() => setTab('setup')}
              icon={<Settings className="size-4" />}
              label="개발 환경 설정"
            />
            <SidebarButton
              active={tab === 'overview'}
              onClick={() => setTab('overview')}
              icon={<FolderKanban className="size-4" />}
              label="프로젝트 개요"
            />
          </div>
        </div>

        <div className="p-6">
          {tab === 'setup' ? <SetupPanel /> : <OverviewPanel />}
        </div>
      </div>
    </Card>
  )
}

function SidebarButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-[16px] border px-4 py-2.5 text-left text-[13px] transition ${
        active
          ? 'border-brand-border bg-brand-glass ui-text-primary'
          : 'border-transparent bg-transparent ui-text-secondary hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function SetupPanel() {
  const envRows: Array<[string, '필수' | '선택', string]> = [
    ['PORT', '선택', 'NestJS 서버 포트 (기본 3000)'],
    ['DATABASE_FILE', '선택', 'SQLite 파일 경로'],
    ['AWS_ACCESS_KEY_ID', '필수', 'S3 이미지 업로드용 IAM 키'],
    ['AWS_SECRET_ACCESS_KEY', '필수', '위 키의 시크릿'],
    ['AWS_S3_BUCKET_NAME', '필수', '이미지 업로드 버킷명'],
    ['AWS_S3_REGION', '필수', '버킷 리전 (예: ap-northeast-2)'],
    ['GEMINI_API_KEY', '선택', 'AI 기능 연동용'],
    ['OPENAI_API_KEY', '선택', 'AI 기능 연동용'],
  ]

  return (
    <div className="space-y-6">
      <header>
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary">
          Getting Started
        </span>
        <h2 className="mt-1 text-2xl font-bold ui-text-primary">개발 환경 설정</h2>
        <p className="mt-1 text-sm ui-text-secondary">
          로컬에서 프런트 / 서버를 실행하기 위한 최소 가이드입니다.
        </p>
      </header>

      <section>
        <h3 className="text-sm font-semibold ui-text-primary mb-2">1. 프런트 실행</h3>
        <pre className="ui-panel-soft rounded-2xl p-4 text-[13px] leading-6 ui-text-secondary overflow-x-auto">
{`cd towercrane-for-uiux-front
cp .env.example .env
pnpm install
pnpm dev`}
        </pre>
        <p className="mt-2 text-xs ui-text-muted">
          기본 포트 <code className="ui-text-primary">http://localhost:5174</code>, 백엔드는{' '}
          <code className="ui-text-primary">http://127.0.0.1:3000/api</code>.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold ui-text-primary mb-2">2. 서버 실행</h3>
        <pre className="ui-panel-soft rounded-2xl p-4 text-[13px] leading-6 ui-text-secondary overflow-x-auto">
{`cd towercrane-for-uiux-server
cp .env.example .env
# .env 파일 열어 AWS / AI 키 값 채우기
pnpm install
pnpm start:dev`}
        </pre>
      </section>

      <section>
        <h3 className="text-sm font-semibold ui-text-primary mb-2">
          3. 서버 <code>.env</code> 필수 키
        </h3>
        <div className="ui-panel-soft overflow-hidden rounded-2xl">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="ui-panel-soft border-b">
                <th className="px-4 py-2 font-semibold ui-text-secondary">키</th>
                <th className="px-4 py-2 font-semibold ui-text-secondary">필수</th>
                <th className="px-4 py-2 font-semibold ui-text-secondary">설명</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-border-soft)]">
              {envRows.map(([key, required, desc]) => (
                <tr key={key}>
                  <td className="px-4 py-2 font-mono ui-text-primary">{key}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        required === '필수'
                          ? 'border-brand-border bg-brand-glass text-brand-primary'
                          : 'border-[var(--surface-border-soft)] bg-[var(--surface-muted)] ui-text-secondary'
                      }`}
                    >
                      {required}
                    </span>
                  </td>
                  <td className="px-4 py-2 ui-text-secondary">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold ui-text-primary mb-2">4. S3 CORS 설정</h3>
        <p className="text-[13px] ui-text-secondary mb-2">
          브라우저에서 Presigned PUT을 직접 호출하므로 버킷에 CORS 설정이 필요합니다.
        </p>
        <pre className="ui-panel-soft rounded-2xl p-4 text-[13px] leading-6 ui-text-secondary overflow-x-auto">
{`[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["http://localhost:5174"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]`}
        </pre>
      </section>

      <section>
        <h3 className="text-sm font-semibold ui-text-primary mb-2">보안 주의</h3>
        <ul className="list-disc pl-5 text-[13px] ui-text-secondary space-y-1">
          <li>실제 AWS / OpenAI / Gemini 키는 절대 커밋 금지 (git add -f 주의).</li>
          <li>공개 저장소에 노출되면 즉시 키 회전.</li>
          <li>팀 공유는 Secret Manager 사용, 레포에는 <code>.env.example</code>만.</li>
        </ul>
      </section>
    </div>
  )
}

function OverviewPanel() {
  const projects = [
    {
      name: 'towercrane-for-uiux-front',
      bullets: [
        '왼쪽 사이드바에 카테고리를 추가할 수 있는 패턴 허브',
        '본문 영역에서 선택한 카테고리의 GitHub 프로토타입 링크를 관리',
        '프로토타입별 문서 페이지 (섹션/문서 2단 + 6종 블록 + Lexical 에디터 + Mermaid)',
      ],
      stack: ['Vite', 'React', 'TypeScript', 'Tailwind CSS', 'Radix UI', 'Zustand', 'React Query', 'TanStack Table'],
    },
    {
      name: 'towercrane-for-uiux-server',
      bullets: [
        '카테고리 / 프로토타입 / 문서 / 블록 저장 API',
        'S3 Presigned URL 발급 (Lexical 이미지 업로드용)',
        'DB 파일 교체형 운영 구조',
      ],
      stack: ['NestJS', 'Drizzle', 'SQLite'],
    },
  ]

  return (
    <div className="space-y-6">
      <header>
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary">
          Project Overview
        </span>
        <h2 className="mt-1 text-2xl font-bold ui-text-primary">towercrane-for-uiux</h2>
        <p className="mt-1 text-sm ui-text-secondary">
          UI/UX 시스템과 내부 관리자형 패턴 카탈로그를 정리하기 위한 저장소입니다.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((project) => (
          <div
            key={project.name}
            className="ui-panel-soft rounded-2xl p-5 space-y-3"
          >
            <h3 className="font-mono text-sm font-semibold ui-text-primary">{project.name}</h3>
            <ul className="list-disc pl-5 text-[13px] leading-6 ui-text-secondary space-y-1">
              {project.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {project.stack.map((s) => (
                <span
                  key={s}
                  className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border border-[var(--surface-border-soft)] bg-[var(--surface-muted)] ui-text-secondary"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
