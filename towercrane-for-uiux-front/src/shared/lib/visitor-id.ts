// 익명 방문자 식별 — 서버는 이 값으로 PV/UV/세션을 구분한다.
// visitorId: 영구(localStorage) — "사람" 단위
// sessionId: 30분 비활동마다 갱신(sessionStorage) — "방문" 단위

const VISITOR_KEY = 'tc_visitor_id'
const SESSION_KEY = 'tc_session_id'
const SESSION_TS_KEY = 'tc_session_ts'
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30분

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY)
  if (!id) {
    id = uuid()
    localStorage.setItem(VISITOR_KEY, id)
  }
  return id
}

export function getSessionId(): string {
  const now = Date.now()
  const last = Number(sessionStorage.getItem(SESSION_TS_KEY) ?? 0)
  let id = sessionStorage.getItem(SESSION_KEY)
  // 세션 없음 or 30분 이상 비활동 → 새 세션
  if (!id || now - last > SESSION_TIMEOUT) {
    id = uuid()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  sessionStorage.setItem(SESSION_TS_KEY, String(now))
  return id
}
