/**
 * SSE 수신 — 바이트를 프레임으로 잘라 넘겨준다.
 *
 * EventSource를 못 쓰는 이유가 있다: GET 전용이라 Authorization 헤더도 body도
 * 못 붙인다. 그래서 fetch + getReader()로 직접 읽고, EventSource가 공짜로
 * 해주던 프레임 파싱을 여기서 대신한다. 이 파일이 그 대가를 혼자 진다.
 */

/** 서버가 보내는 모든 프레임은 type을 갖는다 — sse.ts(서버)와 짝이다 */
type Frame = { type: string }

export type SseHandlers<T extends Frame> = {
  /** type별 처리기. 등록 안 된 type이 오면 조용히 무시된다 */
  [K in T['type']]?: (frame: Extract<T, { type: K }>) => void
}

export type SseResult =
  /** [DONE]을 받고 정상 종료 */
  | { ok: true }
  /** [DONE] 없이 연결이 끊겼다 — 서버 크래시·네트워크 단절 */
  | { ok: false; reason: 'disconnected' }

/**
 * 응답 스트림을 끝까지 읽으며 프레임마다 handler를 부른다.
 *
 * 정상 종료는 [DONE]으로만 판정한다. reader의 done:true는 "연결이 닫혔다"만
 * 알려줄 뿐 이유를 말해주지 않아서(정상 종료인지 서버가 죽은 건지) 그것만으로는
 * 성공을 단정할 수 없다.
 */
export async function readSseStream<T extends Frame>(
  response: Response,
  handlers: SseHandlers<T>,
): Promise<SseResult> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      // [DONE]을 못 만난 채 여기 왔다 = 비정상 종료
      if (done) return { ok: false, reason: 'disconnected' }

      buffer += decoder.decode(value, { stream: true })

      // 프레임 구분자는 \n\n. 마지막 조각은 아직 \n\n을 못 만나 잘렸을 수
      // 있으므로 버퍼에 남겨 다음 read의 앞부분과 이어붙인다.
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''

      for (const frame of frames) {
        for (const line of frame.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') return { ok: true }

          let parsed: T
          try {
            parsed = JSON.parse(payload) as T
          } catch {
            continue // 깨진 줄 하나 때문에 스트림 전체를 죽이지 않는다
          }

          const handle = handlers[parsed.type as T['type']] as
            | ((frame: T) => void)
            | undefined
          handle?.(parsed)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
