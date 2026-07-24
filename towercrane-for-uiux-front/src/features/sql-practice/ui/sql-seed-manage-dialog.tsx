import * as Dialog from '@radix-ui/react-dialog'
import {
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Settings2,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { sqlPracticeApi } from '../../../entities/sql-practice/api/sql-practice-api'
import type {
  SqlPracticeSeedLevel,
  SqlPracticeSeedSummary,
} from '../../../entities/sql-practice/model/types'
import { Button } from '../../../shared/ui/button'
import {
  useDeleteSqlPracticeSeed,
  useUploadSqlPracticeSeed,
} from '../model/use-sql-practice-queries'

type SqlSeedManageDialogProps = {
  open: boolean
  onClose: () => void
  seeds: SqlPracticeSeedSummary[]
  isLoading: boolean
  isAdmin: boolean
  isResetting: boolean
  onReset: () => void
}

export function SqlSeedManageDialog({
  open,
  onClose,
  seeds,
  isLoading,
  isAdmin,
  isResetting,
  onReset,
}: SqlSeedManageDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)
  const uploadMutation = useUploadSqlPracticeSeed()
  const deleteMutation = useDeleteSqlPracticeSeed()

  const handleDelete = (seed: SqlPracticeSeedSummary) => {
    if (deleteMutation.isPending) return
    if (
      !window.confirm(
        `'${seed.title}' (${seed.fileName}) 파일을 삭제할까요? 되돌릴 수 없습니다.`,
      )
    ) {
      return
    }
    deleteMutation.mutate({ source: seed.source, fileName: seed.fileName })
  }

  const handlePickFile = () => fileInputRef.current?.click()

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!/\.sql$/i.test(file.name)) {
      toast.error('.sql 파일만 업로드할 수 있습니다.')
      return
    }
    uploadMutation.mutate(file)
  }

  const handleDownload = async (seed: SqlPracticeSeedSummary) => {
    setDownloadingFile(seed.fileName)
    try {
      const result = await sqlPracticeApi.downloadSeed(seed.source, seed.fileName)
      const blob = new Blob([result.content], { type: 'application/sql' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = result.fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '다운로드에 실패했습니다.')
    } finally {
      setDownloadingFile(null)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[210] ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[211] flex max-h-[86vh] w-[min(680px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border-soft shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="ui-icon-button-brand size-9 shrink-0">
                <Settings2 className="size-4" />
              </div>
              <div className="min-w-0">
                <Dialog.Title className="text-base font-bold text-text-primary">
                  테이블 관리
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-xs leading-5 text-text-secondary">
                  연습 파일(.sql)을 내려받거나 업로드하고, 현재 DB를 초기화합니다.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8 shrink-0" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            {/* 업로드 (관리자) */}
            {isAdmin && (
              <section>
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
                  <Upload className="size-3.5 text-brand-primary" />
                  업로드
                </h3>
                <div className="mt-2 flex flex-col gap-2 rounded-md border border-dashed border-surface-border-soft bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-text-secondary">
                    여러 테이블이 담긴 하나의 <code className="font-mono text-text-primary">.sql</code>{' '}
                    파일을 올리면 새 연습 세트로 추가됩니다. (최대 2MB)
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handlePickFile}
                    disabled={uploadMutation.isPending}
                    className="shrink-0 gap-1.5"
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="size-3.5" />
                    )}
                    파일 선택
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".sql"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                </div>
              </section>
            )}

            {/* 다운로드 목록 */}
            <section>
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
                <Download className="size-3.5 text-brand-primary" />
                파일 다운로드
              </h3>
              {isLoading ? (
                <div className="mt-2 flex items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-4 py-6 text-xs text-text-secondary">
                  <Loader2 className="size-4 animate-spin text-brand-primary" />
                  목록을 불러오는 중입니다
                </div>
              ) : seeds.length === 0 ? (
                <div className="mt-2 rounded-md border border-surface-border-soft bg-surface-muted px-4 py-6 text-center text-xs text-text-secondary">
                  표시할 연습 파일이 없습니다.
                </div>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {seeds.map((seed) => (
                    <div
                      key={`${seed.source}-${seed.fileName}`}
                      className="flex items-center gap-3 rounded-md border border-surface-border-soft bg-surface-raised px-3 py-2.5"
                    >
                      <FileText className="size-4 shrink-0 text-brand-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-text-primary">
                          {seed.title}
                        </p>
                        <p className="truncate font-mono text-[11px] text-text-muted">
                          {seed.fileName}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                        {levelLabel(seed.level)}
                      </span>
                      <button
                        type="button"
                        className="ui-icon-button size-8 shrink-0"
                        title="다운로드"
                        aria-label={`${seed.fileName} 다운로드`}
                        onClick={() => handleDownload(seed)}
                        disabled={downloadingFile === seed.fileName}
                      >
                        {downloadingFile === seed.fileName ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Download className="size-3.5" />
                        )}
                      </button>
                      {isAdmin && seed.isUpload && (
                        <button
                          type="button"
                          className="ui-icon-button-danger size-8 shrink-0"
                          title={seed.isActive ? '사용 중인 파일은 삭제할 수 없습니다' : '삭제'}
                          aria-label={`${seed.fileName} 삭제`}
                          onClick={() => handleDelete(seed)}
                          disabled={
                            seed.isActive ||
                            (deleteMutation.isPending &&
                              deleteMutation.variables?.fileName === seed.fileName)
                          }
                        >
                          {deleteMutation.isPending &&
                          deleteMutation.variables?.fileName === seed.fileName ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 초기화 */}
            <section>
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
                <RotateCcw className="size-3.5 text-brand-primary" />
                초기화
              </h3>
              <button
                type="button"
                className="ui-icon-button mt-2 h-9 w-full justify-center gap-2 px-3 text-xs"
                onClick={onReset}
                disabled={isResetting}
                title="현재 문제 세트 기준으로 연습 DB를 처음 상태로 되돌립니다"
              >
                <RotateCcw className={`size-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                처음 상태로 되돌리기
              </button>
              <p className="mt-1.5 px-0.5 text-[11px] leading-4 text-text-muted">
                내가 실행한 INSERT/UPDATE/DROP 등을 모두 취소하고 현재 세트의 초기 데이터로
                복구합니다.
              </p>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function levelLabel(level: SqlPracticeSeedLevel) {
  const labels: Record<SqlPracticeSeedLevel, string> = {
    beginner: '초급',
    basic: '기본',
    intermediate: '중급',
    advanced: '고급',
  }
  return labels[level]
}
