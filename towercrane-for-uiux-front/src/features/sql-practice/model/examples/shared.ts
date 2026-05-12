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
  const tables = example.relatedTables
  const tableText =
    tables.length === 1 ? `${tables[0]} 테이블` : `${tables.join(', ')} 테이블`

  const parts: string[] = []

  // 주요 동작 문장
  if (hasWith(sql)) {
    parts.push(`${tableText}에서 단계적으로 집계한 뒤 최종 결과를 조회하세요.`)
  } else if (hasJoin(sql)) {
    parts.push(`${tableText}을(를) 연결하여 필요한 데이터를 조회하세요.`)
  } else if (extractClause(sql, 'GROUP BY')) {
    parts.push(`${tableText}의 데이터를 그룹별로 집계하여 조회하세요.`)
  } else {
    parts.push(`${tableText}에서 조건에 맞는 데이터를 조회하세요.`)
  }

  // WHERE 조건: raw SQL 노출 없이 유무만 표현
  if (extractClause(sql, 'WHERE')) {
    parts.push('특정 조건으로 결과를 필터링합니다.')
  }

  // HAVING
  if (extractClause(sql, 'HAVING')) {
    parts.push('집계 결과에 추가 조건을 적용합니다.')
  }

  // ORDER BY: 방향만 자연어로 — ASC/DESC 키워드 노출 금지
  const orderBy = extractClause(sql, 'ORDER BY')
  if (orderBy) {
    const hasDesc = /\bDESC\b/i.test(orderBy)
    const hasAsc = /\bASC\b/i.test(orderBy)
    let direction: string
    if (hasDesc && hasAsc) direction = '복합 기준으로'
    else if (hasDesc) direction = '내림차순으로'
    else direction = '오름차순으로'
    parts.push(`결과를 ${direction} 정렬하세요.`)
  }

  // LIMIT: 숫자만 추출
  const limit = extractClause(sql, 'LIMIT')
  if (limit) {
    const n = limit.trim().split(/\s+/)[0]
    parts.push(`상위 ${n}건만 출력합니다.`)
  }

  return parts.join(' ')
}

function buildDefaultHint(sql: string): string {
  const hints: string[] = []

  if (hasWith(sql)) {
    hints.push('복잡한 집계는 CTE(WITH 절)로 중간 단계를 분리해보세요.')
  }

  const hasLeft = /\bLEFT\s+JOIN\b/i.test(sql)
  if (hasLeft) {
    hints.push('연결되지 않은 행도 결과에 포함하려면 LEFT JOIN을 사용하세요.')
  } else if (hasJoin(sql)) {
    hints.push('관련 테이블을 FK 컬럼으로 JOIN하세요.')
  }

  if (extractClause(sql, 'WHERE')) {
    hints.push('WHERE 절로 필요한 행만 골라내세요.')
  }

  if (extractClause(sql, 'GROUP BY')) {
    hints.push('집계 함수(COUNT/SUM/AVG)와 GROUP BY를 함께 사용하세요.')
  }

  if (extractClause(sql, 'HAVING')) {
    hints.push('집계 결과를 조건으로 거를 때는 WHERE가 아니라 HAVING입니다.')
  }

  if (hasWindowFunction(sql)) {
    hints.push('그룹별 순위는 ROW_NUMBER/RANK + PARTITION BY로 계산할 수 있습니다.')
  }

  const orderBy = extractClause(sql, 'ORDER BY')
  if (orderBy) {
    const hasDesc = /\bDESC\b/i.test(orderBy)
    const hasAsc = /\bASC\b/i.test(orderBy)
    if (hasDesc && hasAsc) {
      hints.push('정렬 기준이 두 개 이상이면 ORDER BY에 쉼표로 나열하세요.')
    } else if (hasDesc) {
      hints.push('큰 값부터 보려면 ORDER BY에 DESC를 명시하세요.')
    } else {
      hints.push('작은 값부터 보려면 ORDER BY 기본값(ASC)을 사용하세요.')
    }
  }

  if (extractClause(sql, 'LIMIT')) {
    hints.push('정렬 후 상위 N건만 가져오려면 LIMIT을 추가하세요.')
  }

  return (
    hints.join(' ') ||
    'SELECT에 필요한 컬럼을 나열하고 FROM에 대상 테이블을 지정하세요.'
  )
}

function buildDefaultExplanation(sql: string): string {
  const hasLeft = /\bLEFT\s+JOIN\b/i.test(sql)
  const where = extractClause(sql, 'WHERE')
  const orderBy = extractClause(sql, 'ORDER BY')
  const limit = extractClause(sql, 'LIMIT')

  // 복합 패턴부터 먼저 매칭
  if (hasWith(sql) && hasWindowFunction(sql)) {
    return 'CTE(WITH 절)로 중간 집계를 분리한 뒤 윈도우 함수로 순위·비율을 계산합니다. 단계를 나눠 복잡한 쿼리를 읽기 쉽게 만드는 패턴입니다.'
  }

  if (hasWith(sql)) {
    return 'WITH 절(CTE)로 중간 결과에 이름을 붙여 분리하면 본 쿼리에서 재사용할 수 있어 복잡한 집계가 한결 깔끔해집니다.'
  }

  if (hasWindowFunction(sql)) {
    return 'OVER(PARTITION BY ...)는 그룹별 순위나 비율을 행 단위로 계산하는 윈도우 함수입니다. GROUP BY와 달리 원본 행을 유지한 채 추가 값을 계산합니다.'
  }

  if (hasLeft && where && /IS\s+NULL/i.test(where)) {
    return 'LEFT JOIN 후 오른쪽 테이블 값이 NULL인 행만 남기는 안티조인 패턴입니다. 한쪽에만 존재하는 데이터를 찾을 때 NOT IN보다 안전합니다.'
  }

  if (extractClause(sql, 'HAVING')) {
    return 'HAVING은 집계 후 그룹을 거르는 절입니다. WHERE는 집계 전에, HAVING은 집계 후에 조건을 적용한다는 차이를 기억하세요.'
  }

  if (extractClause(sql, 'GROUP BY') && hasLeft) {
    return 'LEFT JOIN으로 매칭되지 않는 경우도 포함한 뒤 GROUP BY로 집계합니다. COUNT(오른쪽.id)는 매칭이 없을 때 0으로 집계되어 NULL 대신 0이 나옵니다.'
  }

  if (extractClause(sql, 'GROUP BY')) {
    return 'GROUP BY는 지정한 컬럼이 같은 행끼리 묶어 COUNT·SUM·AVG 같은 집계 함수를 적용합니다. SELECT에는 그룹화 컬럼과 집계 함수만 올 수 있습니다.'
  }

  if (hasLeft) {
    return 'LEFT JOIN은 왼쪽 테이블의 모든 행을 보존하고, 오른쪽에 매칭이 없으면 NULL로 채웁니다. 누락된 데이터까지 포함해야 할 때 사용합니다.'
  }

  if (hasJoin(sql)) {
    return 'JOIN은 두 테이블을 FK ↔ PK 관계로 연결합니다. ON에 올바른 조인 조건을 명시해야 카테시안 곱(전체 조합)을 피할 수 있습니다.'
  }

  if (limit && orderBy) {
    const direction = /\bDESC\b/i.test(orderBy) ? '내림차순' : '오름차순'
    return `ORDER BY로 ${direction} 정렬한 뒤 LIMIT으로 상위 N건만 잘라옵니다. "정렬 → 제한" 순서가 핵심으로, LIMIT만 쓰면 임의의 행이 나옵니다.`
  }

  if (where) {
    return 'WHERE 절은 FROM에서 가져온 행 중 조건에 맞는 것만 남깁니다. =, IN, IS NULL, BETWEEN, LIKE 등의 연산자를 활용합니다.'
  }

  if (orderBy) {
    const direction = /\bDESC\b/i.test(orderBy) ? '내림차순' : '오름차순'
    return `ORDER BY는 결과 행의 순서를 정합니다. 기본값은 오름차순이고, ${direction} 정렬은 명시적으로 방향을 지정합니다.`
  }

  return '필요한 컬럼을 SELECT에 나열하고 FROM으로 대상 테이블을 지정하는 기본 SELECT 쿼리입니다.'
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

