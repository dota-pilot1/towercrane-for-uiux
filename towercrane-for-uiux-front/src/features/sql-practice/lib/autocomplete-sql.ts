export function autocompleteSql(
  text: string,
  cursorPos: number,
  keywords: readonly string[],
  tableNames: string[] = [],
  columnNames: string[] = [],
): { newText: string; newPos: number } | null {
  const before = text.slice(0, cursorPos)
  const match = before.match(/(\S+)$/)
  if (!match) return null

  const currentWord = match[1]
  // Don't complete if the word is already an exact match (case-insensitive)
  const upper = currentWord.toUpperCase()

  // Keywords take priority, then table names, then column names
  const candidates = [
    ...keywords,
    ...tableNames,
    ...columnNames,
  ]

  const found = candidates.find(
    (c) => c.toUpperCase().startsWith(upper) && c.toUpperCase() !== upper,
  )
  if (!found) return null

  const wordStart = cursorPos - currentWord.length
  const newText = text.slice(0, wordStart) + found + ' ' + text.slice(cursorPos)
  const newPos = wordStart + found.length + 1

  return { newText, newPos }
}
