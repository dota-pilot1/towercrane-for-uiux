export type SqlExampleLevel = 'beginner' | 'intermediate' | 'advanced'

export type SqlPracticeExample = {
  id: string
  seedFile: string
  level: SqlExampleLevel
  order: number
  title: string
  description: string
  relatedTables: string[]
  hint: string
  answerSql: string
  explanation: string
}

export type SqlPracticeExampleSet = {
  seedFile: string
  beginner: SqlPracticeExample[]
  intermediate: SqlPracticeExample[]
  advanced: SqlPracticeExample[]
}
