import { useRef } from 'react'
import type { ChangeEvent } from 'react'
import { Download, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import type { ApiDocImportExportFile } from '../../../entities/api-doc/model/import-export-types'
import {
  createApiDocExportFileName,
  downloadJsonFile,
  readJsonFile,
} from '../lib/api-doc-json-file'
import { useExportApiDoc, useImportApiDoc } from '../model/use-api-doc-queries'

export function ApiDocImportExportActions({ isAdmin }: { isAdmin: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const exportMutation = useExportApiDoc()
  const importMutation = useImportApiDoc()
  const isBusy = exportMutation.isPending || importMutation.isPending

  const handleExport = async () => {
    const data = await exportMutation.mutateAsync()
    downloadJsonFile(createApiDocExportFileName(), data)
    toast.success('Postman Lite JSON을 내보냈습니다.')
  }

  const handleImportClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const data = await readJsonFile<ApiDocImportExportFile>(file)
      const collectionCount = data.collections?.length ?? 0
      const endpointCount =
        data.collections?.reduce((sum, collection) => sum + (collection.endpoints?.length ?? 0), 0) ?? 0

      if (
        !window.confirm(
          `${collectionCount}개 컬렉션, ${endpointCount}개 API를 기존 목록에 추가할까요?`,
        )
      ) {
        return
      }

      await importMutation.mutateAsync(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'JSON 파일을 읽지 못했습니다.')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-background/20 bg-background/10 px-3 text-xs font-bold text-background transition-colors hover:bg-background/20 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={handleExport}
        disabled={isBusy}
      >
        {exportMutation.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        내보내기
      </button>

      {isAdmin ? (
        <>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-background/20 bg-background px-3 text-xs font-bold text-text-primary transition-colors hover:bg-background/90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleImportClick}
            disabled={isBusy}
          >
            {importMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            가져오기
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      ) : null}
    </div>
  )
}
