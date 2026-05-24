const MIN_AUTOCOMPLETE_CHARS = 2

function getCurrentWord(text: string, cursorPos: number) {
  const before = text.slice(0, cursorPos)
  const match = before.match(/(\S+)$/)
  if (!match) return null
  const raw = match[1]
  const dotIdx = raw.lastIndexOf('.')
  const word = dotIdx >= 0 ? raw.slice(dotIdx + 1) : raw
  return { word, wordStart: cursorPos - word.length }
}

export function getAllMatches(
  text: string,
  cursorPos: number,
  keywords: readonly string[],
  tableNames: string[] = [],
  columnNames: string[] = [],
): string[] {
  const result = getCurrentWord(text, cursorPos)
  if (!result) return []
  const { word } = result
  if (word.length < MIN_AUTOCOMPLETE_CHARS) return []
  const upper = word.toUpperCase()
  const candidates = [...keywords, ...tableNames, ...columnNames]
  return candidates.filter((c) => c.toUpperCase().startsWith(upper) && c !== word)
}

export function applyCompletion(
  text: string,
  cursorPos: number,
  candidate: string,
): { newText: string; newPos: number } {
  const result = getCurrentWord(text, cursorPos)
  const wordStart = result?.wordStart ?? cursorPos
  const newText = text.slice(0, wordStart) + candidate + ' ' + text.slice(cursorPos)
  const newPos = wordStart + candidate.length + 1
  return { newText, newPos }
}

export function autocompleteSql(
  text: string,
  cursorPos: number,
  keywords: readonly string[],
  tableNames: string[] = [],
  columnNames: string[] = [],
): { newText: string; newPos: number } | null {
  const matches = getAllMatches(text, cursorPos, keywords, tableNames, columnNames)
  if (matches.length !== 1) return null
  return applyCompletion(text, cursorPos, matches[0])
}
