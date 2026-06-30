import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  Paperclip,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import type { TeamDocNode } from '../../../entities/team-docs/model/types'
import { uploadFile } from '../../../shared/api/upload'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Textarea } from '../../../shared/ui/textarea'
import {
  useCreateTeamDocDocument,
  useCreateTeamDocFile,
  useCreateTeamDocFolder,
  useDeleteTeamDocNode,
  useTeamDocNode,
  useTeamDocTree,
  useUpdateTeamDocNode,
} from '../../../features/team-docs/model/use-team-docs-queries'

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function NodeIcon({ node, open }: { node: TeamDocNode; open?: boolean }) {
  if (node.type === 'FOLDER')
    return open ? (
      <FolderOpen className="size-4 text-brand-primary" />
    ) : (
      <Folder className="size-4 text-brand-primary" />
    )
  if (node.type === 'DOC') return <FileText className="size-4 text-text-muted" />
  return <Paperclip className="size-4 text-text-muted" />
}

export function TeamDocsPage() {
  const treeQuery = useTeamDocTree()
  const nodes = useMemo(() => treeQuery.data ?? [], [treeQuery.data])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState<null | 'FOLDER' | 'DOC'>(null)
  const [newName, setNewName] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewMode, setPreviewMode] = useState<'fit' | 'full'>('fit')
  const [dragOver, setDragOver] = useState(false)
  const [menu, setMenu] = useState<{
    x: number
    y: number
    node: TeamDocNode
    confirmDelete?: boolean
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadParentRef = useRef<string | null>(null)

  const createFolder = useCreateTeamDocFolder()
  const createDocument = useCreateTeamDocDocument()
  const createFile = useCreateTeamDocFile()
  const updateNode = useUpdateTeamDocNode()
  const deleteNode = useDeleteTeamDocNode()

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  )

  const targetParentId = selected
    ? selected.type === 'FOLDER'
      ? selected.id
      : selected.parentId
    : null

  const detailQuery = useTeamDocNode(
    selected?.type === 'DOC' ? selected.id : null,
  )
  const detail = detailQuery.data ?? null

  useEffect(() => {
    setConfirmDelete(false)
  }, [selectedId])

  useEffect(() => {
    if (detail) {
      setDraftTitle(detail.title)
      setDraftContent(detail.content ?? '')
    }
  }, [detail])

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, TeamDocNode[]>()
    for (const node of nodes) {
      const arr = map.get(node.parentId) ?? []
      arr.push(node)
      map.set(node.parentId, arr)
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          a.orderIdx - b.orderIdx || a.createdAt.localeCompare(b.createdAt),
      )
    }
    return map
  }, [nodes])

  const nodeById = useMemo(() => {
    const map = new Map<string, TeamDocNode>()
    for (const node of nodes) map.set(node.id, node)
    return map
  }, [nodes])

  function ancestorsOf(node: TeamDocNode): TeamDocNode[] {
    const chain: TeamDocNode[] = []
    const guard = new Set<string>()
    let pid = node.parentId
    while (pid && !guard.has(pid)) {
      guard.add(pid)
      const parent = nodeById.get(pid)
      if (!parent) break
      chain.unshift(parent)
      pid = parent.parentId
    }
    return chain
  }

  function Breadcrumb({ node }: { node: TeamDocNode }) {
    return (
      <div className="mb-2 flex flex-wrap items-center gap-1 text-xs text-text-muted">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="hover:text-text-secondary"
        >
          최상위
        </button>
        {ancestorsOf(node).map((a) => (
          <span key={a.id} className="flex items-center gap-1">
            <span>/</span>
            <button
              type="button"
              onClick={() => setSelectedId(a.id)}
              className="hover:text-brand-primary"
            >
              {a.title}
            </button>
          </span>
        ))}
        <span>/</span>
        <span className="font-bold text-text-secondary">{node.title}</span>
      </div>
    )
  }

  function onRowClick(node: TeamDocNode) {
    setSelectedId(node.id)
    if (node.type === 'FOLDER') {
      setExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(node.id)) next.delete(node.id)
        else next.add(node.id)
        return next
      })
    }
  }

  async function handleCreate() {
    const kind = creating
    if (!kind || !newName.trim()) return
    const title = newName.trim()
    try {
      const created =
        kind === 'FOLDER'
          ? await createFolder.mutateAsync({ parentId: targetParentId, title })
          : await createDocument.mutateAsync({ parentId: targetParentId, title })
      setCreating(null)
      setNewName('')
      if (targetParentId) setExpanded((prev) => new Set(prev).add(targetParentId))
      setSelectedId(created.id)
      toast.success(kind === 'FOLDER' ? '폴더를 만들었습니다.' : '문서를 만들었습니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '만들지 못했습니다.')
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0 || uploading) return
    const parentId = uploadParentRef.current ?? targetParentId
    uploadParentRef.current = null
    setUploading(true)
    try {
      let lastId: string | null = null
      for (const file of Array.from(files)) {
        const fileUrl = await uploadFile(file)
        const created = await createFile.mutateAsync({
          parentId,
          fileName: file.name,
          fileUrl,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
        })
        lastId = created.id
      }
      if (parentId) setExpanded((prev) => new Set(prev).add(parentId))
      if (lastId) setSelectedId(lastId)
      toast.success('파일을 업로드했습니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSave() {
    if (!detail || !draftTitle.trim()) return
    try {
      await updateNode.mutateAsync({
        id: detail.id,
        body: { title: draftTitle.trim(), content: draftContent },
      })
      toast.success('저장했습니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장하지 못했습니다.')
    }
  }

  async function handleDelete(node: TeamDocNode) {
    try {
      await deleteNode.mutateAsync(node.id)
      if (selectedId === node.id) setSelectedId(null)
      toast.success('삭제했습니다.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제하지 못했습니다.')
    }
  }

  const docDirty =
    !!detail &&
    (draftTitle !== detail.title || draftContent !== (detail.content ?? ''))

  function renderTree(parentId: string | null, depth: number): ReactNode[] {
    const children = childrenOf.get(parentId) ?? []
    return children.flatMap((node) => {
      const isOpen = expanded.has(node.id)
      const row = (
        <button
          key={node.id}
          type="button"
          onClick={() => onRowClick(node)}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenu({ x: e.clientX, y: e.clientY, node })
          }}
          style={{ paddingLeft: depth * 14 + 10 }}
          className={
            'flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm transition-colors ' +
            (selectedId === node.id
              ? 'bg-brand-glass font-bold text-brand-primary'
              : 'text-text-secondary hover:bg-surface-muted')
          }
        >
          <NodeIcon node={node} open={isOpen} />
          <span className="truncate">{node.title}</span>
        </button>
      )
      if (node.type === 'FOLDER' && isOpen) {
        return [row, ...renderTree(node.id, depth + 1)]
      }
      return [row]
    })
  }

  const targetLabel = selected
    ? selected.type === 'FOLDER'
      ? `'${selected.title}' 안에`
      : '같은 폴더에'
    : '최상위에'

  return (
    <div
      className="relative flex h-[calc(100dvh-7rem)] gap-4"
      onDragOver={(e) => {
        e.preventDefault()
        if (!dragOver) setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDragOver(false)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        handleUpload(e.dataTransfer.files)
      }}
    >
      {dragOver ? (
        <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-border bg-brand-glass/80">
          <Upload className="size-8 text-brand-primary" />
          <span className="text-sm font-bold text-brand-primary">
            여기에 놓으면 {targetLabel} 업로드
          </span>
        </div>
      ) : null}
      {/* 왼쪽: 트리 */}
      <aside className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-raised">
        <div className="flex items-center gap-1.5 border-b border-surface-border-soft px-3 py-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setCreating('FOLDER')
              setNewName('')
            }}
          >
            <FolderPlus className="mr-1.5 size-4" />
            폴더
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setCreating('DOC')
              setNewName('')
            }}
          >
            <FilePlus className="mr-1.5 size-4" />
            문서
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-1.5 size-4" />
            {uploading ? '업로드 중' : '업로드'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>

        {creating ? (
          <div className="border-b border-surface-border-soft px-3 py-2">
            <p className="mb-1 text-xs text-text-muted">
              {targetLabel} 새 {creating === 'FOLDER' ? '폴더' : '문서'}
            </p>
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') {
                  setCreating(null)
                  setNewName('')
                }
              }}
              placeholder="이름 입력 후 Enter"
            />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {treeQuery.isLoading ? (
            <p className="px-2 py-4 text-sm text-text-muted">불러오는 중…</p>
          ) : nodes.length === 0 ? (
            <p className="px-2 py-4 text-sm text-text-muted">
              아직 문서가 없습니다. 폴더나 문서를 만들어보세요.
            </p>
          ) : (
            renderTree(null, 0)
          )}
        </div>
      </aside>

      {/* 오른쪽: 본문 */}
      <section className="min-w-0 flex-1 overflow-y-auto rounded-lg border border-surface-border bg-surface-raised">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <FileText className="size-10 text-text-muted" />
            <span className="text-sm text-text-muted">
              왼쪽에서 문서를 선택하거나 새로 만드세요.
            </span>
          </div>
        ) : selected.type === 'DOC' ? (
          <div className="mx-auto w-full max-w-3xl p-6">
            <Breadcrumb node={selected} />
            <div className="mb-3 flex items-center justify-between gap-3">
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="flex-1 text-lg font-black"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                tone="danger"
                onClick={() => {
                  if (confirmDelete) handleDelete(selected)
                  else setConfirmDelete(true)
                }}
              >
                <Trash2 className="mr-1.5 size-4" />
                {confirmDelete ? '정말 삭제?' : '삭제'}
              </Button>
            </div>
            <Textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="내용을 입력하세요. (마크다운)"
              className="min-h-[420px] resize-y"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-text-muted">
                {detail
                  ? `${detail.updatedByName ?? '-'} · ${formatDateTime(detail.updatedAt)} 수정`
                  : '불러오는 중…'}
              </span>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!docDirty || updateNode.isPending || !draftTitle.trim()}
              >
                <Save className="mr-2 size-4" />
                {updateNode.isPending ? '저장 중' : '저장'}
              </Button>
            </div>
          </div>
        ) : selected.type === 'FILE' ? (
          <div className="mx-auto w-full max-w-3xl p-6">
            <Breadcrumb node={selected} />
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="min-w-0 flex-1 truncate text-lg font-black text-text-primary">
                {selected.title}
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                {selected.contentType?.startsWith('image/') ? (
                  <div className="flex overflow-hidden rounded-md border border-surface-border">
                    {(['fit', 'full'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPreviewMode(mode)}
                        className={
                          'px-2.5 py-1 text-xs font-bold ' +
                          (previewMode === mode
                            ? 'bg-brand-glass text-brand-primary'
                            : 'text-text-muted hover:bg-surface-muted')
                        }
                      >
                        {mode === 'fit' ? '축소' : '원본'}
                      </button>
                    ))}
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  tone="danger"
                  onClick={() => {
                    if (confirmDelete) handleDelete(selected)
                    else setConfirmDelete(true)
                  }}
                >
                  <Trash2 className="mr-1.5 size-4" />
                  {confirmDelete ? '정말 삭제?' : '삭제'}
                </Button>
              </div>
            </div>
            {selected.contentType?.startsWith('image/') ? (
              <div className="flex justify-center rounded-md border border-surface-border-soft bg-surface-muted p-3">
                <img
                  src={selected.fileUrl ?? ''}
                  alt={selected.title}
                  className={
                    'rounded object-contain ' +
                    (previewMode === 'fit'
                      ? 'max-h-[42vh] max-w-md'
                      : 'max-h-[78vh] w-full')
                  }
                />
              </div>
            ) : (
              <a
                href={selected.fileUrl ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-surface-border-soft py-16 text-text-muted hover:text-brand-primary"
              >
                <Paperclip className="size-10" />
                <span className="text-sm">{selected.fileName} (열기)</span>
              </a>
            )}
            <p className="mt-3 text-xs text-text-muted">
              {selected.createdByName ?? '-'} · {formatDateTime(selected.createdAt)} 업로드
            </p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl p-6">
            <Breadcrumb node={selected} />
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 truncate text-lg font-black text-text-primary">
                <FolderOpen className="size-5 text-brand-primary" />
                {selected.title}
              </h2>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                tone="danger"
                onClick={() => {
                  if (confirmDelete) handleDelete(selected)
                  else setConfirmDelete(true)
                }}
              >
                <Trash2 className="mr-1.5 size-4" />
                {confirmDelete ? '정말 삭제?' : '폴더 삭제'}
              </Button>
            </div>
            <p className="mb-3 text-xs text-text-muted">
              폴더를 우클릭하면 하위 폴더·문서·파일을 추가할 수 있어요.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(childrenOf.get(selected.id) ?? []).map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => onRowClick(child)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setMenu({ x: e.clientX, y: e.clientY, node: child })
                  }}
                  className="flex items-center gap-2 rounded-md border border-surface-border bg-surface-muted px-3 py-2.5 text-left text-sm text-text-secondary transition-colors hover:border-brand-border hover:bg-brand-glass"
                >
                  <NodeIcon node={child} />
                  <span className="truncate">{child.title}</span>
                </button>
              ))}
              {(childrenOf.get(selected.id) ?? []).length === 0 ? (
                <p className="col-span-full py-8 text-center text-sm text-text-muted">
                  빈 폴더입니다. 트리에서 이 폴더를 우클릭해 추가하세요.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {menu ? (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setMenu(null)
            }}
          />
          <div
            className="fixed z-[61] min-w-[184px] overflow-hidden rounded-lg border border-surface-border bg-surface-raised py-1 shadow-2xl"
            style={{ left: menu.x, top: menu.y }}
          >
            {menu.node.type === 'FOLDER' ? (
              <>
                <ContextItem
                  onClick={() => {
                    setSelectedId(menu.node.id)
                    setCreating('FOLDER')
                    setNewName('')
                    setMenu(null)
                  }}
                >
                  <FolderPlus className="size-4" />
                  하위 폴더 추가
                </ContextItem>
                <ContextItem
                  onClick={() => {
                    setSelectedId(menu.node.id)
                    setCreating('DOC')
                    setNewName('')
                    setMenu(null)
                  }}
                >
                  <FilePlus className="size-4" />
                  문서 추가
                </ContextItem>
                <ContextItem
                  onClick={() => {
                    uploadParentRef.current = menu.node.id
                    setMenu(null)
                    fileInputRef.current?.click()
                  }}
                >
                  <Upload className="size-4" />
                  파일 업로드
                </ContextItem>
                <div className="my-1 h-px bg-surface-border-soft" />
              </>
            ) : null}
            <ContextItem
              danger
              onClick={() => {
                if (menu.confirmDelete) {
                  const target = menu.node
                  setMenu(null)
                  handleDelete(target)
                } else {
                  setMenu({ ...menu, confirmDelete: true })
                }
              }}
            >
              <Trash2 className="size-4" />
              {menu.confirmDelete ? '정말 삭제할까요?' : '삭제'}
            </ContextItem>
          </div>
        </>
      ) : null}
    </div>
  )
}

function ContextItem({
  danger,
  onClick,
  children,
}: {
  danger?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm font-medium ' +
        (danger
          ? 'text-destructive hover:bg-danger-glass'
          : 'text-text-secondary hover:bg-surface-muted')
      }
    >
      {children}
    </button>
  )
}
