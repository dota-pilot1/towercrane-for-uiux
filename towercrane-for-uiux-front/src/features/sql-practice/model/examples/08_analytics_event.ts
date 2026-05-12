import { defineExampleSet } from './shared'

export const analyticsEventExamples = defineExampleSet('08_analytics_event.sql', {
  beginner: [
    {
      title: '마케팅 수신 동의 사용자',
      description: '마케팅 수신에 동의한 사용자들의 아이디(id), 이메일(email), 가입일(signed_up_at)을 가입일이 빠른 순서대로 보여주세요. 마케팅 캠페인 발송 대상 목록을 만들 때 사용합니다.',
      hint: '단일 테이블 필터 + 정렬',
      explanation: 'WHERE 절로 marketing_opt_in 플래그를 1로 제한한 뒤, ORDER BY로 가입일 오름차순 정렬합니다. boolean 성격의 컬럼을 필터링하는 가장 기본적인 패턴입니다.',
      relatedTables: ['users'],
      sql: `SELECT id, email, signed_up_at
FROM users
WHERE marketing_opt_in = 1
ORDER BY signed_up_at;`,
    },
    {
      title: '캠페인 채널별 수',
      description: '마케팅 캠페인을 채널(channel)별로 묶어 채널별 캠페인 개수를 많은 순서대로 보여주세요. 어느 채널에 캠페인이 집중되어 있는지 파악할 때 사용합니다.',
      hint: '카테고리별 집계',
      explanation: 'GROUP BY로 channel을 묶고 COUNT(*)로 개수를 셉니다. 집계 결과를 ORDER BY DESC로 정렬해 상위 채널을 빠르게 확인할 수 있습니다.',
      relatedTables: ['campaigns'],
      sql: `SELECT channel, COUNT(*) AS campaign_count
FROM campaigns
GROUP BY channel
ORDER BY campaign_count DESC;`,
    },
    {
      title: '디바이스 유형별 수',
      description: '디바이스를 유형(device_type)별로 묶어 각 유형의 등록 수를 많은 순서대로 보여주세요. 모바일·데스크톱·태블릿 비중을 비교할 때 사용합니다.',
      hint: '카테고리별 집계',
      explanation: 'GROUP BY로 device_type을 그룹화하고 COUNT(*)로 행 개수를 집계합니다. 카테고리 분포를 빠르게 확인하는 표준 형태입니다.',
      relatedTables: ['devices'],
      sql: `SELECT device_type, COUNT(*) AS device_count
FROM devices
GROUP BY device_type
ORDER BY device_count DESC;`,
    },
    {
      title: '페이지 그룹별 수',
      description: '페이지를 그룹(page_group)별로 묶어 그룹별 페이지 개수를 많은 순서대로 보여주세요. 홈·상품·결제 등 어느 영역에 페이지가 많은지 파악할 때 사용합니다.',
      hint: '카테고리별 집계',
      explanation: 'GROUP BY로 page_group을 묶고 COUNT(*)로 페이지 수를 셉니다. 사이트 구조 분포를 확인하는 데 자주 쓰는 형태입니다.',
      relatedTables: ['pages'],
      sql: `SELECT page_group, COUNT(*) AS page_count
FROM pages
GROUP BY page_group
ORDER BY page_count DESC;`,
    },
    {
      title: '일자별 세션 수',
      description: '방문 세션을 일자별로 묶어 날짜(visit_date)와 그 날의 세션 수를 날짜 순서대로 보여주세요. 일별 트래픽 추세를 볼 때 사용합니다.',
      hint: '날짜 집계',
      explanation: 'date() 함수로 timestamp를 일자 단위로 자른 뒤 GROUP BY로 묶어 COUNT합니다. 일별 시계열 집계의 가장 기본형입니다.',
      relatedTables: ['sessions'],
      sql: `SELECT date(started_at) AS visit_date, COUNT(*) AS session_count
FROM sessions
GROUP BY date(started_at)
ORDER BY visit_date;`,
    },
    {
      title: '이벤트명별 수',
      description: '이벤트를 이름(event_name)별로 묶어 이벤트별 발생 횟수를 많은 순서대로 보여주세요. 페이지뷰·클릭·구매 등 어떤 행동이 자주 일어나는지 파악할 때 사용합니다.',
      hint: '카테고리별 집계',
      explanation: 'GROUP BY로 event_name을 묶고 COUNT(*)로 횟수를 집계합니다. 행동 빈도 분포를 보는 표준 형태입니다.',
      relatedTables: ['events'],
      sql: `SELECT event_name, COUNT(*) AS event_count
FROM events
GROUP BY event_name
ORDER BY event_count DESC;`,
    },
    {
      title: '구매 이벤트',
      description: '구매(purchase)에 해당하는 이벤트만 골라 이벤트 아이디(id), 세션 아이디(session_id), 구매 금액(event_value), 발생 시각(occurred_at)을 시간 순서대로 보여주세요. 구매 발생 내역을 확인할 때 사용합니다.',
      hint: '단일 테이블 필터 + 정렬',
      explanation: 'WHERE 절로 event_name을 purchase로 제한해 특정 유형의 이벤트만 추출합니다. 이벤트 로그에서 특정 행동만 골라낼 때 자주 쓰는 패턴입니다.',
      relatedTables: ['events'],
      sql: `SELECT id, session_id, event_value, occurred_at
FROM events
WHERE event_name = 'purchase'
ORDER BY occurred_at;`,
    },
    {
      title: '익명 세션',
      description: '로그인하지 않은 익명 방문 세션만 골라 세션 아이디(id), 캠페인 아이디(campaign_id), 디바이스 아이디(device_id), 시작 시각(started_at)을 시작 시각 순서대로 보여주세요. 비회원 트래픽을 분석할 때 사용합니다.',
      hint: 'NULL 필터',
      explanation: 'IS NULL 조건으로 user_id가 비어 있는 행만 선택합니다. NULL은 = 연산자로 비교할 수 없으므로 반드시 IS NULL을 사용해야 합니다.',
      relatedTables: ['sessions'],
      sql: `SELECT id, campaign_id, device_id, started_at
FROM sessions
WHERE user_id IS NULL
ORDER BY started_at;`,
    },
    {
      title: '세션 길이 보기',
      description: '종료된 방문 세션들을 대상으로 세션 아이디(id), 시작 시각(started_at), 종료 시각(ended_at), 세션 길이(session_minutes, 분 단위)를 길이가 긴 순서대로 보여주세요. 분 단위는 소수점 첫째 자리까지 반올림하세요. 체류 시간이 긴 세션을 찾을 때 사용합니다.',
      hint: '날짜 차이 계산',
      explanation: 'julianday() 함수로 두 timestamp의 차이를 일 단위로 구한 뒤 24*60을 곱해 분으로 환산합니다. SQLite에서 시간 간격을 계산하는 대표적인 방식입니다.',
      relatedTables: ['sessions'],
      sql: `SELECT id, started_at, ended_at,
  ROUND((julianday(ended_at) - julianday(started_at)) * 24 * 60, 1) AS session_minutes
FROM sessions
WHERE ended_at IS NOT NULL
ORDER BY session_minutes DESC;`,
    },
    {
      title: '이벤트 값 합계',
      description: '이벤트를 이름별로 묶어 이벤트 값(event_value)의 합계(total_value)를 큰 순서대로 보여주세요. 값이 비어 있는 경우 0으로 처리합니다. 어떤 행동이 가장 큰 가치를 만드는지 파악할 때 사용합니다.',
      hint: '집계 + NULL 처리',
      explanation: 'SUM 집계 함수 안에서 COALESCE로 NULL을 0으로 치환합니다. NULL을 그대로 더하면 결과가 NULL이 될 수 있어 사전 처리가 필요합니다.',
      relatedTables: ['events'],
      sql: `SELECT event_name, SUM(COALESCE(event_value, 0)) AS total_value
FROM events
GROUP BY event_name
ORDER BY total_value DESC;`,
    },
  ],
  intermediate: [
    {
      title: '세션과 사용자',
      description: '방문 세션마다 세션 아이디(session_id), 사용자 이메일(email), 시작 시각(started_at)을 시작 시각 순서대로 보여주세요. 익명 세션도 누락 없이 포함하고 이때 이메일은 비어 있는 채로 보여주세요.',
      hint: 'LEFT JOIN',
      explanation: 'sessions를 기준으로 users를 LEFT JOIN해 user_id가 NULL이어도 세션 행이 사라지지 않도록 합니다. 익명 트래픽까지 보존하는 핵심 패턴입니다.',
      relatedTables: ['sessions', 'users'],
      sql: `SELECT s.id AS session_id, u.email, s.started_at
FROM sessions s
LEFT JOIN users u ON u.id = s.user_id
ORDER BY s.started_at;`,
    },
    {
      title: '세션과 캠페인',
      description: '방문 세션마다 세션 아이디(session_id), 캠페인 이름(campaign_name), 채널(channel), 시작 시각(started_at)을 시작 시각 순서대로 보여주세요. 캠페인 없이 들어온 자연유입 세션도 누락 없이 포함합니다.',
      hint: 'LEFT JOIN',
      explanation: 'sessions에 campaigns를 LEFT JOIN해 campaign_id가 NULL인 자연유입 세션도 결과에 남깁니다. 유입 경로 분석에서 organic을 누락하지 않는 패턴입니다.',
      relatedTables: ['sessions', 'campaigns'],
      sql: `SELECT s.id AS session_id, c.name AS campaign_name, c.channel, s.started_at
FROM sessions s
LEFT JOIN campaigns c ON c.id = s.campaign_id
ORDER BY s.started_at;`,
    },
    {
      title: '세션과 디바이스',
      description: '방문 세션마다 세션 아이디(session_id), 디바이스 유형(device_type), 운영체제(os), 브라우저(browser)를 세션 아이디 순서대로 보여주세요. 디바이스가 매칭되는 세션만 표시합니다.',
      hint: 'INNER JOIN',
      explanation: 'sessions와 devices를 device_id로 INNER JOIN해 매칭되는 행만 결합합니다. 모든 세션이 디바이스를 가질 것이라 가정할 수 있을 때 쓰는 형태입니다.',
      relatedTables: ['sessions', 'devices'],
      sql: `SELECT s.id AS session_id, d.device_type, d.os, d.browser
FROM sessions s
JOIN devices d ON d.id = s.device_id
ORDER BY s.id;`,
    },
    {
      title: '페이지별 이벤트 수',
      description: '페이지별로 경로(path), 페이지 그룹(page_group), 그 페이지에서 발생한 이벤트 수(event_count)를 많은 순서대로 보여주세요. 이벤트가 없는 페이지도 0으로 포함합니다.',
      hint: 'LEFT JOIN 후 집계',
      explanation: 'pages를 기준으로 events를 LEFT JOIN해 이벤트가 없는 페이지도 유지한 뒤, COUNT(e.id)는 NULL을 세지 않으므로 자연스럽게 0이 됩니다. "없음을 0으로" 표현하는 표준 패턴입니다.',
      relatedTables: ['events', 'pages'],
      sql: `SELECT p.path, p.page_group, COUNT(e.id) AS event_count
FROM pages p
LEFT JOIN events e ON e.page_id = p.id
GROUP BY p.id, p.path, p.page_group
ORDER BY event_count DESC;`,
    },
    {
      title: '캠페인별 세션 수',
      description: '캠페인마다 캠페인 이름(name)과 해당 캠페인이 유치한 세션 수(session_count)를 많은 순서대로 보여주세요. 세션이 없는 캠페인도 0으로 함께 보여줍니다.',
      hint: 'LEFT JOIN 후 집계',
      explanation: 'campaigns를 기준으로 sessions를 LEFT JOIN해 매칭되는 세션이 없어도 캠페인이 결과에 남도록 합니다. 성과가 0인 캠페인을 누락하지 않는 핵심 패턴입니다.',
      relatedTables: ['campaigns', 'sessions'],
      sql: `SELECT c.name, COUNT(s.id) AS session_count
FROM campaigns c
LEFT JOIN sessions s ON s.campaign_id = c.id
GROUP BY c.id, c.name
ORDER BY session_count DESC;`,
    },
    {
      title: '디바이스별 이벤트 수',
      description: '디바이스 유형(device_type)별로 발생한 전체 이벤트 수(event_count)를 많은 순서대로 보여주세요. 디바이스 → 세션 → 이벤트 경로로 연결해 집계합니다.',
      hint: '3-way JOIN 집계',
      explanation: 'devices → sessions → events를 순차적으로 JOIN한 뒤 device_type으로 그룹화합니다. 두 단계 이상의 관계를 거쳐야 하는 집계의 전형적인 형태입니다.',
      relatedTables: ['devices', 'sessions', 'events'],
      sql: `SELECT d.device_type, COUNT(e.id) AS event_count
FROM devices d
JOIN sessions s ON s.device_id = d.id
JOIN events e ON e.session_id = s.id
GROUP BY d.device_type
ORDER BY event_count DESC;`,
    },
    {
      title: '사용자별 세션 수',
      description: '사용자마다 이메일(email)과 그 사용자의 세션 수(session_count)를 많은 순서대로 보여주세요. 세션이 한 번도 없는 사용자도 0으로 포함합니다.',
      hint: 'LEFT JOIN 후 집계',
      explanation: 'users를 기준으로 sessions를 LEFT JOIN해 방문 이력이 없는 사용자도 유지합니다. COUNT(s.id)는 NULL을 세지 않아 자연스럽게 0이 됩니다.',
      relatedTables: ['users', 'sessions'],
      sql: `SELECT u.email, COUNT(s.id) AS session_count
FROM users u
LEFT JOIN sessions s ON s.user_id = u.id
GROUP BY u.id, u.email
ORDER BY session_count DESC;`,
    },
    {
      title: '사용자별 이벤트 수',
      description: '사용자마다 이메일(email)과 그 사용자가 발생시킨 이벤트 수(event_count)를 많은 순서대로 보여주세요. 활동 이력이 있는 사용자만 표시합니다.',
      hint: '3-way INNER JOIN 집계',
      explanation: 'users → sessions → events를 INNER JOIN으로 연결해 실제로 활동한 사용자만 결과에 남깁니다. 활성 사용자 랭킹을 만드는 표준 형태입니다.',
      relatedTables: ['users', 'sessions', 'events'],
      sql: `SELECT u.email, COUNT(e.id) AS event_count
FROM users u
JOIN sessions s ON s.user_id = u.id
JOIN events e ON e.session_id = s.id
GROUP BY u.id, u.email
ORDER BY event_count DESC;`,
    },
    {
      title: '캠페인 채널별 구매 금액',
      description: '캠페인 채널(channel)별로 그 채널을 통해 들어온 세션에서 발생한 구매 금액 합계(purchase_amount)를 큰 순서대로 보여주세요. 채널별 매출 기여도를 비교할 때 사용합니다.',
      hint: '필터 + 집계 JOIN',
      explanation: 'campaigns → sessions → events를 JOIN한 뒤 WHERE로 purchase 이벤트만 남기고 channel별로 SUM합니다. 조건부 매출 집계의 기본형입니다.',
      relatedTables: ['campaigns', 'sessions', 'events'],
      sql: `SELECT c.channel, SUM(e.event_value) AS purchase_amount
FROM campaigns c
JOIN sessions s ON s.campaign_id = c.id
JOIN events e ON e.session_id = s.id
WHERE e.event_name = 'purchase'
GROUP BY c.channel
ORDER BY purchase_amount DESC;`,
    },
    {
      title: '페이지뷰 경로',
      description: '페이지뷰(page_view) 이벤트만 골라 세션 아이디(session_id), 페이지 경로(path), 발생 시각(occurred_at)을 세션 순서와 시간 순서대로 보여주세요. 사용자의 페이지 이동 동선을 추적할 때 사용합니다.',
      hint: '필터 + JOIN + 다중 정렬',
      explanation: 'events에 sessions와 pages를 JOIN해 경로 정보를 붙이고, WHERE로 page_view만 남깁니다. ORDER BY 두 컬럼을 써서 세션 안에서 시간 순으로 정렬합니다.',
      relatedTables: ['sessions', 'events', 'pages'],
      sql: `SELECT s.id AS session_id, p.path, e.occurred_at
FROM events e
JOIN sessions s ON s.id = e.session_id
JOIN pages p ON p.id = e.page_id
WHERE e.event_name = 'page_view'
ORDER BY s.id, e.occurred_at;`,
    },
  ],
  advanced: [
    {
      title: '일자별 순사용자',
      description: '로그인 사용자만 대상으로 일자(visit_date)별 순방문자 수(users, 중복 제거된 사용자 수)를 날짜 순서대로 보여주세요. 일별 DAU 지표를 만들 때 사용합니다.',
      hint: 'DISTINCT 집계',
      explanation: 'COUNT(DISTINCT user_id)로 같은 사용자가 여러 세션을 만들어도 한 번만 셉니다. DAU/WAU/MAU 같은 unique user 지표의 표준 형태입니다.',
      relatedTables: ['sessions'],
      sql: `SELECT date(started_at) AS visit_date, COUNT(DISTINCT user_id) AS users
FROM sessions
WHERE user_id IS NOT NULL
GROUP BY date(started_at)
ORDER BY visit_date;`,
    },
    {
      title: '캠페인별 전환율',
      description: '캠페인별로 이름(name), 세션 수(sessions), 전환 세션 수(converted_sessions, 회원가입 제출 또는 구매가 발생한 세션), 전환율(conversion_rate, %)을 전환율이 높은 순서대로 보여주세요. 전환율은 소수점 첫째 자리까지 반올림하세요.',
      hint: '조건부 DISTINCT 집계',
      explanation: 'CASE 식을 COUNT(DISTINCT ...) 안에 넣어 특정 조건을 만족한 세션만 unique하게 셉니다. 동일 세션에서 여러 전환 이벤트가 나와도 한 번만 카운트되어 정확한 전환율이 나옵니다.',
      relatedTables: ['campaigns', 'sessions', 'events'],
      sql: `SELECT
  c.name,
  COUNT(DISTINCT s.id) AS sessions,
  COUNT(DISTINCT CASE WHEN e.event_name IN ('signup_submit', 'purchase') THEN s.id END) AS converted_sessions,
  ROUND(COUNT(DISTINCT CASE WHEN e.event_name IN ('signup_submit', 'purchase') THEN s.id END) * 100.0 / COUNT(DISTINCT s.id), 1) AS conversion_rate
FROM campaigns c
LEFT JOIN sessions s ON s.campaign_id = c.id
LEFT JOIN events e ON e.session_id = s.id
GROUP BY c.id, c.name
ORDER BY conversion_rate DESC;`,
    },
    {
      title: '세션별 이벤트 순서',
      description: '각 세션 안에서 이벤트가 발생한 순서대로 세션 아이디(session_id), 단계 번호(step_no), 이벤트 이름(event_name), 페이지 경로(path)를 보여주세요. 사용자 행동 흐름을 단계별로 살펴볼 때 사용합니다.',
      hint: 'ROW_NUMBER 윈도우 함수',
      explanation: 'ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at)로 세션별로 시간 순 일련번호를 매깁니다. 퍼널/시퀀스 분석의 출발점이 되는 패턴입니다.',
      relatedTables: ['sessions', 'events', 'pages'],
      sql: `SELECT
  e.session_id,
  ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.occurred_at) AS step_no,
  e.event_name,
  p.path
FROM events e
JOIN pages p ON p.id = e.page_id
ORDER BY e.session_id, step_no;`,
    },
    {
      title: '세션별 첫 페이지',
      description: '각 세션의 첫 번째 이벤트가 일어난 페이지를 찾아 세션 아이디(session_id), 첫 페이지 경로(first_path), 발생 시각(occurred_at)을 세션 아이디 순서대로 보여주세요. 랜딩 페이지 분석에 사용합니다.',
      hint: 'CTE + ROW_NUMBER 후 1행 필터',
      explanation: 'WITH 절로 세션별 시간 순 순위를 매긴 뒤 rank_no = 1만 남깁니다. "그룹별 첫 행"을 뽑는 정석적인 윈도우 함수 활용입니다.',
      relatedTables: ['sessions', 'events', 'pages'],
      sql: `WITH ranked_events AS (
  SELECT e.*, ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.occurred_at) AS rank_no
  FROM events e
)
SELECT r.session_id, p.path AS first_path, r.occurred_at
FROM ranked_events r
JOIN pages p ON p.id = r.page_id
WHERE r.rank_no = 1
ORDER BY r.session_id;`,
    },
    {
      title: '디바이스별 평균 세션 길이',
      description: '종료된 세션만 대상으로 디바이스 유형(device_type)별 평균 세션 길이(avg_minutes, 분 단위)를 길이가 긴 순서대로 보여주세요. 평균은 소수점 첫째 자리까지 반올림합니다. 디바이스별 사용자 몰입도를 비교할 때 사용합니다.',
      hint: '시간 차이 + 그룹 평균',
      explanation: 'julianday로 분 단위 세션 길이를 만든 뒤 AVG로 device_type별 평균을 구합니다. 시간 계산과 집계를 결합한 형태입니다.',
      relatedTables: ['devices', 'sessions'],
      sql: `SELECT d.device_type, ROUND(AVG((julianday(s.ended_at) - julianday(s.started_at)) * 24 * 60), 1) AS avg_minutes
FROM sessions s
JOIN devices d ON d.id = s.device_id
WHERE s.ended_at IS NOT NULL
GROUP BY d.device_type
ORDER BY avg_minutes DESC;`,
    },
    {
      title: '회원가입 퍼널 세션',
      description: '회원가입 제출(signup_submit)이 일어난 세션만 골라 세션 아이디(session_id), 페이지뷰 수(page_views), 회원가입 제출 수(signup_submits)를 세션 아이디 순서대로 보여주세요. 가입 직전 행동량을 분석할 때 사용합니다.',
      hint: '조건부 합계 + HAVING',
      explanation: 'SUM(CASE WHEN ...)으로 이벤트 종류별 횟수를 한 행으로 피벗한 뒤, HAVING으로 가입 제출이 있는 세션만 남깁니다. WHERE는 집계 전 필터, HAVING은 집계 후 필터라는 점이 핵심입니다.',
      relatedTables: ['sessions', 'events'],
      sql: `SELECT
  s.id AS session_id,
  SUM(CASE WHEN e.event_name = 'page_view' THEN 1 ELSE 0 END) AS page_views,
  SUM(CASE WHEN e.event_name = 'signup_submit' THEN 1 ELSE 0 END) AS signup_submits
FROM sessions s
LEFT JOIN events e ON e.session_id = s.id
GROUP BY s.id
HAVING signup_submits > 0
ORDER BY s.id;`,
    },
    {
      title: '캠페인 없는 자연 유입',
      description: '캠페인 없이 자연 유입된 세션을 대상으로 세션 아이디(id)와 그 세션의 이벤트 수(event_count)를 많은 순서대로 보여주세요. 자연유입 트래픽의 활동량을 평가할 때 사용합니다.',
      hint: 'NULL 필터 + LEFT JOIN 집계',
      explanation: 'WHERE campaign_id IS NULL로 자연 유입 세션만 남기고, events를 LEFT JOIN해 이벤트가 0건인 세션도 결과에 유지합니다.',
      relatedTables: ['sessions', 'events'],
      sql: `SELECT s.id, COUNT(e.id) AS event_count
FROM sessions s
LEFT JOIN events e ON e.session_id = s.id
WHERE s.campaign_id IS NULL
GROUP BY s.id
ORDER BY event_count DESC;`,
    },
    {
      title: '마케팅 동의 사용자 이벤트',
      description: '마케팅 수신에 동의한 사용자들만 골라 이메일(email)과 그 사용자가 만든 이벤트 수(event_count)를 많은 순서대로 보여주세요. 마케팅 타겟군의 참여도를 평가할 때 사용합니다.',
      hint: '필터 + 3-way JOIN 집계',
      explanation: 'users → sessions → events를 JOIN한 뒤 WHERE로 marketing_opt_in = 1인 사용자만 남기고 사용자별로 이벤트를 COUNT합니다.',
      relatedTables: ['users', 'sessions', 'events'],
      sql: `SELECT u.email, COUNT(e.id) AS event_count
FROM users u
JOIN sessions s ON s.user_id = u.id
JOIN events e ON e.session_id = s.id
WHERE u.marketing_opt_in = 1
GROUP BY u.id, u.email
ORDER BY event_count DESC;`,
    },
    {
      title: '일자별 구매 금액',
      description: '구매(purchase) 이벤트를 대상으로 일자(event_date)별 구매 금액 합계(purchase_amount)를 날짜 순서대로 보여주세요. 일별 매출 추세를 볼 때 사용합니다.',
      hint: '날짜 집계 + 필터',
      explanation: 'WHERE로 purchase 이벤트만 남긴 뒤 date()로 일 단위로 자르고 event_value를 SUM합니다. 일별 매출 시계열을 만드는 표준형입니다.',
      relatedTables: ['events'],
      sql: `SELECT date(occurred_at) AS event_date, SUM(event_value) AS purchase_amount
FROM events
WHERE event_name = 'purchase'
GROUP BY date(occurred_at)
ORDER BY event_date;`,
    },
    {
      title: '분석 종합 리포트',
      description: '캠페인별(없으면 organic으로 묶음) 세션 수(session_count), 전체 이벤트 수(event_count), 구매 금액 합계(purchase_amount)를 세션 수가 많은 순서대로 보여주세요. 유입 경로별 종합 성과 보드로 사용합니다.',
      hint: 'COALESCE 그룹화 + 조건부 합계',
      explanation: 'sessions를 기준으로 campaigns를 LEFT JOIN한 뒤 COALESCE(c.name, "organic")으로 캠페인이 없는 세션을 organic 버킷으로 묶습니다. 구매 금액은 CASE WHEN으로 조건부 SUM해 한 쿼리에서 다지표를 산출합니다.',
      relatedTables: ['campaigns', 'sessions', 'events'],
      sql: `SELECT
  COALESCE(c.name, 'organic') AS campaign_name,
  COUNT(DISTINCT s.id) AS session_count,
  COUNT(e.id) AS event_count,
  SUM(CASE WHEN e.event_name = 'purchase' THEN COALESCE(e.event_value, 0) ELSE 0 END) AS purchase_amount
FROM sessions s
LEFT JOIN campaigns c ON c.id = s.campaign_id
LEFT JOIN events e ON e.session_id = s.id
GROUP BY COALESCE(c.name, 'organic')
ORDER BY session_count DESC;`,
    },
  ],
})
