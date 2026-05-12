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
  const tableText = `${example.relatedTables.join(', ')} 테이블`
  const sql = example.sql
  const parts = [
    hasJoin(sql)
      ? `${tableText}의 관계를 연결해 필요한 결과를 조회합니다.`
      : `${tableText}에서 필요한 컬럼을 조회합니다.`,
  ]
  const selectedColumns = extractSelectedColumns(sql)

  if (selectedColumns) {
    parts.push(`조회 컬럼: ${formatClause(selectedColumns)}.`)
  }

  if (hasWith(sql)) {
    parts.push('WITH 절로 중간 결과를 먼저 만듭니다.')
  }

  const where = extractClause(sql, 'WHERE')
  if (where) {
    parts.push(`조건: ${formatClause(where)}.`)
  }

  const groupBy = extractClause(sql, 'GROUP BY')
  if (groupBy) {
    parts.push(`집계 기준: ${formatClause(groupBy)}.`)
  }

  const having = extractClause(sql, 'HAVING')
  if (having) {
    parts.push(`집계 조건: ${formatClause(having)}.`)
  }

  const orderBy = extractClause(sql, 'ORDER BY')
  if (orderBy) {
    parts.push(`정렬: ${formatClause(orderBy)}.`)
  }

  const limit = extractClause(sql, 'LIMIT')
  if (limit) {
    parts.push(`결과는 ${formatClause(limit)}건으로 제한합니다.`)
  }

  return parts.join(' ')
}

function buildDefaultHint(sql: string): string {
  const hints: string[] = []

  if (hasWith(sql)) {
    hints.push('WITH 절로 중간 결과를 분리하세요.')
  }

  if (hasJoin(sql)) {
    hints.push('JOIN 조건으로 테이블 관계를 연결하세요.')
  }

  if (extractClause(sql, 'WHERE')) {
    hints.push('WHERE 절로 문제 조건을 제한하세요.')
  }

  if (extractClause(sql, 'GROUP BY')) {
    hints.push('GROUP BY로 묶을 단위를 맞추세요.')
  }

  if (extractClause(sql, 'HAVING')) {
    hints.push('HAVING으로 집계 결과를 필터링하세요.')
  }

  if (hasWindowFunction(sql)) {
    hints.push('OVER 또는 PARTITION BY로 순위와 비율을 계산하세요.')
  }

  if (extractClause(sql, 'ORDER BY')) {
    hints.push('ORDER BY로 결과 순서를 고정하세요.')
  }

  if (extractClause(sql, 'LIMIT')) {
    hints.push('LIMIT으로 필요한 행 수만 남기세요.')
  }

  return (
    hints.join(' ') ||
    'SELECT에 필요한 컬럼을 넣고 FROM 대상 테이블을 확인하세요.'
  )
}

function buildDefaultExplanation(sql: string): string {
  const steps: string[] = []

  if (hasWith(sql)) {
    steps.push('WITH로 중간 결과 분리')
  }

  if (hasJoin(sql)) {
    steps.push('JOIN으로 관련 테이블 연결')
  }

  if (extractClause(sql, 'WHERE')) {
    steps.push('WHERE로 조건 적용')
  }

  if (extractClause(sql, 'GROUP BY')) {
    steps.push('GROUP BY로 집계')
  }

  if (extractClause(sql, 'HAVING')) {
    steps.push('HAVING으로 집계 조건 적용')
  }

  if (hasWindowFunction(sql)) {
    steps.push('윈도우 함수로 순위 또는 비율 계산')
  }

  if (extractClause(sql, 'ORDER BY')) {
    steps.push('ORDER BY로 결과 순서 고정')
  }

  if (extractClause(sql, 'LIMIT')) {
    steps.push('LIMIT으로 행 수 제한')
  }

  return steps.length > 0
    ? `정답은 ${steps.join(', ')} 순서로 작성합니다.`
    : '정답은 필요한 컬럼을 SELECT하고 기준 테이블에서 조회하는 기본 SELECT 쿼리입니다.'
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

function extractSelectedColumns(sql: string): string | null {
  const normalizedSql = normalizeSql(sql)
  const selectIndex = findTopLevelKeyword(normalizedSql, 'SELECT', 0)

  if (selectIndex < 0) {
    return null
  }

  const fromIndex = findTopLevelKeyword(
    normalizedSql,
    'FROM',
    selectIndex + 'SELECT'.length,
  )

  if (fromIndex < 0) {
    return null
  }

  return (
    normalizedSql.slice(selectIndex + 'SELECT'.length, fromIndex).trim() || null
  )
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

function formatClause(clause: string): string {
  const normalizedClause = clause.replace(/\s+/g, ' ').trim()
  const maxLength = 140

  if (normalizedClause.length <= maxLength) {
    return normalizedClause
  }

  return `${normalizedClause.slice(0, maxLength - 3)}...`
}
