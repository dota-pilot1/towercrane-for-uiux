const COPY_PROPS = [
  'boxSizing', 'width',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
  'lineHeight', 'letterSpacing', 'wordSpacing', 'textTransform', 'tabSize',
] as const

export function getCaretCoords(
  textarea: HTMLTextAreaElement,
  pos: number,
): { top: number; left: number } {
  const computed = window.getComputedStyle(textarea)
  const div = document.createElement('div')

  COPY_PROPS.forEach((prop) => {
    ;(div.style as Record<string, string>)[prop] = computed[prop]
  })

  Object.assign(div.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    visibility: 'hidden',
    pointerEvents: 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflow: 'hidden',
  })

  div.textContent = textarea.value.slice(0, pos)

  const marker = document.createElement('span')
  marker.textContent = '​'
  div.appendChild(marker)

  const parent = textarea.parentElement ?? document.body
  parent.appendChild(div)

  const coords = {
    top: marker.offsetTop - textarea.scrollTop,
    left: marker.offsetLeft,
  }

  parent.removeChild(div)
  return coords
}
