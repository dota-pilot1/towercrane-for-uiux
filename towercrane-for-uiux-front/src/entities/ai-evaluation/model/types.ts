export interface Evaluatee {
  id: string
  name: string
  role: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface EvalCategory {
  id: string
  name: string
  displayOrder: number
  items: EvalItem[]
}

export interface EvalItem {
  id: string
  categoryId: string
  title: string
  description: string | null
  displayOrder: number
  createdAt: string
  score: number | null
  note: string | null
  scoreId: string | null
}

export interface EvalSummaryCategory {
  id: string
  name: string
  score: number
  maxScore: number
}

export interface EvalSummary {
  totalScore: number
  maxScore: number
  categories: EvalSummaryCategory[]
}
