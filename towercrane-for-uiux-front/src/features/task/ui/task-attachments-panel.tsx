import { useEffect, useRef, useState } from 'react'
import { Download, Eye, File, Image as ImageIcon, Paperclip, Save, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { Task } from '../../../entities/task/model/types'
import { uploadFile } from '../../../shared/api/upload'
import { Button } from '../../../shared/ui/button'
import { Mermaid } from '../../../shared/ui/mermaid'
import { Textarea } from '../../../shared/ui/textarea'
import {
  useCreateTaskAttachment,
  useDeleteTaskAttachment,
  useTaskAttachments,
  useUpdateTask,
} from '../model/use-task-queries'

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function TaskAttachmentsPanel({ task }: { task: Task }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [mmdDraft, setMmdDraft] = useState(task.mmdContent ?? '')
  const [showPreview, setShowPreview] = useState(Boolean(task.mmdContent?.trim()))
  const taskId = task.id
  const attachmentsQuery = useTaskAttachments(taskId)
  const createAttachment = useCreateTaskAttachment(taskId)
  const deleteAttachment = useDeleteTaskAttachment(taskId)
  const updateTask = useUpdateTask()
  const attachments = attachmentsQuery.data ?? []

  useEffect(() => {
    setMmdDraft(task.mmdContent ?? '')
    setShowPreview(Boolean(task.mmdContent?.trim()))
  }, [task.id, task.mmdContent])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setIsUploading(true)

    try {
      for (const file of Array.from(files)) {
        const fileUrl = await uploadFile(file)
        await createAttachment.mutateAsync({
          fileName: file.name,
          fileUrl,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
        })
      }
      toast.success('첨부가 업로드되었습니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '첨부 업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveMmd = async () => {
    await updateTask.mutateAsync({
      id: task.id,
      body: { mmdContent: mmdDraft },
    })
  }

  const hasMmdChanges = mmdDraft !== (task.mmdContent ?? '')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-text-primary">첨부 파일</p>
          <p className="mt-1 text-xs text-text-muted">이미지와 문서를 업무에 연결합니다.</p>
        </div>
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || createAttachment.isPending}
        >
          <Upload className="mr-2 size-4" />
          {isUploading ? '업로드 중' : '첨부 추가'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => handleUpload(event.target.files)}
        />
      </div>

      {attachmentsQuery.isLoading ? (
        <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-4 text-sm text-text-muted">
          첨부를 불러오는 중입니다.
        </div>
      ) : attachments.length === 0 ? (
        <div className="rounded-md border border-dashed border-surface-border-soft px-3 py-8 text-center text-sm text-text-muted">
          첨부된 파일이 없습니다.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {attachments.map((attachment) => {
            const isImage = attachment.contentType.startsWith('image/')
            return (
              <article
                key={attachment.id}
                className="overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised"
              >
                {isImage ? (
                  <a
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-video bg-surface-muted"
                  >
                    <img
                      src={attachment.fileUrl}
                      alt={attachment.fileName}
                      className="h-full w-full object-cover"
                    />
                  </a>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-surface-muted text-text-muted">
                    <File className="size-10" />
                  </div>
                )}

                <div className="space-y-3 p-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-brand-primary">
                      {isImage ? <ImageIcon className="size-4" /> : <Paperclip className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-text-primary">
                        {attachment.fileName}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {formatFileSize(attachment.fileSize)} · {formatDateTime(attachment.createdAt)}
                      </p>
                      <p className="mt-1 truncate text-xs text-text-secondary">
                        {attachment.userName ?? '알 수 없음'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-1">
                    <a
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center justify-center rounded-sm px-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
                    >
                      <Download className="mr-2 size-4" />
                      열기
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm-icon"
                      tone="danger"
                      onClick={() => deleteAttachment.mutate(attachment.id)}
                      title="삭제"
                      aria-label="첨부 삭제"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <section className="space-y-3 border-t border-surface-border-soft pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-text-primary">MMD 내용</p>
            <p className="mt-1 text-xs text-text-muted">첨부 파일 아래에 Mermaid 형식 문서를 저장합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPreview((value) => !value)}
              disabled={!mmdDraft.trim()}
            >
              <Eye className="mr-2 size-4" />
              {showPreview ? '코드 보기' : '미리보기'}
            </Button>
            <Button
              type="button"
              onClick={handleSaveMmd}
              disabled={!hasMmdChanges || updateTask.isPending}
            >
              <Save className="mr-2 size-4" />
              저장
            </Button>
          </div>
        </div>

        {showPreview && mmdDraft.trim() ? (
          <div className="overflow-auto rounded-md border border-surface-border-soft bg-surface-raised p-3">
            <Mermaid chart={mmdDraft} className="min-h-32" />
          </div>
        ) : (
          <Textarea
            value={mmdDraft}
            onChange={(event) => setMmdDraft(event.target.value)}
            placeholder={`flowchart TD\n  A[첨부 확인] --> B[MMD 내용 작성]\n  B --> C[미리보기]`}
            className="min-h-56 resize-y font-mono text-sm"
          />
        )}
      </section>
    </div>
  )
}
