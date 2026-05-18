import type { SqlPracticeExample } from '../../../entities/sql-practice/model/example-types'

export type SqlMistakeAnalysisState = {
  wrongLines: number[]
  analysis: string
  raw: string
}

export function buildSqlSupplementPrompt({
  example,
  submittedSql,
  answerSql,
  gradeFeedback,
}: {
  example: SqlPracticeExample
  submittedSql: string
  answerSql: string
  gradeFeedback: string
}) {
  return `다음 SQL 연습 문제에 대해 학습자용 보충 설명을 작성해주세요.

반드시 Markdown 형식으로만 응답해주세요. HTML은 쓰지 마세요.
노트에 그대로 복사해서 붙여넣을 수 있게 작성해주세요.
아래 제목 구조를 그대로 사용하고, 각 제목은 Markdown 2단계 헤딩(##)으로 작성해주세요.
SQL은 반드시 fenced code block(\`\`\`sql)으로 감싸주세요.
한국어로 간결하지만 충분히 설명해주세요.

## Sql 문제 정답

## Sql 주요 문법 설명

## 주의할점

## 또 다른 예제

[문제 제목]
${example.title}

[문제 설명]
${example.description}

[힌트]
${example.hint}

[관련 테이블]
${example.relatedTables.join(', ') || '없음'}

[정답 SQL]
${answerSql}

[사용자 제출 SQL]
${submittedSql}

[채점 피드백]
${gradeFeedback}`
}

export function buildSqlMistakeAnalysisPrompt({
  example,
  submittedSql,
  answerSql,
  gradeFeedback,
  executeError,
}: {
  example: SqlPracticeExample
  submittedSql: string
  answerSql: string
  gradeFeedback: string
  executeError: string
}) {
  return `다음 SQL 연습 문제에서 사용자가 왜 틀렸는지 분석해주세요.

반드시 아래 JSON 형식으로만 응답해주세요. Markdown 코드블록은 쓰지 마세요.
wrongLines는 [사용자 제출 SQL] 기준 1부터 시작하는 줄 번호 배열입니다.
확실히 틀린 줄만 넣고, 확신이 없으면 빈 배열로 두세요.
analysis는 한국어로 2~4문장만 작성하세요.
analysis는 반드시 자연스러운 한국어만 사용하세요.
중국어, 일본어, 한자식 표현, 번역투 표현은 쓰지 마세요.
예: "拼寫" 대신 "철자", "누락" 같은 한국어 표현을 사용하세요.

{
  "wrongLines": [1],
  "analysis": "틀린 이유를 여기에 작성"
}

[문제 제목]
${example.title}

[문제 설명]
${example.description}

[힌트]
${example.hint}

[관련 테이블]
${example.relatedTables.join(', ') || '없음'}

[정답 SQL]
${answerSql}

[사용자 제출 SQL]
${submittedSql}

[채점 피드백]
${gradeFeedback || '없음'}

[실행 오류]
${executeError || '없음'}`
}

export function parseSqlMistakeAnalysis(
  rawAnswer: string,
  submittedSql: string,
  answerSql: string,
): SqlMistakeAnalysisState {
  const raw = rawAnswer.trim()
  const jsonText = raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim() ?? raw

  try {
    const parsed = JSON.parse(jsonText) as Partial<SqlMistakeAnalysisState>
    const wrongLines = deriveWrongSqlLines({
      answerSql,
      submittedSql,
      aiWrongLines: Array.isArray(parsed.wrongLines) ? parsed.wrongLines : [],
    })

    return {
      wrongLines,
      analysis: typeof parsed.analysis === 'string' && parsed.analysis.trim()
        ? parsed.analysis.trim()
        : raw,
      raw,
    }
  } catch {
    return {
      wrongLines: deriveWrongSqlLines({ answerSql, submittedSql, aiWrongLines: [] }),
      analysis: raw || '오답 분석 결과가 없습니다.',
      raw,
    }
  }
}

function deriveWrongSqlLines({
  answerSql,
  submittedSql,
  aiWrongLines,
}: {
  answerSql: string
  submittedSql: string
  aiWrongLines: unknown[]
}): number[] {
  const answerLines = splitSqlLines(answerSql)
  const submittedLines = splitSqlLines(submittedSql)
  const answerLineSet = new Set(answerLines.map(normalizeSqlLine))
  const answerByClause = new Map<string, string>()

  answerLines.forEach((line) => {
    const clause = getSqlLineClause(line)
    if (clause && !answerByClause.has(clause)) {
      answerByClause.set(clause, normalizeSqlLine(line))
    }
  })

  const wrongLineSet = new Set<number>()

  aiWrongLines
    .map((line) => Number(line))
    .filter((line) => Number.isInteger(line) && line >= 1 && line <= submittedLines.length)
    .forEach((lineNumber) => {
      const submittedLine = submittedLines[lineNumber - 1]
      if (!answerLineSet.has(normalizeSqlLine(submittedLine))) {
        wrongLineSet.add(lineNumber)
      }
    })

  submittedLines.forEach((line, index) => {
    const clause = getSqlLineClause(line)
    const answerLine = clause ? answerByClause.get(clause) : undefined
    if (answerLine && normalizeSqlLine(line) !== answerLine) {
      wrongLineSet.add(index + 1)
    }
  })

  return Array.from(wrongLineSet).sort((a, b) => a - b)
}

function splitSqlLines(sql: string): string[] {
  return sql
    .trim()
    .split('\n')
    .map((line) => line.trim())
}

function normalizeSqlLine(line: string): string {
  return line
    .trim()
    .replace(/;+\s*$/, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function getSqlLineClause(line: string): string {
  const normalized = normalizeSqlLine(line)
  if (normalized.startsWith('GROUP BY')) return 'GROUP BY'
  if (normalized.startsWith('ORDER BY')) return 'ORDER BY'
  if (normalized.startsWith('LEFT JOIN')) return 'LEFT JOIN'
  if (normalized.startsWith('RIGHT JOIN')) return 'RIGHT JOIN'
  if (normalized.startsWith('INNER JOIN')) return 'INNER JOIN'
  if (normalized.startsWith('FULL JOIN')) return 'FULL JOIN'
  if (normalized.startsWith('JOIN')) return 'JOIN'
  return normalized.split(' ')[0] ?? ''
}
