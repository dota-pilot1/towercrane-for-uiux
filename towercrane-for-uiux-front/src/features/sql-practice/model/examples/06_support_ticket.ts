import { defineExampleSet } from './shared'

export const supportTicketExamples = defineExampleSet('06_support_ticket.sql', {
  beginner: [
    {
      title: '고객 플랜별 수',
      relatedTables: ['customers'],
      description: '고객(customers) 데이터를 요금제(plan) 기준으로 묶어 각 플랜에 속한 고객 수를 집계하세요. 결과는 고객 수가 많은 플랜이 위로 오도록 정렬합니다.',
      hint: '범주별 카운트 집계.',
      explanation: 'GROUP BY plan으로 플랜 그룹을 만들고 COUNT(*)로 그룹 크기를 셉니다. ORDER BY로 집계 결과를 정렬하여 분포를 한눈에 확인합니다.',
      sql: `SELECT plan, COUNT(*) AS customer_count
FROM customers
GROUP BY plan
ORDER BY customer_count DESC;`,
    },
    {
      title: '활성 상담원 목록',
      relatedTables: ['agents'],
      description: '현재 활성 상태인 상담원(agents)만 골라 아이디(id), 이름(name), 소속 팀(team)을 보여주세요. 팀 이름, 같은 팀 내에서는 이름 순서로 정렬합니다.',
      hint: '플래그 컬럼 필터.',
      explanation: 'WHERE 절로 is_active 플래그가 켜진 행만 남기고, ORDER BY에 두 개 컬럼을 지정하여 1차·2차 정렬 기준을 분리합니다.',
      sql: `SELECT id, name, team
FROM agents
WHERE is_active = 1
ORDER BY team, name;`,
    },
    {
      title: '티켓 상태별 수',
      relatedTables: ['tickets'],
      description: '티켓(tickets)을 상태(status) 값에 따라 분류해 각 상태에 몇 건이 있는지 집계하세요. 건수가 많은 상태가 위로 오도록 정렬합니다.',
      hint: '상태별 카운트.',
      explanation: 'GROUP BY status로 상태 그룹을 만든 뒤 COUNT(*)로 그룹별 행 수를 셉니다. 처리 현황 대시보드의 기본 패턴입니다.',
      sql: `SELECT status, COUNT(*) AS ticket_count
FROM tickets
GROUP BY status
ORDER BY ticket_count DESC;`,
    },
    {
      title: '높은 우선순위 티켓',
      relatedTables: ['tickets'],
      description: '우선순위(priority)가 HIGH인 티켓만 골라 아이디(id), 제목(subject), 상태(status), 생성일시(created_at)를 보여주세요. 오래된 티켓이 위로 오도록 생성일시 순으로 정렬합니다.',
      hint: '동등 비교 필터.',
      explanation: 'WHERE priority = \'HIGH\'로 특정 값만 통과시킵니다. 문자열 리터럴은 작은따옴표로 감싸야 하며 대소문자가 구분됩니다.',
      sql: `SELECT id, subject, status, created_at
FROM tickets
WHERE priority = 'HIGH'
ORDER BY created_at;`,
    },
    {
      title: '미해결 티켓',
      relatedTables: ['tickets'],
      description: '아직 해결되지 않은 티켓을 골라 아이디(id), 제목(subject), 우선순위(priority), 상태(status)를 보여주세요. 해결일시(resolved_at)가 비어 있는 행이 대상이며, 생성일시 순으로 정렬합니다.',
      hint: 'NULL 필터.',
      explanation: 'NULL 값은 = 연산자로 비교할 수 없으므로 IS NULL을 사용합니다. 종료 시각이 아직 기록되지 않은 진행 중 데이터를 찾는 전형적인 패턴입니다.',
      sql: `SELECT id, subject, priority, status
FROM tickets
WHERE resolved_at IS NULL
ORDER BY created_at;`,
    },
    {
      title: '메시지 발신자별 수',
      relatedTables: ['ticket_messages'],
      description: '티켓 메시지(ticket_messages)를 발신자 유형(sender_type) 기준으로 묶어 고객과 상담원 각각이 작성한 메시지 수를 세어 보세요. 많은 쪽이 위로 오도록 정렬합니다.',
      hint: '발신자별 카운트.',
      explanation: 'GROUP BY로 발신자 유형 그룹을 만들고 COUNT(*)로 메시지 수를 집계합니다. 두 주체 간 활동량을 비교할 때 사용합니다.',
      sql: `SELECT sender_type, COUNT(*) AS message_count
FROM ticket_messages
GROUP BY sender_type
ORDER BY message_count DESC;`,
    },
    {
      title: '태그별 티켓 수',
      relatedTables: ['ticket_tags'],
      description: '티켓 태그(ticket_tags)를 태그 이름(tag)으로 묶어 각 태그가 몇 번 사용됐는지 집계하세요. 자주 쓰인 태그가 위로 오도록 정렬합니다.',
      hint: '태그 빈도 집계.',
      explanation: 'GROUP BY tag와 COUNT(*)로 라벨별 빈도를 구합니다. 어떤 카테고리에 문의가 몰리는지 파악하는 기본 분석입니다.',
      sql: `SELECT tag, COUNT(*) AS tag_count
FROM ticket_tags
GROUP BY tag
ORDER BY tag_count DESC;`,
    },
    {
      title: '상태 변경 로그',
      relatedTables: ['ticket_status_logs'],
      description: '티켓 상태 변경 이력(ticket_status_logs)을 시간순으로 펼쳐 티켓 아이디(ticket_id), 이전 상태(from_status), 새 상태(to_status), 변경 시각(changed_at)을 보여주세요.',
      hint: '시간순 정렬.',
      explanation: 'ORDER BY changed_at으로 이벤트 로그를 시간 순으로 나열합니다. 이력 테이블 조회의 가장 기본 형태입니다.',
      sql: `SELECT ticket_id, from_status, to_status, changed_at
FROM ticket_status_logs
ORDER BY changed_at;`,
    },
    {
      title: '담당자 없는 티켓',
      relatedTables: ['tickets'],
      description: '아직 상담원이 배정되지 않은 티켓을 골라 아이디(id), 제목(subject), 우선순위(priority), 상태(status)를 보여주세요. 생성일시 순으로 정렬합니다.',
      hint: '미할당 NULL 필터.',
      explanation: 'agent_id IS NULL은 외래 키가 비어 있다는 뜻이며 곧 미할당을 의미합니다. 큐에 쌓인 대기 작업을 찾을 때 활용합니다.',
      sql: `SELECT id, subject, priority, status
FROM tickets
WHERE agent_id IS NULL
ORDER BY created_at;`,
    },
    {
      title: '팀별 상담원 수',
      relatedTables: ['agents'],
      description: '상담원(agents)을 소속 팀(team) 기준으로 묶어 팀별 인원수를 집계하세요. 인원이 많은 팀이 위로 오도록 정렬합니다.',
      hint: '팀 단위 카운트.',
      explanation: 'GROUP BY team과 COUNT(*)로 조직별 규모를 구합니다. 인력 분포를 빠르게 점검할 때 쓰는 기본 패턴입니다.',
      sql: `SELECT team, COUNT(*) AS agent_count
FROM agents
GROUP BY team
ORDER BY agent_count DESC;`,
    },
  ],
  intermediate: [
    {
      title: '티켓과 고객 정보',
      relatedTables: ['tickets', 'customers'],
      description: '티켓과 그 티켓을 등록한 고객 정보를 함께 보여주세요. 티켓 아이디(id), 고객 이름(name), 요금제(plan), 제목(subject), 상태(status)를 포함하고 생성일시 순으로 정렬합니다.',
      hint: '두 테이블 INNER JOIN.',
      explanation: 'tickets와 customers를 customer_id로 INNER JOIN하여 외래 키로 연결된 행을 한 줄에 합칩니다. 별칭(t, c)을 쓰면 컬럼 출처가 명확해집니다.',
      sql: `SELECT t.id, c.name AS customer_name, c.plan, t.subject, t.status
FROM tickets t
JOIN customers c ON c.id = t.customer_id
ORDER BY t.created_at;`,
    },
    {
      title: '티켓과 상담원',
      relatedTables: ['tickets', 'agents'],
      description: '모든 티켓을 보여주되 배정된 상담원이 있다면 이름(name)과 팀(team)을 함께 표시하세요. 담당자가 없는 티켓도 결과에 포함해야 합니다.',
      hint: 'LEFT JOIN으로 미할당 보존.',
      explanation: 'LEFT JOIN을 사용하면 왼쪽 테이블(tickets)의 모든 행이 보존되고 매칭되는 상담원이 없으면 NULL이 채워집니다. 누락을 드러내는 핵심 도구입니다.',
      sql: `SELECT t.id, t.subject, a.name AS agent_name, a.team
FROM tickets t
LEFT JOIN agents a ON a.id = t.agent_id
ORDER BY t.id;`,
    },
    {
      title: '상담원별 담당 티켓 수',
      relatedTables: ['agents', 'tickets'],
      description: '모든 상담원의 이름과 그가 담당한 티켓 수를 보여주세요. 아직 한 건도 맡지 않은 상담원도 0으로 표시해야 하며, 담당이 많은 순으로 정렬합니다.',
      hint: 'LEFT JOIN 후 그룹 집계.',
      explanation: 'agents를 기준으로 LEFT JOIN하면 티켓이 없는 상담원도 결과에 남고, COUNT(t.id)는 NULL을 세지 않으므로 자연스럽게 0이 나옵니다.',
      sql: `SELECT a.name, COUNT(t.id) AS assigned_count
FROM agents a
LEFT JOIN tickets t ON t.agent_id = a.id
GROUP BY a.id, a.name
ORDER BY assigned_count DESC;`,
    },
    {
      title: '고객별 티켓 수',
      relatedTables: ['customers', 'tickets'],
      description: '모든 고객의 이름과 그 고객이 등록한 티켓 수를 보여주세요. 한 번도 문의하지 않은 고객도 0으로 표시해야 하며, 문의가 많은 고객이 위로 오도록 정렬합니다.',
      hint: '고객 기준 LEFT JOIN 집계.',
      explanation: 'customers를 왼쪽에 두고 LEFT JOIN하면 티켓이 없는 고객도 보존됩니다. COUNT는 매칭되지 않은 NULL을 무시해 0건 고객을 자동 처리합니다.',
      sql: `SELECT c.name, COUNT(t.id) AS ticket_count
FROM customers c
LEFT JOIN tickets t ON t.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY ticket_count DESC;`,
    },
    {
      title: '티켓별 메시지 수',
      relatedTables: ['tickets', 'ticket_messages'],
      description: '각 티켓의 제목(subject)과 그 티켓에 달린 메시지 수를 함께 보여주세요. 아직 메시지가 없는 티켓도 0건으로 포함하고, 메시지가 많은 순으로 정렬합니다.',
      hint: '티켓 기준 메시지 LEFT JOIN.',
      explanation: 'tickets를 기준으로 ticket_messages를 LEFT JOIN하고 티켓 단위로 GROUP BY합니다. 대화량이 많은 이슈를 식별하는 데 유용합니다.',
      sql: `SELECT t.subject, COUNT(m.id) AS message_count
FROM tickets t
LEFT JOIN ticket_messages m ON m.ticket_id = t.id
GROUP BY t.id, t.subject
ORDER BY message_count DESC;`,
    },
    {
      title: '티켓별 태그 목록',
      relatedTables: ['tickets', 'ticket_tags'],
      description: '각 티켓의 제목(subject)과 그 티켓에 붙은 태그(tag)들을 한 줄의 문자열로 합쳐 보여주세요. 티켓 아이디 순으로 정렬합니다.',
      hint: '문자열 집계 함수.',
      explanation: 'GROUP_CONCAT은 그룹 내 여러 행의 값을 구분자로 이어 붙여 하나의 문자열로 만들어 줍니다. 1:N 관계를 한 줄로 압축할 때 사용합니다.',
      sql: `SELECT t.subject, GROUP_CONCAT(tt.tag, ', ') AS tags
FROM tickets t
LEFT JOIN ticket_tags tt ON tt.ticket_id = t.id
GROUP BY t.id, t.subject
ORDER BY t.id;`,
    },
    {
      title: '최근 상태 변경 시각',
      relatedTables: ['tickets', 'ticket_status_logs'],
      description: '각 티켓의 제목(subject)과 그 티켓이 가장 마지막으로 상태 변경된 시각(changed_at)을 보여주세요. 최근에 변경된 티켓이 위로 오도록 정렬합니다.',
      hint: '그룹별 최댓값.',
      explanation: 'MAX(changed_at)은 그룹 내 가장 큰 시각, 즉 가장 최근 이벤트를 골라냅니다. 이력 테이블에서 마지막 상태 시각을 뽑는 정석 패턴입니다.',
      sql: `SELECT t.id, t.subject, MAX(l.changed_at) AS last_changed_at
FROM tickets t
JOIN ticket_status_logs l ON l.ticket_id = t.id
GROUP BY t.id, t.subject
ORDER BY last_changed_at DESC;`,
    },
    {
      title: 'TECH팀 담당 티켓',
      relatedTables: ['agents', 'tickets'],
      description: 'TECH 팀 소속 상담원이 담당하는 티켓만 골라 상담원 이름(name), 제목(subject), 우선순위(priority), 상태(status)를 보여주세요. 생성일시 순으로 정렬합니다.',
      hint: '조인 후 부서 필터.',
      explanation: 'agents와 tickets를 조인한 뒤 WHERE에서 team 컬럼으로 부서를 한정합니다. 조인 결과 위에 필터가 적용되는 순서를 익히는 예제입니다.',
      sql: `SELECT a.name, t.subject, t.priority, t.status
FROM tickets t
JOIN agents a ON a.id = t.agent_id
WHERE a.team = 'TECH'
ORDER BY t.created_at;`,
    },
    {
      title: '플랜별 미해결 티켓',
      relatedTables: ['customers', 'tickets'],
      description: '아직 해결되지 않은 티켓을 고객의 요금제(plan) 기준으로 묶어 플랜별 미해결 건수를 집계하세요. 미해결이 많은 플랜이 위로 오도록 정렬합니다.',
      hint: '조인 + NULL 필터 + 집계.',
      explanation: 'tickets와 customers를 조인한 뒤 resolved_at IS NULL로 미해결만 남기고, GROUP BY plan으로 요금제별 분포를 구합니다. 어떤 요금제 고객을 지원에 우선 투입할지 판단할 수 있습니다.',
      sql: `SELECT c.plan, COUNT(t.id) AS open_ticket_count
FROM customers c
JOIN tickets t ON t.customer_id = c.id
WHERE t.resolved_at IS NULL
GROUP BY c.plan
ORDER BY open_ticket_count DESC;`,
    },
    {
      title: '티켓 메시지 상세',
      relatedTables: ['tickets', 'ticket_messages'],
      description: '모든 메시지를 티켓 제목(subject)과 함께 시간 순으로 펼쳐 보여주세요. 발신자 유형(sender_type), 본문(body), 작성 시각(created_at)을 포함합니다.',
      hint: '메시지 기준 조인.',
      explanation: 'ticket_messages를 기준으로 tickets와 INNER JOIN하면 메시지마다 어느 티켓의 무엇인지가 같은 행에 표시됩니다. 대화 타임라인을 만드는 토대입니다.',
      sql: `SELECT t.subject, m.sender_type, m.body, m.created_at
FROM ticket_messages m
JOIN tickets t ON t.id = m.ticket_id
ORDER BY m.created_at;`,
    },
  ],
  advanced: [
    {
      title: '티켓 해결 시간 계산',
      relatedTables: ['tickets', 'customers'],
      description: '해결이 완료된 티켓만 골라 고객 이름(name), 제목(subject), 그리고 생성에서 해결까지 걸린 시간을 시간 단위로 계산해 보여주세요. 오래 걸린 티켓이 위로 오도록 정렬합니다.',
      hint: '날짜 차이 → 시간 환산.',
      explanation: 'julianday로 날짜를 일(day) 단위 실수로 바꾼 뒤 두 값을 빼면 일수 차이가 나오고, 24를 곱해 시간으로 환산합니다. ROUND로 소수점 자릿수를 맞춥니다.',
      sql: `SELECT
  t.id,
  c.name AS customer_name,
  t.subject,
  ROUND((julianday(t.resolved_at) - julianday(t.created_at)) * 24, 2) AS resolution_hours
FROM tickets t
JOIN customers c ON c.id = t.customer_id
WHERE t.resolved_at IS NOT NULL
ORDER BY resolution_hours DESC;`,
    },
    {
      title: '상담원별 해결 티켓 수',
      relatedTables: ['agents', 'tickets'],
      description: '모든 상담원의 이름과 그가 해결 완료(RESOLVED) 상태로 마무리한 티켓 수를 보여주세요. 한 건도 해결하지 못한 상담원도 0으로 포함하고, 많은 순으로 정렬합니다.',
      hint: '조인 조건에 상태 필터.',
      explanation: 'WHERE에 상태를 두면 매칭 안 된 상담원이 결과에서 사라지지만, ON 절에 조건을 두면 LEFT JOIN의 보존 효과가 유지되어 0건 상담원도 살아남습니다.',
      sql: `SELECT a.name, COUNT(t.id) AS resolved_count
FROM agents a
LEFT JOIN tickets t ON t.agent_id = a.id AND t.status = 'RESOLVED'
GROUP BY a.id, a.name
ORDER BY resolved_count DESC;`,
    },
    {
      title: '고객 플랜별 평균 메시지 수',
      relatedTables: ['customers', 'tickets', 'ticket_messages'],
      description: '각 티켓이 받은 메시지 수를 먼저 구한 다음, 고객의 요금제(plan)별로 티켓당 평균 메시지 수를 계산하세요. 평균이 큰 플랜이 위로 오도록 정렬합니다.',
      hint: 'CTE로 2단계 집계.',
      explanation: 'WITH 절(CTE)로 티켓별 메시지 수를 먼저 계산해 임시 결과를 만든 뒤, 그 결과를 다시 plan으로 그룹지어 평균을 냅니다. 단계 집계는 가독성을 크게 높입니다.',
      sql: `WITH ticket_message_counts AS (
  SELECT t.id, c.plan, COUNT(m.id) AS message_count
  FROM tickets t
  JOIN customers c ON c.id = t.customer_id
  LEFT JOIN ticket_messages m ON m.ticket_id = t.id
  GROUP BY t.id, c.plan
)
SELECT plan, ROUND(AVG(message_count), 2) AS avg_messages
FROM ticket_message_counts
GROUP BY plan
ORDER BY avg_messages DESC;`,
    },
    {
      title: '상태 변경 없는 열린 티켓',
      relatedTables: ['tickets', 'ticket_status_logs'],
      description: '상태가 OPEN이지만 상태 변경 이력이 한 건도 없는 티켓을 찾아 아이디(id), 제목(subject), 상태(status)를 보여주세요. 신규로 등록된 후 손도 대지 않은 티켓이 대상입니다.',
      hint: 'LEFT JOIN + NULL = 안티 조인.',
      explanation: 'LEFT JOIN 후 오른쪽 테이블이 NULL인 행만 남기면 매칭이 없는 데이터, 곧 이력 미발생 티켓을 찾을 수 있습니다. 이를 안티 조인 패턴이라 합니다.',
      sql: `SELECT t.id, t.subject, t.status
FROM tickets t
LEFT JOIN ticket_status_logs l ON l.ticket_id = t.id
WHERE l.id IS NULL
  AND t.status = 'OPEN'
ORDER BY t.id;`,
    },
    {
      title: '태그별 미해결 티켓',
      relatedTables: ['tickets', 'ticket_tags'],
      description: '아직 해결되지 않은 티켓을 태그(tag)별로 묶어 각 태그의 미해결 건수를 보여주세요. 미해결이 많은 태그가 위로 오도록 정렬합니다.',
      hint: '조인 후 카테고리 집계.',
      explanation: 'ticket_tags와 tickets를 조인한 뒤 resolved_at IS NULL로 진행 중 티켓만 남기고, 태그 단위로 그룹지어 카운트합니다. 미해결이 몰린 카테고리를 빠르게 잡아낼 수 있습니다.',
      sql: `SELECT tt.tag, COUNT(t.id) AS open_count
FROM ticket_tags tt
JOIN tickets t ON t.id = tt.ticket_id
WHERE t.resolved_at IS NULL
GROUP BY tt.tag
ORDER BY open_count DESC;`,
    },
    {
      title: '티켓 상태 전환 요약',
      relatedTables: ['ticket_status_logs'],
      description: '티켓 상태가 어떤 상태에서 어떤 상태로 얼마나 자주 바뀌었는지 요약하세요. 최초 생성 시점(이전 상태 없음)은 START로 표시하고, 전환 빈도가 높은 순으로 정렬합니다.',
      hint: 'NULL 대체 후 쌍 집계.',
      explanation: 'COALESCE는 첫 번째 NULL이 아닌 값을 반환하여 NULL을 가독성 있는 표시로 바꿔 줍니다. (from, to) 쌍으로 그룹지으면 상태 전환 패턴이 보입니다.',
      sql: `SELECT
  COALESCE(from_status, 'START') AS from_status,
  to_status,
  COUNT(*) AS transition_count
FROM ticket_status_logs
GROUP BY COALESCE(from_status, 'START'), to_status
ORDER BY transition_count DESC;`,
    },
    {
      title: '우선순위별 평균 해결 시간',
      relatedTables: ['tickets'],
      description: '해결이 완료된 티켓을 우선순위(priority)별로 묶어 평균 해결 소요 시간을 시간 단위로 계산하세요. 평균이 긴 우선순위가 위로 오도록 정렬합니다.',
      hint: '날짜 차이 평균.',
      explanation: 'julianday 차이에 24를 곱해 시간으로 환산한 뒤 AVG로 평균을 구합니다. SLA가 잘 지켜지고 있는지 우선순위별로 가늠하는 핵심 지표입니다.',
      sql: `SELECT
  priority,
  ROUND(AVG((julianday(resolved_at) - julianday(created_at)) * 24), 2) AS avg_resolution_hours
FROM tickets
WHERE resolved_at IS NOT NULL
GROUP BY priority
ORDER BY avg_resolution_hours DESC;`,
    },
    {
      title: '상담원 업무 큐 리포트',
      relatedTables: ['agents', 'tickets'],
      description: '각 상담원이 맡은 전체 티켓 수, 그 중 아직 해결되지 않은 수, 해결 완료된 수를 한 줄에 모아 보여주세요. 진행 중인 일이 많은 상담원이 위로 오도록 정렬합니다.',
      hint: '조건부 SUM(CASE).',
      explanation: 'SUM(CASE WHEN 조건 THEN 1 ELSE 0 END) 패턴은 같은 그룹 안에서 조건별 카운트를 동시에 계산할 수 있는 강력한 피벗 기법입니다.',
      sql: `SELECT
  a.name,
  COUNT(t.id) AS assigned_count,
  SUM(CASE WHEN t.resolved_at IS NULL THEN 1 ELSE 0 END) AS open_count,
  SUM(CASE WHEN t.status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_count
FROM agents a
LEFT JOIN tickets t ON t.agent_id = a.id
GROUP BY a.id, a.name
ORDER BY open_count DESC;`,
    },
    {
      title: '최신 메시지 발신자',
      relatedTables: ['tickets', 'ticket_messages'],
      description: '각 티켓마다 가장 최근에 작성된 메시지 한 건만 골라, 티켓 제목(subject)과 함께 발신자 유형(sender_type), 본문(body), 작성 시각(created_at)을 보여주세요. 최신 메시지가 위로 오도록 정렬합니다.',
      hint: '윈도우 함수 ROW_NUMBER.',
      explanation: 'ROW_NUMBER() OVER (PARTITION BY ticket_id ORDER BY created_at DESC)는 티켓 단위로 행에 순번을 매기며, 1번 행만 남기면 그룹별 최신 1건을 얻을 수 있습니다.',
      sql: `WITH ranked_messages AS (
  SELECT
    m.*,
    ROW_NUMBER() OVER (PARTITION BY m.ticket_id ORDER BY m.created_at DESC) AS rank_no
  FROM ticket_messages m
)
SELECT t.subject, r.sender_type, r.body, r.created_at
FROM ranked_messages r
JOIN tickets t ON t.id = r.ticket_id
WHERE r.rank_no = 1
ORDER BY r.created_at DESC;`,
    },
    {
      title: '고객지원 종합 현황',
      relatedTables: ['customers', 'tickets', 'ticket_messages', 'ticket_tags'],
      description: '각 고객마다 등록한 티켓 수, 그 티켓들에 달린 메시지 수, 붙은 태그 수를 한 줄에 모아 보여주세요. 티켓이 많은 고객이 위로 오도록 정렬합니다.',
      hint: '다중 LEFT JOIN + DISTINCT 카운트.',
      explanation: '여러 1:N 테이블을 한꺼번에 LEFT JOIN하면 행이 카티시안 곱으로 부풀어 중복 집계가 발생하므로, COUNT(DISTINCT ...)로 각 엔티티를 한 번씩만 세야 합니다.',
      sql: `SELECT
  c.name AS customer_name,
  COUNT(DISTINCT t.id) AS ticket_count,
  COUNT(DISTINCT m.id) AS message_count,
  COUNT(DISTINCT tt.id) AS tag_count
FROM customers c
LEFT JOIN tickets t ON t.customer_id = c.id
LEFT JOIN ticket_messages m ON m.ticket_id = t.id
LEFT JOIN ticket_tags tt ON tt.ticket_id = t.id
GROUP BY c.id, c.name
ORDER BY ticket_count DESC;`,
    },
  ],
})
