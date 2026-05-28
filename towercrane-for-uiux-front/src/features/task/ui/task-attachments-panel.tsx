import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { useRef, useState } from 'react'
import {
  Download,
  Eye,
  File,
  Image as ImageIcon,
  Maximize2,
  Paperclip,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
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

function createMmdState(task: Task) {
  const source = task.mmdContent ?? ''
  return {
    taskId: task.id,
    source,
    value: source,
    showPreview: Boolean(source.trim()),
  }
}

export function TaskAttachmentsPanel({ task }: { task: Task }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const taskId = task.id
  const attachmentsQuery = useTaskAttachments(taskId)
  const createAttachment = useCreateTaskAttachment(taskId)
  const deleteAttachment = useDeleteTaskAttachment(taskId)
  const attachments = attachmentsQuery.data ?? []

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
    </div>
  )
}

export function TaskMmdPanel({ task }: { task: Task }) {
  const [mmdState, setMmdState] = useState(() => createMmdState(task))
  const [mmdDialogOpen, setMmdDialogOpen] = useState(false)
  const [mmdDialogTab, setMmdDialogTab] = useState<'preview' | 'code'>(
    'preview',
  )
  const updateTask = useUpdateTask()
  const currentMmdContent = task.mmdContent ?? ''
  const effectiveMmdState =
    mmdState.taskId === task.id && mmdState.source === currentMmdContent
      ? mmdState
      : createMmdState(task)
  const mmdDraft = effectiveMmdState.value
  const showPreview = effectiveMmdState.showPreview

  const handleSaveMmd = async () => {
    await updateTask.mutateAsync({
      id: task.id,
      body: { mmdContent: mmdDraft },
    })
  }

  const handleOpenMmdDialog = () => {
    setMmdDialogTab(showPreview ? 'preview' : 'code')
    setMmdDialogOpen(true)
  }

  const hasMmdChanges = mmdDraft !== (task.mmdContent ?? '')
  const hasMmdContent = Boolean(mmdDraft.trim())

  return (
    <div className="space-y-4">

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-text-primary">MMD 내용</p>
            <p className="mt-1 text-xs text-text-muted">첨부 파일 아래에 Mermaid 형식 문서를 저장합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setMmdState({
                  ...effectiveMmdState,
                  showPreview: !effectiveMmdState.showPreview,
                })
              }
              disabled={!hasMmdContent}
            >
              <Eye className="mr-2 size-4" />
              {showPreview ? '코드 보기' : '미리보기'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleOpenMmdDialog}
              disabled={!hasMmdContent}
            >
              <Maximize2 className="mr-2 size-4" />
              크게 보기
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
            onChange={(event) =>
              setMmdState({
                ...effectiveMmdState,
                value: event.target.value,
              })
            }
            placeholder={`flowchart TD\n  A[첨부 확인] --> B[MMD 내용 작성]\n  B --> C[미리보기]`}
            className="min-h-56 resize-y font-mono text-sm"
          />
        )}
      </section>

      <Dialog.Root open={mmdDialogOpen} onOpenChange={setMmdDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
          <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[60] flex h-[min(86vh,860px)] w-[min(1100px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-surface-border-soft shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft bg-surface-muted px-5 py-4">
              <div className="min-w-0">
                <Dialog.Title className="truncate text-lg font-black text-text-primary">
                  MMD 크게 보기
                </Dialog.Title>
                <Dialog.Description className="mt-1 truncate text-xs text-text-secondary">
                  {task.title}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button type="button" className="ui-icon-button size-8" aria-label="닫기">
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>

            <Tabs.Root
              value={mmdDialogTab}
              onValueChange={(value) => setMmdDialogTab(value as 'preview' | 'code')}
              className="flex min-h-0 flex-1 flex-col"
            >
              <Tabs.List className="flex shrink-0 gap-1 border-b border-surface-border-soft bg-surface-raised px-4 pt-3">
                {[
                  ['preview', '미리보기'],
                  ['code', '코드'],
                ].map(([value, label]) => (
                  <Tabs.Trigger
                    key={value}
                    value={value}
                    className="rounded-t-md border border-transparent px-4 py-2 text-sm font-bold text-text-secondary transition-colors data-[state=active]:border-surface-border-soft data-[state=active]:bg-background data-[state=active]:text-text-primary"
                  >
                    {label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              <Tabs.Content value="preview" className="min-h-0 flex-1 overflow-auto p-5">
                <div className="min-h-full rounded-md border border-surface-border-soft bg-surface-raised p-4">
                  <Mermaid chart={mmdDraft} className="min-h-96" />
                </div>
              </Tabs.Content>

              <Tabs.Content value="code" className="min-h-0 flex-1 p-5">
                <Textarea
                  value={mmdDraft}
                  readOnly
                  className="h-full min-h-96 resize-none font-mono text-sm"
                />
              </Tabs.Content>
            </Tabs.Root>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
