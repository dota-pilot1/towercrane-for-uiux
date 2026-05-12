import type {
  SqlExampleLevel,
  SqlPracticeExample,
  SqlPracticeExampleSet,
} from '../../../../entities/sql-practice/model/example-types'

export type SqlExampleSpec = {
  title: string
  relatedTables: string[]
  sql: string
  description?: string
  hint?: string
  explanation?: string
}

type SqlExampleSpecMap = Record<SqlExampleLevel, SqlExampleSpec[]>

export function defineExampleSet(
  seedFile: string,
  examples: SqlExampleSpecMap,
): SqlPracticeExampleSet {
  return {
    seedFile,
    beginner: buildExamples(seedFile, 'beginner', examples.beginner),
    intermediate: buildExamples(seedFile, 'intermediate', examples.intermediate),
    advanced: buildExamples(seedFile, 'advanced', examples.advanced),
  }
}

function buildExamples(
  seedFile: string,
  level: SqlExampleLevel,
  examples: SqlExampleSpec[],
): SqlPracticeExample[] {
  const seedSlug = seedFile.replace(/\.sql$/, '')

  return examples.map((example, index) => {
    const order = index + 1
    const relatedTables = example.relatedTables

    return {
      id: `${seedSlug}.${level}.${String(order).padStart(2, '0')}`,
      seedFile,
      level,
      order,
      title: example.title,
      description: example.description ?? buildDefaultDescription(example),
      relatedTables,
      hint: example.hint ?? buildDefaultHint(example.sql),
      answerSql: example.sql,
      explanation: example.explanation ?? buildDefaultExplanation(example.sql),
    }
  })
}

function buildDefaultDescription(example: SqlExampleSpec): string {
  const sql = example.sql
  const parts: string[] = []
  const selectText = formatSelectList(extractSelectClause(sql))
  const sourceText = formatSourceText(example.relatedTables, hasJoin(sql))
  const rowNoun = getRowNoun(example.relatedTables)

  parts.push(
    selectText
      ? `${sourceText} ${selectText}을(를) 출력하세요.`
      : `${sourceText} 결과를 만드세요.`,
  )

  const whereText = formatCondition(extractClause(sql, 'WHERE'))
  if (whereText) {
    parts.push(`조건: ${whereText}.`)
  }

  const groupByText = formatExpressionList(extractClause(sql, 'GROUP BY'))
  if (groupByText) {
    parts.push(`${groupByText}별로 묶어 집계하세요.`)
  }

  const havingText = formatCondition(extractClause(sql, 'HAVING'))
  if (havingText) {
    parts.push(`집계 조건: ${havingText}.`)
  }

  const orderAndLimitText = formatOrderAndLimit(
    extractClause(sql, 'ORDER BY'),
    extractClause(sql, 'LIMIT'),
    rowNoun,
  )
  if (orderAndLimitText) {
    parts.push(orderAndLimitText)
  }

  if (hasWith(sql)) {
    parts.push('WITH 절로 중간 결과를 먼저 만든 뒤 최종 결과를 조회하세요.')
  }

  return parts.join(' ')
}

function buildDefaultHint(sql: string): string {
  const hints: string[] = []
  const selectText = formatSelectList(extractSelectClause(sql))
  const whereText = formatCondition(extractClause(sql, 'WHERE'))
  const groupByText = formatExpressionList(extractClause(sql, 'GROUP BY'))
  const havingText = formatCondition(extractClause(sql, 'HAVING'))
  const orderText = formatOrderBy(extractClause(sql, 'ORDER BY'))
  const limitText = formatLimit(extractClause(sql, 'LIMIT'))

  if (selectText) {
    hints.push(`SELECT에는 ${selectText}을(를) 나열하세요.`)
  }

  if (hasWith(sql)) {
    hints.push('반복되는 집계는 WITH 절로 이름을 붙여 분리하세요.')
  }

  const hasLeft = /\bLEFT\s+JOIN\b/i.test(sql)
  if (hasLeft) {
    hints.push('매칭되지 않은 행도 남겨야 하므로 LEFT JOIN을 사용하세요.')
  } else if (hasJoin(sql)) {
    hints.push('관련 테이블을 FK 컬럼으로 JOIN하세요.')
  }

  if (whereText) {
    hints.push(`WHERE 조건은 ${whereText}입니다.`)
  }

  if (groupByText) {
    hints.push(`GROUP BY 기준은 ${groupByText}입니다.`)
  }

  if (havingText) {
    hints.push(`집계 후에는 HAVING으로 ${havingText} 조건을 적용하세요.`)
  }

  if (hasWindowFunction(sql)) {
    hints.push('그룹별 순위는 ROW_NUMBER/RANK + PARTITION BY로 계산할 수 있습니다.')
  }

  if (orderText) {
    hints.push(`ORDER BY 기준은 ${orderText}입니다.`)
  }

  if (limitText) {
    hints.push(`마지막에 LIMIT ${limitText}을 붙이세요.`)
  }

  return (
    hints.join(' ') ||
    'SELECT에 필요한 컬럼을 나열하고 FROM에 대상 테이블을 지정하세요.'
  )
}

function buildDefaultExplanation(sql: string): string {
  const hasLeft = /\bLEFT\s+JOIN\b/i.test(sql)
  const where = extractClause(sql, 'WHERE')
  const whereText = formatCondition(where)
  const groupByText = formatExpressionList(extractClause(sql, 'GROUP BY'))
  const havingText = formatCondition(extractClause(sql, 'HAVING'))
  const orderBy = extractClause(sql, 'ORDER BY')
  const orderText = formatOrderBy(orderBy)
  const limit = extractClause(sql, 'LIMIT')

  const parts: string[] = []

  if (hasWindowFunction(sql)) {
    parts.push('윈도우 함수는 원본 행을 유지한 채 순위나 비율을 계산합니다.')
  }

  if (hasLeft && where && /IS\s+NULL/i.test(where)) {
    parts.push('LEFT JOIN 후 오른쪽 값이 비어 있는 행만 남기는 안티조인 패턴입니다.')
  } else if (hasLeft) {
    parts.push('LEFT JOIN으로 매칭되지 않는 행까지 결과에 포함합니다.')
  } else if (hasJoin(sql)) {
    parts.push('JOIN으로 관련 테이블을 연결합니다.')
  }

  if (whereText) {
    parts.push(`WHERE는 ${whereText} 조건을 적용합니다.`)
  }

  if (groupByText) {
    parts.push(`${groupByText} 단위로 GROUP BY 집계를 수행합니다.`)
  }

  if (havingText) {
    parts.push(`HAVING은 집계 결과 중 ${havingText} 조건만 남깁니다.`)
  }

  if (orderText) {
    parts.push(`ORDER BY는 ${orderText} 기준을 사용합니다.`)
  }

  const limitText = formatLimit(limit)
  if (limitText) {
    parts.push(`LIMIT으로 정렬 또는 조회 결과를 ${limitText}만 남깁니다.`)
  }

  if (hasWith(sql)) {
    parts.push('WITH 절은 중간 결과를 분리해 본 쿼리를 읽기 쉽게 만듭니다.')
  }

  if (parts.length > 0) {
    return parts.join(' ')
  }

  return 'SELECT에 필요한 컬럼을 나열하고 FROM에 대상 테이블을 지정하는 기본 조회 쿼리입니다.'
}

const tableNounByName: Record<string, string> = {
  accounts: '거래처',
  activities: '활동',
  agents: '상담원',
  attendance_logs: '근태 로그',
  blackout_periods: '차단 기간',
  boards: '게시판',
  campaigns: '캠페인',
  clients: '고객사',
  comments: '댓글',
  contacts: '연락처',
  contracts: '계약',
  customers: '고객',
  departments: '부서',
  devices: '기기',
  employees: '직원',
  events: '이벤트',
  fees: '수수료',
  leads: '리드',
  likes: '좋아요',
  meetings: '회의',
  members: '멤버',
  merchants: '가맹점',
  opportunities: '영업기회',
  order_items: '주문 상품',
  orders: '주문',
  pages: '페이지',
  payments: '결제',
  posts: '게시글',
  products: '상품',
  projects: '프로젝트',
  purchase_orders: '발주',
  receivables: '미수금',
  refunds: '환불',
  reservations: '예약',
  resources: '리소스',
  sales_reps: '영업 담당자',
  sessions: '세션',
  settlements: '정산',
  shipments: '배송',
  stock_movements: '재고 이동',
  stock_snapshots: '재고 현황',
  suppliers: '공급사',
  tasks: '업무',
  tickets: '티켓',
  users: '사용자',
  warehouses: '창고',
}

const identifierLabels: Record<string, string> = {
  abnormal: '이상',
  account: '거래처',
  active: '활성',
  actual: '실제',
  agent: '상담원',
  amount: '금액',
  approved: '승인',
  assignee: '담당자',
  attendance: '근태',
  attendee: '참석자',
  avg: '평균',
  bio: '소개',
  board: '게시판',
  budget: '예산',
  campaign: '캠페인',
  capacity: '수용 인원',
  carrier: '배송사',
  category: '카테고리',
  changed: '변경',
  channel: '채널',
  city: '도시',
  client: '고객사',
  clock: '출근',
  comment: '댓글',
  company: '회사',
  confirmed: '확정',
  contact: '담당자',
  content: '내용',
  contract: '계약',
  conversion: '전환',
  converted: '전환',
  cost: '원가',
  count: '수',
  created: '생성',
  customer: '고객',
  date: '날짜',
  days: '일수',
  delay: '지연',
  delivered: '배송 완료',
  delivery: '배송',
  department: '부서',
  dept: '부서',
  device: '기기',
  diff: '차이',
  done: '완료',
  due: '마감',
  duty: '역할',
  email: '이메일',
  employee: '직원',
  end: '종료',
  ended: '종료',
  ends: '종료',
  engagement: '참여도',
  estimate: '예상',
  event: '이벤트',
  expected: '예상',
  fee: '수수료',
  first: '첫',
  from: '이전',
  grade: '등급',
  headcount: '인원',
  held: '개최',
  high: '높은',
  hire: '입사',
  hired: '입사',
  hours: '시간',
  id: 'ID',
  industry: '업종',
  inventory: '재고',
  invited: '초대',
  item: '항목',
  lead: '리드',
  leave: '휴가',
  like: '좋아요',
  location: '위치',
  manager: '관리자',
  meeting: '회의',
  member: '멤버',
  merchant: '가맹점',
  message: '메시지',
  method: '수단',
  month: '월',
  movement: '이동',
  name: '이름',
  net: '순',
  normal: '정상',
  open: '미해결',
  opportunity: '영업기회',
  order: '주문',
  ordered: '주문',
  page: '페이지',
  paid: '결제',
  parent: '상위',
  payment: '결제',
  payout: '지급',
  phone: '전화번호',
  pipeline: '파이프라인',
  plan: '플랜',
  position: '직책',
  post: '게시글',
  price: '가격',
  priority: '우선순위',
  product: '상품',
  profile: '프로필',
  project: '프로젝트',
  purchase: '구매',
  qty: '수량',
  quantity: '수량',
  rank: '순위',
  rate: '비율',
  receivable: '미수금',
  received: '입고',
  reference: '참조',
  refund: '환불',
  region: '지역',
  remaining: '남은',
  rep: '담당자',
  reply: '대댓글',
  request: '신청',
  requested: '요청',
  reservation: '예약',
  reserved: '예약',
  resolution: '해결',
  resolved: '해결',
  resource: '리소스',
  revenue: '매출',
  risk: '리스크',
  role: '역할',
  running: '누적',
  safety: '안전재고',
  salary: '연봉',
  sales: '영업',
  score: '점수',
  session: '세션',
  settled: '정산 완료',
  settlement: '정산',
  shipment: '배송',
  shipped: '발송',
  signed: '계약',
  signup: '가입',
  sku: 'SKU',
  sold: '판매',
  source: '유입 경로',
  stage: '단계',
  start: '시작',
  started: '시작',
  starts: '시작',
  status: '상태',
  step: '단계',
  stock: '재고',
  subject: '제목',
  supplier: '공급사',
  tag: '태그',
  task: '업무',
  team: '팀',
  ticket: '티켓',
  title: '제목',
  to: '변경 후',
  total: '합계',
  transition: '전환',
  type: '유형',
  unit: '단가',
  user: '사용자',
  value: '값',
  views: '조회수',
  visit: '방문',
  warehouse: '창고',
  weekday: '요일',
  work: '근무',
}

function hasWith(sql: string): boolean {
  return /^\s*WITH\b/i.test(sql)
}

function hasJoin(sql: string): boolean {
  return /\bJOIN\b/i.test(sql)
}

function hasWindowFunction(sql: string): boolean {
  return /\bOVER\s*\(/i.test(sql)
}

function extractClause(sql: string, clauseName: string): string | null {
  const normalizedSql = normalizeSql(sql)
  const selectIndex = findTopLevelKeyword(normalizedSql, 'SELECT', 0)

  if (selectIndex < 0) {
    return null
  }

  const clauseIndex = findTopLevelKeyword(
    normalizedSql,
    clauseName,
    selectIndex + 'SELECT'.length,
  )

  if (clauseIndex < 0) {
    return null
  }

  const afterClauseStart = clauseIndex + clauseName.length
  const nextClauseIndex = findNextTopLevelClauseIndex(
    normalizedSql,
    afterClauseStart,
  )
  const clauseValue =
    nextClauseIndex < 0
      ? normalizedSql.slice(afterClauseStart)
      : normalizedSql.slice(afterClauseStart, nextClauseIndex)

  return clauseValue.replace(/;$/, '').trim() || null
}

function findTopLevelKeyword(
  sql: string,
  keyword: string,
  startIndex: number,
): number {
  let depth = 0
  let quote: "'" | '"' | null = null
  const normalizedKeyword = keyword.toUpperCase()

  for (let index = startIndex; index < sql.length; index += 1) {
    const char = sql[index]
    const previousChar = sql[index - 1]

    if (quote) {
      if (char === quote && previousChar !== '\\') {
        quote = null
      }
      continue
    }

    if (char === "'" || char === '"') {
      quote = char
      continue
    }

    if (char === '(') {
      depth += 1
      continue
    }

    if (char === ')') {
      depth = Math.max(depth - 1, 0)
      continue
    }

    if (
      depth === 0 &&
      sql.slice(index, index + keyword.length).toUpperCase() ===
        normalizedKeyword &&
      isKeywordBoundary(sql[index - 1]) &&
      isKeywordBoundary(sql[index + keyword.length])
    ) {
      return index
    }
  }

  return -1
}

function findNextTopLevelClauseIndex(sql: string, startIndex: number): number {
  const clauseNames = ['WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT']
  const clauseIndexes = clauseNames
    .map((clauseName) => findTopLevelKeyword(sql, clauseName, startIndex))
    .filter((index) => index >= 0)

  return clauseIndexes.length > 0 ? Math.min(...clauseIndexes) : -1
}

function isKeywordBoundary(char: string | undefined): boolean {
  return !char || !/[A-Z0-9_]/i.test(char)
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim()
}
