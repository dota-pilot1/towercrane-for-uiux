import type { ClipboardEvent } from 'react'
import {
  parseDbTableContent,
  parseTsvToColumns,
  type DbColumn,
  type DbTableContent,
} from '../../types/block'

export function DbTableBlockEditor({
  content,
  onChange,
}: {
  content: string
  onChange: (val: string) => void
}) {
  const dbTable = parseDbTableContent(content)

  const update = (next: DbTableContent) => {
    onChange(JSON.stringify(next))
  }

  const handleTsvPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text/plain')
    if (!text.includes('\t')) return
    e.preventDefault()
    const parsed = parseTsvToColumns(text)
    if (parsed.length > 0) {
      update({ ...dbTable, columns: parsed })
    }
  }

  const handleAddColumn = () => {
    const newCol: DbColumn = {
      no: dbTable.columns.length + 1,
      name: '',
      comment: '',
      type: 'VARCHAR',
      size: '',
      pk: false,
      notNull: false,
      note: '',
    }
    update({ ...dbTable, columns: [...dbTable.columns, newCol] })
  }

  const handleDeleteColumn = (index: number) => {
    update({
      ...dbTable,
      columns: dbTable.columns
        .filter((_, i) => i !== index)
        .map((col, i) => ({ ...col, no: i + 1 })),
    })
  }

  const handleUpdateColumn = (
    index: number,
    field: keyof DbColumn,
    value: string | number | boolean,
  ) => {
    update({
      ...dbTable,
      columns: dbTable.columns.map((col, i) =>
        i === index ? { ...col, [field]: value } : col,
      ),
    })
  }

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-2">
          <label className="text-xs text-slate-400 mb-1 block font-medium">
            테이블명 *
          </label>
          <input
            type="text"
            value={dbTable.tableName}
            onChange={(e) => update({ ...dbTable, tableName: e.target.value })}
            placeholder="users, task_posts"
            className="w-full px-2.5 py-1.5 text-xs text-slate-100 bg-slate-950/40 border border-white/10 rounded-lg outline-none focus:border-emerald-500/40 placeholder:text-slate-600"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block font-medium">스키마</label>
          <input
            type="text"
            value={dbTable.schema}
            onChange={(e) => update({ ...dbTable, schema: e.target.value })}
            placeholder="public"
            className="w-full px-2.5 py-1.5 text-xs text-slate-100 bg-slate-950/40 border border-white/10 rounded-lg outline-none focus:border-emerald-500/40 placeholder:text-slate-600"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block font-medium">분류</label>
          <input
            type="text"
            value={dbTable.category}
            onChange={(e) => update({ ...dbTable, category: e.target.value })}
            placeholder="사용자"
            className="w-full px-2.5 py-1.5 text-xs text-slate-100 bg-slate-950/40 border border-white/10 rounded-lg outline-none focus:border-emerald-500/40 placeholder:text-slate-600"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400 mb-1 block font-medium">테이블 설명</label>
        <input
          type="text"
          value={dbTable.description}
          onChange={(e) => update({ ...dbTable, description: e.target.value })}
          placeholder="이 테이블이 무엇을 저장하는지"
          className="w-full px-2.5 py-1.5 text-xs text-slate-100 bg-slate-950/40 border border-white/10 rounded-lg outline-none focus:border-emerald-500/40 placeholder:text-slate-600"
        />
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
        <label className="text-xs font-semibold mb-1.5 block text-amber-300">
          📋 DBeaver / Excel에서 붙여넣기 (TSV)
        </label>
        <textarea
          onPaste={handleTsvPaste}
          rows={3}
          placeholder={`여기에 Ctrl+V\n\n예시: id\tBIGINT\t\tNO`}
          className="w-full px-2.5 py-1.5 text-xs font-mono text-slate-100 bg-slate-950/40 border border-amber-500/20 rounded-lg outline-none placeholder:text-slate-600"
        />
        <p className="text-[10px] text-amber-200/60 mt-1">
          DBeaver에서 컬럼 정보를 복사한 후 위 영역에 붙여넣으면 자동으로 파싱됩니다
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-xs font-semibold text-slate-300">컬럼 정보</label>
          <button
            onClick={handleAddColumn}
            className="text-xs px-2 py-1 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 rounded border border-emerald-500/20"
          >
            + 행 추가
          </button>
        </div>

        <div className="border border-white/10 rounded-lg overflow-x-auto bg-slate-950/40">
          <table className="w-full text-xs">
            <thead className="bg-slate-900/50 text-slate-400">
              <tr>
                <th className="px-2 py-2 text-center w-10 font-medium">No</th>
                <th className="px-2 py-2 text-left font-medium">컬럼명</th>
                <th className="px-2 py-2 text-left font-medium">설명</th>
                <th className="px-2 py-2 text-left font-medium">타입</th>
                <th className="px-2 py-2 text-left w-16 font-medium">크기</th>
                <th className="px-2 py-2 text-center w-10 font-medium">PK</th>
                <th className="px-2 py-2 text-center w-10 font-medium">NN</th>
                <th className="px-2 py-2 text-left font-medium">비고</th>
                <th className="px-2 py-2 text-center w-8"></th>
              </tr>
            </thead>
            <tbody>
              {dbTable.columns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-slate-500 text-xs">
                    + 행 추가 버튼을 클릭하거나 TSV를 붙여넣으세요
                  </td>
                </tr>
              ) : (
                dbTable.columns.map((col, idx) => (
                  <tr
                    key={idx}
                    className={`border-t border-white/5 hover:bg-white/4 ${
                      col.pk ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="px-2 py-1 text-center text-slate-500">{col.no}</td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => handleUpdateColumn(idx, 'name', e.target.value)}
                        className="w-full px-1.5 py-1 bg-transparent border border-white/10 rounded text-xs text-slate-100 focus:border-emerald-500/40 outline-none"
                        placeholder="컬럼명"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={col.comment}
                        onChange={(e) => handleUpdateColumn(idx, 'comment', e.target.value)}
                        className="w-full px-1.5 py-1 bg-transparent border border-white/10 rounded text-xs text-slate-100 focus:border-emerald-500/40 outline-none"
                        placeholder="설명"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={col.type}
                        onChange={(e) => handleUpdateColumn(idx, 'type', e.target.value)}
                        className="w-full px-1.5 py-1 bg-transparent border border-white/10 rounded text-xs font-mono text-slate-100 focus:border-emerald-500/40 outline-none"
                        placeholder="VARCHAR"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={col.size}
                        onChange={(e) => handleUpdateColumn(idx, 'size', e.target.value)}
                        className="w-full px-1.5 py-1 bg-transparent border border-white/10 rounded text-xs text-slate-100 text-center focus:border-emerald-500/40 outline-none"
                      />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={col.pk}
                        onChange={(e) => handleUpdateColumn(idx, 'pk', e.target.checked)}
                        className="size-3.5 accent-emerald-500"
                      />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={col.notNull}
                        onChange={(e) => handleUpdateColumn(idx, 'notNull', e.target.checked)}
                        className="size-3.5 accent-emerald-500"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={col.note}
                        onChange={(e) => handleUpdateColumn(idx, 'note', e.target.value)}
                        className="w-full px-1.5 py-1 bg-transparent border border-white/10 rounded text-xs text-slate-100 focus:border-emerald-500/40 outline-none"
                        placeholder="FK 등"
                      />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => handleDeleteColumn(idx)}
                        className="text-rose-400 hover:text-rose-300 text-xs"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {dbTable.columns.length > 0 && (
          <p className="text-[10px] text-slate-500 mt-1">{dbTable.columns.length}개 컬럼</p>
        )}
      </div>
    </div>
  )
}
