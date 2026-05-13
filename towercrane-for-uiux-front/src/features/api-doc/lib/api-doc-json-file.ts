const MAX_JSON_FILE_SIZE = 2 * 1024 * 1024

export function downloadJsonFile(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function readJsonFile<T>(file: File): Promise<T> {
  if (!file.name.toLowerCase().endsWith('.json')) {
    throw new Error('JSON 파일만 가져올 수 있습니다.')
  }
  if (file.size > MAX_JSON_FILE_SIZE) {
    throw new Error('2MB 이하의 JSON 파일만 가져올 수 있습니다.')
  }

  const text = await file.text()
  if (!text.trim()) {
    throw new Error('빈 JSON 파일입니다.')
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('JSON 형식이 올바르지 않습니다.')
  }
}

export function createApiDocExportFileName(date = new Date()) {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    '-',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join('')

  return `towercrane-postman-lite-${stamp}.json`
}
