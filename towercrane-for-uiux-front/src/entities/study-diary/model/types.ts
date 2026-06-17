export type StudyDiaryVisibility = 'private' | 'shared' | 'public'
export type StudyDiaryOrganizeMode = 'organize' | 'summary' | 'interview'

export type StudyDiary = {
  id: string
  userId: string
  ownerName: string
  title: string
  description?: string | null
  visibility: StudyDiaryVisibility
  createdAt: string
  updatedAt: string
}

export type StudyDiaryCategory = {
  id: string
  diaryId: string
  name: string
  summary?: string | null
  icon: string
  orderIdx: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type StudyDiarySection = {
  id: string
  categoryId: string
  title: string
  summary?: string | null
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export type StudyDiaryNote = {
  id: string
  userId: string
  sectionId?: string | null
  topicId?: string | null
  title?: string | null
  content: string
  visibility: StudyDiaryVisibility
  pinned: boolean
  createdAt: string
  updatedAt: string
}
