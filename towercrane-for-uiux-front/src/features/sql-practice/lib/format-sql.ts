import { format } from 'sql-formatter'

export function formatSqlQuery(query: string) {
  const formatted = format(query, {
    language: 'sqlite',
    keywordCase: 'upper',
    functionCase: 'upper',
    tabWidth: 2,
    linesBetweenQueries: 1,
  }).trim()

  return compactSqlClauses(formatted)
}

const CLAUSE_KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
])

function compactSqlClauses(sql: string) {
  const lines = sql
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const result: string[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]

    if (CLAUSE_KEYWORDS.has(line)) {
      const parts: string[] = []
      i += 1

      while (i < lines.length && !CLAUSE_KEYWORDS.has(lines[i]) && !isJoinLine(lines[i])) {
        parts.push(lines[i])
        i += 1
      }

      i -= 1
      result.push(parts.length > 0 ? `${line} ${parts.join(' ')}` : line)
      continue
    }

    result.push(line)
  }

  return result.join('\n')
}

function isJoinLine(line: string) {
  return /^(?:(?:LEFT|RIGHT|FULL|INNER|OUTER|CROSS)\s+)*(?:JOIN)\b/.test(line)
}
