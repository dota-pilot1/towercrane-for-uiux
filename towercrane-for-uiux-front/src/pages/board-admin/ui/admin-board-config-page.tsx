import { useEffect, useState } from 'react'
import { Settings2 } from 'lucide-react'
import type { BoardConfig, BoardKind } from '../../../entities/board/model/types'
import {
  useAdminBoardConfigs,
  useCreateBoardConfig,
  useDeactivateBoardConfig,
  useUpdateBoardConfig,
} from '../../../features/board/model/use-board-queries'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { Switch } from '../../../shared/ui/switch'
import { Textarea } from '../../../shared/ui/textarea'

const emptyForm = {
  code: '',
  kind: 'GENERAL' as BoardKind,
  name: '',
  description: '',
  allowUserWrite: false,
  allowComment: false,
  isActive: true,
  orderIdx: 0,
}

export function AdminBoardConfigPage() {
  const configsQuery = useAdminBoardConfigs()
  const createConfig = useCreateBoardConfig()
  const updateConfig = useUpdateBoardConfig()
  const deactivateConfig = useDeactivateBoardConfig()
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const configs = configsQuery.data ?? []
  const selected = configs.find((config) => config.code === selectedCode) ?? null

  useEffect(() => {
    if (!selected) return
    setForm({
      code: selected.code,
      kind: selected.kind,
      name: selected.name,
      description: selected.description ?? '',
      allowUserWrite: selected.allowUserWrite,
      allowComment: selected.allowComment,
      isActive: selected.isActive,
      orderIdx: selected.orderIdx,
    })
  }, [selected])

  const reset = () => {
    setSelectedCode(null)
    setForm(emptyForm)
  }

  const handleSave = async () => {
    if (selected) {
      await updateConfig.mutateAsync({ code: selected.code, body: form })
    } else {
      await createConfig.mutateAsync(form)
    }
    reset()
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="rounded-md border border-surface-border-soft p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="ui-icon-button-brand size-9">
              <Settings2 className="size-4" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text-primary">게시판 설정</h1>
              <p className="text-sm text-text-secondary">게시판 노출과 작성 정책을 관리합니다.</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={reset}>새 설정</Button>
        </div>

        <div className="overflow-hidden rounded-md border border-surface-border-soft">
          <div className="grid grid-cols-[minmax(0,1fr)_110px_100px_80px] bg-surface-muted px-4 py-3 text-xs font-black text-text-muted">
            <span>게시판</span>
            <span>유형</span>
            <span>작성</span>
            <span>상태</span>
          </div>
          <div className="divide-y divide-[var(--surface-border-soft)]">
            {configs.map((config) => (
              <button
                key={config.id}
                type="button"
                onClick={() => setSelectedCode(config.code)}
                className="grid w-full grid-cols-[minmax(0,1fr)_110px_100px_80px] items-center px-4 py-3 text-left transition hover:bg-surface-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-text-primary">{config.name}</span>
                  <span className="block truncate text-xs text-text-muted">{config.code}</span>
                </span>
                <span className="text-xs font-bold text-text-secondary">{config.kind}</span>
                <span className="text-xs text-text-secondary">{config.allowUserWrite ? '허용' : '차단'}</span>
                <span className="text-xs font-bold text-brand-primary">{config.isActive ? '활성' : '비활성'}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="h-fit rounded-md border border-surface-border-soft p-5">
        <h2 className="mb-4 text-base font-black text-text-primary">
          {selected ? '설정 수정' : '게시판 추가'}
        </h2>
        <BoardConfigForm
          form={form}
          selected={selected}
          setForm={setForm}
          onSave={handleSave}
          onDeactivate={() => selected && deactivateConfig.mutate(selected.code)}
          pending={createConfig.isPending || updateConfig.isPending}
        />
      </Card>
    </div>
  )
}

function BoardConfigForm({
  form,
  selected,
  setForm,
  onSave,
  onDeactivate,
  pending,
}: {
  form: typeof emptyForm
  selected: BoardConfig | null
  setForm: (form: typeof emptyForm) => void
  onSave: () => void
  onDeactivate: () => void
  pending: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      <Input
        value={form.code}
        disabled={Boolean(selected)}
        onChange={(event) => setForm({ ...form, code: event.target.value })}
        placeholder="code"
      />
      <Input
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
        placeholder="이름"
      />
      <Select
        value={form.kind}
        onChange={(event) => setForm({ ...form, kind: event.target.value as BoardKind })}
      >
        <option value="GENERAL">GENERAL</option>
        <option value="NOTICE">NOTICE</option>
        <option value="INQUIRY">INQUIRY</option>
        <option value="QNA">QNA</option>
        <option value="FREE">FREE</option>
        <option value="FAQ">FAQ</option>
        <option value="EVENT">EVENT</option>
      </Select>
      <Textarea
        value={form.description}
        onChange={(event) => setForm({ ...form, description: event.target.value })}
        placeholder="설명"
        rows={4}
      />
      <Input
        type="number"
        value={form.orderIdx}
        onChange={(event) => setForm({ ...form, orderIdx: Number(event.target.value) })}
        placeholder="정렬 순서"
      />
      <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
        <div className="flex flex-col gap-3">
          <Switch
            checked={form.allowUserWrite}
            onCheckedChange={(checked) => setForm({ ...form, allowUserWrite: checked })}
            label="사용자 작성 허용"
          />
          <Switch
            checked={form.allowComment}
            onCheckedChange={(checked) => setForm({ ...form, allowComment: checked })}
            label="댓글 허용"
          />
          <Switch
            checked={form.isActive}
            onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
            label="활성"
          />
        </div>
      </div>
      <div className="flex justify-between gap-2 pt-2">
        {selected ? (
          <Button variant="secondary" tone="danger" onClick={onDeactivate}>
            비활성화
          </Button>
        ) : <span />}
        <Button onClick={onSave} disabled={pending || !form.code.trim() || !form.name.trim()}>
          저장
        </Button>
      </div>
    </div>
  )
}
