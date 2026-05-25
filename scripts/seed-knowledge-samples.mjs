#!/usr/bin/env node

const API_BASE_URL = (
  process.env.API_BASE_URL ?? 'http://127.0.0.1:3000/api'
).replace(/\/$/, '')
const SEED_EMAIL = process.env.KNOWLEDGE_SEED_EMAIL ?? 'terecal@daum.net'
const SEED_PASSWORD = process.env.KNOWLEDGE_SEED_PASSWORD ?? 'password123'
const SEED_TOKEN = process.env.KNOWLEDGE_SEED_TOKEN

const FRONT_REPO =
  process.env.KNOWLEDGE_FRONT_REPO ??
  'https://github.com/dota-pilot1/hibot-docu-front'
const BACK_REPO =
  process.env.KNOWLEDGE_BACK_REPO ??
  'https://github.com/dota-pilot1/hibot-docu-back'

const today = new Date().toISOString().slice(0, 10)
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10)

const samples = [
  {
    channel: 'notice',
    title: 'AX 플랫폼 버전 1.0 설명회 개최',
    summary: 'AX 플랫폼 주요 기능과 이용 절차를 안내하는 온라인 설명회 일정입니다.',
    tags: ['설명회', 'AX 플랫폼', '이용 안내'],
    effectiveFrom: today,
    effectiveTo: '',
    metadata: {
      noticeType: 'general',
      priority: 'normal',
      target: '전 직원',
    },
    contentMarkdown: `# AX 플랫폼 버전 1.0 설명회 개최

AX 플랫폼 주요 기능과 이용 절차를 안내하는 온라인 설명회를 개최합니다.

## 일정

- 일시: ${today} 오후 3시
- 방식: 사내 온라인 회의
- 대상: AX 플랫폼 이용 예정자 및 관리자

## 주요 내용

- AI 서비스 신청 절차
- 지식 채널 등록과 챗봇 검색 방식
- SQL 실습 및 개발 자료 활용 방법

참석자는 사전에 궁금한 내용을 업무 관리 채널에 등록해 주세요.`,
  },
  {
    channel: 'notice',
    title: '챗봇 지식검색 파일럿 오픈 안내',
    summary: '공지사항, FAQ, AI 자료, 개발 자료를 기반으로 답변하는 지식검색 챗봇 파일럿 오픈 안내입니다.',
    tags: ['챗봇', '지식검색', '파일럿'],
    effectiveFrom: today,
    effectiveTo: '',
    metadata: {
      noticeType: 'release',
      priority: 'important',
      target: '전 직원',
    },
    contentMarkdown: `# 챗봇 지식검색 파일럿 오픈 안내

공지사항, FAQ, 개발 자료를 기반으로 답변하는 지식검색 챗봇 파일럿을 오픈합니다.

## 사용 방법

1. 챗봇 메뉴에서 지식검색 채널을 선택합니다.
2. 검색 범위를 전체, 공지사항, FAQ, 개발 자료 중 선택합니다.
3. 자연어로 질문하면 관련 chunk 검색 결과가 오른쪽 근거 패널에 표시됩니다.

## 주의 사항

검색 근거가 없는 답변은 업무 기준으로 확정하지 말고 원문 문서를 확인해야 합니다.`,
  },
  {
    channel: 'notice',
    title: 'AX 플랫폼 정기 점검 안내',
    summary: 'AX 플랫폼 안정화 작업으로 일부 기능이 일시 중단됩니다.',
    tags: ['점검', '서비스 중단', '안정화'],
    effectiveFrom: today,
    effectiveTo: tomorrow,
    metadata: {
      noticeType: 'inspection',
      priority: 'important',
      target: '전 직원',
    },
    contentMarkdown: `# AX 플랫폼 정기 점검 안내

AX 플랫폼 안정화 작업으로 일부 기능이 일시 중단됩니다.

## 점검 범위

- 챗봇 지식검색 응답 지연 가능
- 지식 채널 문서 등록 일시 중단
- SQL 실습 저장 기능 점검

## 이용 안내

점검 시간 중 작성 중인 문서는 임시 저장 후 다시 확인해 주세요.`,
  },
  {
    channel: 'notice',
    title: '프롬프트 보안 가이드 배포',
    summary: '사내 정보와 고객 정보를 AI 프롬프트에 입력할 때 지켜야 할 보안 기준입니다.',
    tags: ['보안', '프롬프트', '개인정보'],
    effectiveFrom: today,
    effectiveTo: '',
    metadata: {
      noticeType: 'policy',
      priority: 'important',
      target: '전 직원',
    },
    contentMarkdown: `# 프롬프트 보안 가이드 배포

프롬프트 보안은 AI 서비스 사용 시 사내 기밀 정보와 고객 개인정보를 보호하기 위한 기준입니다.

## 금지사항

- 고객 실명, 주민등록번호, 연락처, 계좌번호 등 개인 식별 정보를 입력하지 않습니다.
- 운영 서버 접속 정보, API Key, Access Token 및 미공개 사업 전략 문서를 입력하지 않습니다.

## 보안 검토

보안 검토가 필요한 AI 활용 사례는 AX 운영 담당자에게 사전 문의해야 합니다.`,
  },
  {
    channel: 'notice',
    title: 'AI 서비스 신청 프로세스 변경 안내',
    summary: 'AI 서비스 신청 시 목적, 데이터 범위, 보안 검토 항목을 추가로 입력해야 합니다.',
    tags: ['서비스 신청', '프로세스', '보안 검토'],
    effectiveFrom: today,
    effectiveTo: '',
    metadata: {
      noticeType: 'policy',
      priority: 'important',
      target: 'AI 서비스 신청자',
    },
    contentMarkdown: `# AI 서비스 신청 프로세스 변경 안내

AI 서비스 신청 시 목적, 데이터 범위, 보안 검토 항목을 추가로 입력해야 합니다.

## 추가 입력 항목

- 서비스 사용 목적
- 처리 데이터 범위
- 개인정보 포함 여부
- 외부 API 연동 여부
- 보안 검토 필요 여부

신청 내용이 불충분한 경우 AX 운영팀이 보완 요청을 할 수 있습니다.`,
  },
  {
    channel: 'faq',
    title: 'AI 서비스는 어떻게 신청하나요?',
    summary: '지식채널의 신청 절차 안내를 확인한 뒤 AI 서비스 신청 메뉴에서 요청서를 등록합니다.',
    tags: ['서비스 신청', '승인'],
    metadata: {
      category: 'request',
      categoryLabel: '서비스 신청',
      ownerTeam: 'AX 운영팀',
      relatedKeywords: 'AI 서비스 신청, 승인, 요청서',
    },
    contentMarkdown: `# AI 서비스는 어떻게 신청하나요?

AI 서비스 신청은 AI 서비스 신청 메뉴에서 요청서를 등록하는 방식으로 진행합니다.

## 신청 절차

1. 사용 목적과 기대 효과를 입력합니다.
2. 사용할 데이터 범위와 보안 검토 필요 여부를 선택합니다.
3. 부서 관리자 승인 후 AX 운영팀 검토가 진행됩니다.

긴급 요청은 사유를 함께 남겨야 합니다.`,
  },
  {
    channel: 'faq',
    title: '프롬프트에 고객 정보를 입력해도 되나요?',
    summary: '고객 실명, 연락처, 계좌번호 등 식별 정보는 입력하지 않는 것이 원칙입니다.',
    tags: ['보안', '개인정보'],
    metadata: {
      category: 'general',
      categoryLabel: '일반',
      ownerTeam: '보안 담당자',
      relatedKeywords: '개인정보, 프롬프트 보안, 고객 정보',
    },
    contentMarkdown: `# 프롬프트에 고객 정보를 입력해도 되나요?

고객 실명, 연락처, 계좌번호 등 식별 정보는 입력하지 않는 것이 원칙입니다.

## 권장 방식

- 식별자를 제거하거나 예시 데이터로 대체합니다.
- 업무 검토가 필요한 경우 보안 담당자에게 먼저 문의합니다.
- 대외비 문서 요약이 필요한 경우 사내 승인된 AI 서비스와 보안 정책을 확인합니다.`,
  },
  {
    channel: 'faq',
    title: '계정 권한은 누가 승인하나요?',
    summary: '기본 권한은 부서 관리자 승인, 관리자 권한은 AX 운영팀 추가 검토가 필요합니다.',
    tags: ['계정', '권한'],
    metadata: {
      category: 'account',
      categoryLabel: '계정/권한',
      ownerTeam: 'AX 운영팀',
      relatedKeywords: '계정 권한, 관리자 권한, 승인',
    },
    contentMarkdown: `# 계정 권한은 누가 승인하나요?

기본 권한은 부서 관리자가 승인합니다. 관리자 권한은 AX 운영팀의 추가 검토가 필요합니다.

## 기준

- 일반 사용자: 부서 관리자 승인
- 지식 채널 관리자: AX 운영팀 승인
- 시스템 관리자: 보안 담당자와 AX 운영팀 공동 검토`,
  },
  {
    channel: 'faq',
    title: '챗봇 답변이 사내 지식과 다를 때는 어떻게 하나요?',
    summary: '답변 근거 문서를 확인하고, 지식 채널의 원문 또는 FAQ를 수정 요청합니다.',
    tags: ['챗봇', '지식검색'],
    metadata: {
      category: 'chatbot',
      categoryLabel: '챗봇',
      ownerTeam: 'AX 운영팀',
      relatedKeywords: '챗봇 오류, 답변 수정, 지식 문서',
    },
    contentMarkdown: `# 챗봇 답변이 사내 지식과 다를 때는 어떻게 하나요?

먼저 답변 아래의 참고 문서와 오른쪽 검색 근거를 확인합니다.

## 처리 방법

1. 원문 문서가 오래된 경우 지식 채널에서 문서 수정을 요청합니다.
2. 검색 근거가 부정확하면 태그, 제목, 요약을 보완합니다.
3. 근거가 없는데 답변한 경우 챗봇 운영 담당자에게 사례를 전달합니다.`,
  },
  {
    channel: 'faq',
    title: '지식 문서는 누가 등록할 수 있나요?',
    summary: '채널별 담당자와 승인된 사용자가 공지사항, FAQ, 개발 자료를 등록할 수 있습니다.',
    tags: ['지식채널', '등록권한'],
    metadata: {
      category: 'general',
      categoryLabel: '일반',
      ownerTeam: 'AX 운영팀',
      relatedKeywords: '지식 문서 등록, 채널 담당자, 게시 권한',
    },
    contentMarkdown: `# 지식 문서는 누가 등록할 수 있나요?

채널별 담당자와 승인된 사용자가 지식 문서를 등록할 수 있습니다.

## 채널별 예시

- 공지사항: AX 운영팀
- FAQ: 업무 담당자와 운영 담당자
- 개발 자료: 프론트엔드팀, 백엔드팀, 플랫폼팀

게시 상태인 문서만 챗봇 검색 대상에 포함됩니다.`,
  },
  {
    channel: 'dev',
    title: '프론트엔드 저장소 구조와 로컬 실행 가이드',
    summary: 'hibot-docu-front React 프로젝트의 주요 폴더와 로컬 실행 절차입니다.',
    tags: ['프론트엔드', 'React', '로컬실행'],
    metadata: {
      docType: 'guide',
      docTypeLabel: '가이드',
      difficulty: 'basic',
      difficultyLabel: '기초',
      techStack: 'React, TypeScript, Vite, TanStack Router, TanStack Query',
      sourceUrl: FRONT_REPO,
      fileName: 'README.md',
      fileLocation: 'hibot-docu-front 루트 및 src 디렉터리',
      ownerTeam: '프론트엔드팀',
    },
    contentMarkdown: `# 프론트엔드 저장소 구조와 로컬 실행 가이드

hibot-docu-front는 React, TypeScript, Vite 기반의 프론트엔드 프로젝트입니다.

## 주요 구조

- src/app: 라우터와 앱 레벨 설정
- src/pages: 페이지 단위 화면
- src/features: 업무 기능 단위 모듈
- src/entities: API 타입과 도메인 모델
- src/shared: 공통 UI, API 클라이언트, 상태 저장소

## 로컬 실행

패키지를 설치한 뒤 Vite 개발 서버를 실행합니다. 기본 API 주소는 VITE_API_BASE_URL 환경 변수로 조정합니다.`,
  },
  {
    channel: 'dev',
    title: '백엔드 저장소 구조와 API 서버 실행 가이드',
    summary: 'hibot-docu-back NestJS 서버의 주요 모듈과 API 실행 절차입니다.',
    tags: ['백엔드', 'NestJS', 'API'],
    metadata: {
      docType: 'guide',
      docTypeLabel: '가이드',
      difficulty: 'basic',
      difficultyLabel: '기초',
      techStack: 'NestJS, TypeScript, SQLite, Drizzle ORM, OpenAI API',
      sourceUrl: BACK_REPO,
      fileName: 'README.md',
      fileLocation: 'hibot-docu-back 루트 및 src 디렉터리',
      ownerTeam: '백엔드팀',
    },
    contentMarkdown: `# 백엔드 저장소 구조와 API 서버 실행 가이드

hibot-docu-back는 NestJS 기반 API 서버입니다.

## 주요 구조

- src/database: SQLite 스키마와 초기화 로직
- src/auth: 로그인, 세션, 사용자 인증
- src/chatbot: 챗봇 세션, 스트리밍 응답, 지식검색 연결
- src/knowledge-base: 지식 문서 CRUD, chunk 생성, 검색 API

## 로컬 실행

DATABASE_FILE, OPENAI_API_KEY 등 환경 변수를 확인한 뒤 NestJS 개발 서버를 실행합니다.`,
  },
  {
    channel: 'dev',
    title: '디자인 시스템 토큰과 Tailwind 사용 규칙',
    summary: '프론트엔드 UI 구현 시 semantic token과 ui-* 유틸 클래스를 우선 사용하는 규칙입니다.',
    tags: ['디자인시스템', 'Tailwind', 'UI규칙'],
    metadata: {
      docType: 'design',
      docTypeLabel: '디자인',
      difficulty: 'normal',
      difficultyLabel: '일반',
      techStack: 'Tailwind CSS, CSS Variables, Design Token',
      sourceUrl: `${FRONT_REPO}/blob/main/src/index.css`,
      fileName: 'src/index.css',
      fileLocation: 'hibot-docu-front/src/index.css',
      ownerTeam: '프론트엔드팀',
    },
    contentMarkdown: `# 디자인 시스템 토큰과 Tailwind 사용 규칙

UI 색상은 raw Tailwind 팔레트 대신 semantic token을 사용합니다.

## 우선순위

1. text-text-primary, text-text-secondary, text-brand-primary 같은 semantic token을 사용합니다.
2. ui-text-primary, ui-panel, ui-icon-button, ui-input 같은 ui-* 유틸 클래스를 재사용합니다.
3. 필요한 경우 CSS 변수 var(--surface-muted), var(--surface-border)를 직접 참조합니다.

## 금지 예시

- text-white
- text-slate-400
- bg-slate-950
- text-emerald-400
- border-slate-200`,
  },
  {
    channel: 'dev',
    title: '지식검색 챗봇과 chunk 검색 연결 구조',
    summary: '공지사항, FAQ, 개발 자료를 chunk 검색으로 찾고 GPT 답변 근거로 전달하는 구조입니다.',
    tags: ['지식검색', '챗봇', 'chunk'],
    metadata: {
      docType: 'api',
      docTypeLabel: 'API',
      difficulty: 'advanced',
      difficultyLabel: '심화',
      techStack: 'React, NestJS, SSE, OpenAI API, SQLite',
      sourceUrl: BACK_REPO,
      fileName: 'src/chatbot, src/knowledge-base',
      fileLocation: 'hibot-docu-back/src/chatbot 및 src/knowledge-base',
      ownerTeam: 'AX 플랫폼팀',
    },
    contentMarkdown: `# 지식검색 챗봇과 chunk 검색 연결 구조

지식검색 챗봇은 사용자의 질문을 먼저 knowledge chunk DB에서 검색한 뒤, 검색 결과를 GPT에게 참고 문서로 전달합니다.

## 처리 흐름

1. 사용자가 질문을 보냅니다.
2. 백엔드는 선택된 채널 범위에 따라 chunk 검색을 수행합니다.
3. 검색 결과에는 문서 ID, 채널, 제목, 요약, snippet, 원문 URL이 포함됩니다.
4. GPT는 검색된 근거만 참고해서 답변을 생성합니다.
5. 프론트는 답변 아래와 오른쪽 검색 근거 패널에 참고 문서를 표시합니다.`,
  },
  {
    channel: 'dev',
    title: '프론트와 백엔드 API 연동 및 인증 헤더 가이드',
    summary: '프론트 API 클라이언트가 백엔드 API를 호출할 때 사용하는 Base URL과 Bearer 토큰 규칙입니다.',
    tags: ['API연동', '인증', 'Bearer'],
    metadata: {
      docType: 'api',
      docTypeLabel: 'API',
      difficulty: 'normal',
      difficultyLabel: '일반',
      techStack: 'React, Fetch API, JWT Session, NestJS',
      sourceUrl: `${FRONT_REPO}/blob/main/src/shared/api/http.ts`,
      fileName: 'src/shared/api/http.ts',
      fileLocation: 'hibot-docu-front/src/shared/api/http.ts',
      ownerTeam: '프론트엔드팀',
    },
    contentMarkdown: `# 프론트와 백엔드 API 연동 및 인증 헤더 가이드

프론트엔드는 공통 API 클라이언트를 통해 백엔드 API를 호출합니다.

## 기본 규칙

- API Base URL은 VITE_API_BASE_URL 환경 변수로 설정합니다.
- 환경 변수가 없으면 기본값으로 http://127.0.0.1:3000/api 를 사용합니다.
- 로그인 후 저장된 세션 토큰을 Authorization: Bearer 토큰 형식으로 전달합니다.
- FormData 요청은 Content-Type을 직접 지정하지 않습니다.

## 오류 처리

- 401 응답이 오면 세션을 초기화합니다.
- JSON 응답의 message 필드를 사용자 오류 메시지로 표시합니다.`,
  },
]

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${response.status} ${body}`)
  }

  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

async function getToken() {
  if (SEED_TOKEN) return SEED_TOKEN
  const session = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }),
  })
  return session.token
}

async function listExistingByTitle(token, channel) {
  const result = await request(
    `/knowledge/documents?channel=${channel}&page=1&pageSize=100`,
    { token },
  )
  return new Map(result.items.map((item) => [item.title, item]))
}

async function main() {
  const token = await getToken()
  const byChannel = new Map()
  const created = []
  const updated = []

  for (const sample of samples) {
    if (!byChannel.has(sample.channel)) {
      byChannel.set(sample.channel, await listExistingByTitle(token, sample.channel))
    }

    const payload = {
      channel: sample.channel,
      title: sample.title,
      summary: sample.summary,
      contentMarkdown: sample.contentMarkdown,
      tags: sample.tags,
      status: 'published',
      visibility: 'all',
      effectiveFrom: sample.effectiveFrom ?? '',
      effectiveTo: sample.effectiveTo ?? '',
      metadata: sample.metadata,
    }

    const existing = byChannel.get(sample.channel).get(sample.title)
    if (existing) {
      const document = await request(`/knowledge/documents/${existing.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(payload),
      })
      updated.push({ channel: document.channel, title: document.title, id: document.id })
      continue
    }

    const document = await request('/knowledge/documents', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    })
    created.push({ channel: document.channel, title: document.title, id: document.id })
    byChannel.get(sample.channel).set(document.title, document)
  }

  console.log(
    JSON.stringify(
      {
        apiBaseUrl: API_BASE_URL,
        createdCount: created.length,
        updatedCount: updated.length,
        created,
        updated,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
