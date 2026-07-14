import { useCallback, useEffect, useRef } from 'react'
import {
  isApprovalDraftEmpty,
  removeApprovalDraft,
  saveApprovalDraft,
  type ApprovalDraftData,
} from './approval-draft'

export function useApprovalDraft({
  userId,
  draft,
}: {
  userId: string
  draft: ApprovalDraftData
}) {
  const lastSnapshotRef = useRef(JSON.stringify(draft))

  useEffect(() => {
    if (!userId) return

    const snapshot = JSON.stringify(draft)
    if (snapshot === lastSnapshotRef.current) return
    lastSnapshotRef.current = snapshot

    if (isApprovalDraftEmpty(draft)) {
      removeApprovalDraft(userId)
      return
    }

    saveApprovalDraft(userId, draft)
  }, [draft, userId])

  const clearDraft = useCallback(() => {
    removeApprovalDraft(userId)
  }, [userId])

  return {
    clearDraft,
    hasDraft: !isApprovalDraftEmpty(draft),
  }
}
