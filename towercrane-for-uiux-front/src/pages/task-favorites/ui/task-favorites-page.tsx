import { useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  AllCommunityModule,
  ModuleRegistry,
  type CellValueChangedEvent,
  type ColDef,
  type ICellRendererParams,
  type RowDragEndEvent,
} from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import {
  ArrowUpRight,
  LoaderCircle,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../../../shared/ui/page-header'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'

ModuleRegistry.registerModules([AllCommunityModule])

const STORAGE_KEY = 'towercrane.taskFavorites.v2'

type FavoriteRecord = {
  id: string
  order: number
  title: string
  url: string
  note: string
}

function createFavorite(order: number): FavoriteRecord {
  return {
    id: crypto.randomUUID(),
    order,
    title: '새 즐겨찾기',
    url: '',
    note: '',
  }
}

function readFavorites(): FavoriteRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is FavoriteRecord => {
        return (
          item &&
          typeof item.id === 'string' &&
          typeof item.order === 'number' &&
          typeof item.title === 'string'
        )
      })
      .map((item) => ({
        ...item,
        url: typeof item.url === 'string' ? item.url : '',
        note: typeof item.note === 'string' ? item.note : '',
      }))
      .sort((a, b) => a.order - b.order)
  } catch {
    return []
  }
}

function writeFavorites(records: FavoriteRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function normalizeUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('/') || /^https?:\/\//.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function suppressEditNavigation(params: {
  editing: boolean
  event: KeyboardEvent
}) {
  return params.editing && (params.event.key === 'Enter' || params.event.key === 'Tab')
}

function FavoriteCell(params: ICellRendererParams<FavoriteRecord>) {
  return (
    <div className="flex h-full items-center justify-center">
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-md text-brand-primary hover:bg-brand-glass"
        aria-label="즐겨찾기 삭제"
        onClick={() => params.context.removeFavorite(params.data?.id)}
      >
        <Star className="size-4 fill-brand-primary" />
      </button>
    </div>
  )
}

function OpenCell(params: ICellRendererParams<FavoriteRecord>) {
  const url = normalizeUrl(params.data?.url ?? '')
  return (
    <div className="flex h-full items-center justify-center">
      <button
        type="button"
        disabled={!url}
        className="inline-flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-brand-glass hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="열기"
        title="열기"
        onClick={() => {
          if (url) window.open(url, '_blank', 'noopener,noreferrer')
        }}
      >
        <ArrowUpRight className="size-4" />
      </button>
    </div>
  )
}

function DeleteCell(params: ICellRendererParams<FavoriteRecord>) {
  return (
    <div className="flex h-full items-center justify-center">
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-brand-glass hover:text-brand-primary"
        aria-label="삭제"
        title="삭제"
        onClick={() => params.context.removeFavorite(params.data?.id)}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

export function TaskFavoritesPage() {
  const gridRef = useRef<AgGridReact<FavoriteRecord>>(null)
  const [favorites, setFavorites] = useState<FavoriteRecord[]>(() => readFavorites())
  const [quickFilter, setQuickFilter] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const addFavorite = () => {
    setFavorites((current) => [...current, createFavorite(current.length)])
    setHasUnsavedChanges(true)
  }

  const removeFavorite = (id?: string) => {
    if (!id) return
    setFavorites((current) =>
      current
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, order: index })),
    )
    setHasUnsavedChanges(true)
  }

  const updateFavorite = (
    id: string,
    field: 'title' | 'url' | 'note',
    value: string,
  ) => {
    setFavorites((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
    setHasUnsavedChanges(true)
  }

  const saveFavorites = () => {
    gridRef.current?.api.stopEditing()
    const rows: FavoriteRecord[] = []
    gridRef.current?.api.forEachNode((node) => {
      if (node.data) rows.push(node.data)
    })
    const source = rows.length > 0 ? rows : favorites
    const normalized = source.map((item, index) => ({ ...item, order: index }))
    setFavorites(normalized)
    writeFavorites(normalized)
    setHasUnsavedChanges(false)
    toast.success('즐겨찾기를 저장했습니다.')
  }

  const columnDefs = useMemo<ColDef<FavoriteRecord>[]>(
    () => [
      {
        headerName: '',
        width: 54,
        pinned: 'left',
        sortable: false,
        filter: false,
        cellRenderer: FavoriteCell,
        cellStyle: { alignItems: 'center', display: 'flex', justifyContent: 'center', padding: 0 },
      },
      {
        headerName: '순서',
        field: 'order',
        width: 90,
        rowDrag: true,
        valueFormatter: (params) =>
          typeof params.value === 'number' ? String(params.value + 1) : '-',
      },
      {
        headerName: '이름',
        field: 'title',
        minWidth: 260,
        flex: 1,
        editable: true,
        suppressKeyboardEvent: suppressEditNavigation,
      },
      {
        headerName: 'URL',
        field: 'url',
        minWidth: 260,
        flex: 1,
        editable: true,
        suppressKeyboardEvent: suppressEditNavigation,
      },
      {
        headerName: '메모',
        field: 'note',
        minWidth: 260,
        flex: 1,
        editable: true,
        suppressKeyboardEvent: suppressEditNavigation,
      },
      {
        headerName: '',
        width: 52,
        sortable: false,
        filter: false,
        cellRenderer: OpenCell,
        cellStyle: { alignItems: 'center', display: 'flex', justifyContent: 'center', padding: 0 },
      },
      {
        headerName: '',
        width: 52,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: DeleteCell,
        cellStyle: { alignItems: 'center', display: 'flex', justifyContent: 'center', padding: 0 },
      },
    ],
    [],
  )

  const defaultColDef = useMemo<ColDef<FavoriteRecord>>(
    () => ({
      sortable: true,
      filter: false,
      resizable: true,
      suppressHeaderMenuButton: true,
    }),
    [],
  )

  const handleCellValueChanged = (event: CellValueChangedEvent<FavoriteRecord>) => {
    if (!event.data?.id) return
    const field = event.colDef.field
    if (field === 'title' || field === 'url' || field === 'note') {
      updateFavorite(event.data.id, field, String(event.newValue ?? ''))
    }
  }

  const handleRowDragEnd = (event: RowDragEndEvent<FavoriteRecord>) => {
    const ordered: FavoriteRecord[] = []
    event.api.forEachNodeAfterFilterAndSort((node) => {
      if (node.data) ordered.push(node.data)
    })
    const orderedIds = new Set(ordered.map((item) => item.id))
    const hiddenRows = favorites.filter((item) => !orderedIds.has(item.id))
    setFavorites([...ordered, ...hiddenRows].map((item, index) => ({ ...item, order: index })))
    setHasUnsavedChanges(true)
  }

  return (
    <section className="space-y-5 ui-page-bg pb-20">
      <PageHeader
        icon={Star}
        title="즐찾 관리"
        description="직접 추가하고 정렬하는 즐겨찾기 목록"
      />

      <div className="ui-panel overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-surface-border-soft p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <span className="text-xs font-medium text-text-muted">
              행 추가 후 이름, URL, 메모를 편집하고 저장하세요. 삭제는 행 오른쪽 버튼을 사용합니다.
            </span>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={quickFilter}
                onChange={(event) => setQuickFilter(event.target.value)}
                placeholder="이름, URL, 메모 검색"
                className="pl-9"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button type="button" size="sm" onClick={addFavorite}>
                <Plus className="mr-1.5 size-4" />
                행 추가
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!hasUnsavedChanges}
                onClick={saveFavorites}
              >
                <Save className="mr-1.5 size-4" />
                저장
              </Button>
            </div>
          </div>
        </div>

      <div
          className="task-favorites-grid ag-theme-quartz h-[calc(100dvh-260px)] min-h-[560px] w-full"
          style={
            {
              '--ag-background-color': 'var(--surface-raised)',
              '--ag-foreground-color': 'var(--text-primary)',
              '--ag-secondary-foreground-color': 'var(--text-secondary)',
              '--ag-header-background-color': 'var(--surface-muted)',
              '--ag-border-color': 'var(--surface-border-soft)',
              '--ag-row-hover-color': 'var(--brand-glass)',
              '--ag-selected-row-background-color': 'var(--brand-glass)',
              '--ag-wrapper-border-radius': '0',
              '--ag-font-family': 'inherit',
              '--ag-font-size': '13px',
              '--ag-row-height': '40px',
              '--ag-header-height': '38px',
              '--ag-cell-horizontal-padding': '14px',
            } as React.CSSProperties
          }
        >
          <AgGridReact<FavoriteRecord>
            ref={gridRef}
            rowData={favorites}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            quickFilterText={quickFilter}
            rowDragManaged
            rowHeight={42}
            headerHeight={38}
            animateRows
            pagination
            paginationPageSize={20}
            paginationPageSizeSelector={[20, 50, 100]}
            loadingOverlayComponent={() => (
              <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                <LoaderCircle className="size-4 animate-spin" />
                즐겨찾기를 불러오는 중...
              </div>
            )}
            noRowsOverlayComponent={() => (
              <div className="flex flex-col items-center justify-center gap-2 text-sm text-text-secondary">
                <Star className="size-6 text-brand-primary" />
                행 추가 버튼으로 항목을 추가하세요.
              </div>
            )}
            context={{ removeFavorite }}
            onCellValueChanged={handleCellValueChanged}
            onRowDragEnd={handleRowDragEnd}
          />
        </div>
      </div>
      <style>
        {`
          .task-favorites-grid .ag-cell,
          .task-favorites-grid .ag-header-cell {
            align-items: center;
            display: flex;
          }

          .task-favorites-grid .ag-cell-wrapper,
          .task-favorites-grid .ag-cell-value,
          .task-favorites-grid .ag-header-cell-comp-wrapper,
          .task-favorites-grid .ag-header-cell-label {
            align-items: center;
            display: flex;
            min-height: 100%;
          }

          .task-favorites-grid .ag-header-cell-label {
            line-height: 1;
          }
        `}
      </style>
    </section>
  )
}
