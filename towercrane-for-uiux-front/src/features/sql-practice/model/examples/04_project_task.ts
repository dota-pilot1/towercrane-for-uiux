import { defineExampleSet } from './shared'

export const projectTaskExamples = defineExampleSet('04_project_task.sql', {
  beginner: [
    {
      title: '고객사 목록',
      description: '등록된 모든 고객사의 정보를 확인해야 합니다. 아이디(id), 회사명(name), 산업군(industry), 담당자명(contact_name)을 아이디 오름차순으로 보여주세요.',
      hint: '단일 테이블 조회와 기본 정렬 패턴입니다.',
      explanation: 'clients 테이블에서 필요한 컬럼만 SELECT 하고 ORDER BY id로 정렬합니다. 가장 기본적인 단일 테이블 조회 패턴입니다.',
      relatedTables: ['clients'],
      sql: `SELECT id, name, industry, contact_name
FROM clients
ORDER BY id;`,
    },
    {
      title: '진행 중 프로젝트',
      description: '현재 진행 중인(ACTIVE 상태) 프로젝트만 골라 시작일이 빠른 순서로 보여주세요. 프로젝트명(name), 상태(status), 시작일(started_at) 컬럼이 필요합니다.',
      hint: '특정 상태값으로 행을 거르고 날짜로 정렬하는 패턴입니다.',
      explanation: 'WHERE 절로 status = \'ACTIVE\'인 행만 추리고, ORDER BY started_at으로 오래된 프로젝트부터 위에 표시합니다.',
      relatedTables: ['projects'],
      sql: `SELECT name, status, started_at
FROM projects
WHERE status = 'ACTIVE'
ORDER BY started_at;`,
    },
    {
      title: '멤버 역할별 인원',
      description: '멤버를 역할(PM, DEV, DESIGNER 등)별로 묶어 인원 수를 집계해야 합니다. 역할(role)과 인원 수(member_count)를 인원이 많은 순서로 보여주세요.',
      hint: '특정 컬럼 기준 그룹 집계 패턴입니다.',
      explanation: 'GROUP BY role로 역할별 묶음을 만들고 COUNT(*)로 인원을 세어 ORDER BY로 내림차순 정렬합니다.',
      relatedTables: ['members'],
      sql: `SELECT role, COUNT(*) AS member_count
FROM members
GROUP BY role
ORDER BY member_count DESC;`,
    },
    {
      title: '마감 임박 업무',
      description: '아직 완료되지 않았으면서 마감일이 정해진 업무 중 마감이 가장 가까운 3건을 알아야 합니다. 제목(title), 상태(status), 우선순위(priority), 마감일(due_date)을 마감일 빠른 순으로 보여주세요.',
      hint: 'NULL 제외 조건 + 상태 필터 + 상위 N건 추출 패턴입니다.',
      explanation: 'due_date IS NOT NULL과 status != \'DONE\'을 AND로 결합해 거르고, ORDER BY due_date ASC + LIMIT 3으로 가장 임박한 3건만 가져옵니다.',
      relatedTables: ['tasks'],
      sql: `SELECT title, status, priority, due_date
FROM tasks
WHERE due_date IS NOT NULL
  AND status != 'DONE'
ORDER BY due_date ASC
LIMIT 3;`,
    },
    {
      title: '완료되지 않은 업무',
      description: '완료(DONE)되지 않은 모든 업무를 마감일이 빠른 순서로 정리해야 합니다. 제목(title), 상태(status), 마감일(due_date)을 보여주세요.',
      hint: '단일 조건 필터링과 날짜 정렬 패턴입니다.',
      explanation: 'WHERE status != \'DONE\'으로 미완료 업무만 필터링하고 ORDER BY due_date로 마감 임박 순으로 정렬합니다.',
      relatedTables: ['tasks'],
      sql: `SELECT title, status, due_date
FROM tasks
WHERE status != 'DONE'
ORDER BY due_date;`,
    },
    {
      title: '우선순위별 업무 수',
      description: '업무를 우선순위(HIGH, MEDIUM, LOW)별로 묶어 몇 건씩 있는지 집계하세요. 우선순위(priority)와 건수(task_count)를 많은 순서로 보여주세요.',
      hint: '카테고리별 빈도수 집계 패턴입니다.',
      explanation: 'GROUP BY priority로 우선순위별로 묶고 COUNT(*)로 업무 수를 세어 많은 순으로 정렬합니다.',
      relatedTables: ['tasks'],
      sql: `SELECT priority, COUNT(*) AS task_count
FROM tasks
GROUP BY priority
ORDER BY task_count DESC;`,
    },
    {
      title: '업무 상태별 수',
      description: '업무가 어떤 상태(TODO, IN_PROGRESS, DONE)에 몇 건씩 분포해 있는지 확인하세요. 상태(status)와 건수(task_count)를 많은 순서로 보여주세요.',
      hint: '상태값별 분포 집계 패턴입니다.',
      explanation: 'GROUP BY status로 상태별로 그룹화하고 COUNT(*)로 건수를 집계해 ORDER BY DESC로 내림차순 정렬합니다.',
      relatedTables: ['tasks'],
      sql: `SELECT status, COUNT(*) AS task_count
FROM tasks
GROUP BY status
ORDER BY task_count DESC;`,
    },
    {
      title: '프로젝트별 예상 시간',
      description: '각 프로젝트에 등록된 업무들의 예상 작업 시간을 모두 더해 보고, 합이 큰 프로젝트부터 확인하세요. 프로젝트 아이디(project_id)와 총 예상 시간(total_estimate)을 보여주세요.',
      hint: '그룹별 합계 집계 패턴입니다.',
      explanation: 'GROUP BY project_id로 프로젝트별로 묶고 SUM(estimate_hours)로 예상 시간을 합산해 큰 순서로 정렬합니다.',
      relatedTables: ['tasks'],
      sql: `SELECT project_id, SUM(estimate_hours) AS total_estimate
FROM tasks
GROUP BY project_id
ORDER BY total_estimate DESC;`,
    },
    {
      title: '최근 업무 댓글',
      description: '업무에 달린 댓글을 최신 작성순으로 확인해야 합니다. 업무 아이디(task_id), 작성자(member_id), 내용(content), 작성일시(created_at)를 보여주세요.',
      hint: '날짜 컬럼 기준 최신순 정렬 패턴입니다.',
      explanation: 'ORDER BY created_at DESC로 가장 최근에 작성된 댓글이 맨 위에 오도록 정렬합니다.',
      relatedTables: ['task_comments'],
      sql: `SELECT task_id, member_id, content, created_at
FROM task_comments
ORDER BY created_at DESC;`,
    },
    {
      title: '상태 변경 로그',
      description: '업무의 상태가 어떻게 변해왔는지 시간 순서대로 추적해야 합니다. 업무 아이디(task_id), 이전 상태(from_status), 변경 후 상태(to_status), 변경 일시(changed_at)를 오래된 것부터 보여주세요.',
      hint: '이력 테이블을 시간 오름차순으로 나열하는 패턴입니다.',
      explanation: 'ORDER BY changed_at으로 변경 시각이 오래된 것부터 차례로 나열해 상태 전이 흐름을 추적합니다.',
      relatedTables: ['task_logs'],
      sql: `SELECT task_id, from_status, to_status, changed_at
FROM task_logs
ORDER BY changed_at;`,
    },
  ],
  intermediate: [
    {
      title: '프로젝트와 고객사',
      description: '각 프로젝트가 어느 고객사 것인지 함께 보여줘야 합니다. 프로젝트명(project_name), 고객사명(client_name), 상태(status)를 시작일 빠른 순으로 정리하세요.',
      hint: '두 테이블을 외래키로 연결하는 기본 조인 패턴입니다.',
      explanation: 'projects와 clients를 client_id 외래키로 JOIN하여 한 행에 프로젝트와 소속 고객사 정보를 함께 표시합니다.',
      relatedTables: ['projects', 'clients'],
      sql: `SELECT p.name AS project_name, c.name AS client_name, p.status
FROM projects p
JOIN clients c ON c.id = p.client_id
ORDER BY p.started_at;`,
    },
    {
      title: '프로젝트별 업무 수',
      description: '프로젝트마다 몇 개의 업무가 등록되어 있는지 확인하세요. 업무가 하나도 없는 프로젝트도 0으로 함께 표시되어야 합니다. 프로젝트명(name)과 업무 수(task_count)를 많은 순으로 보여주세요.',
      hint: '한 쪽에 데이터가 없어도 보존하는 조인 + 그룹 집계 패턴입니다.',
      explanation: 'LEFT JOIN으로 업무가 없는 프로젝트도 결과에 남기고, GROUP BY와 COUNT(t.id)로 업무 수를 세면 NULL 행은 0으로 집계됩니다.',
      relatedTables: ['projects', 'tasks'],
      sql: `SELECT p.name, COUNT(t.id) AS task_count
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
GROUP BY p.id, p.name
ORDER BY task_count DESC;`,
    },
    {
      title: '멤버별 담당 업무 수',
      description: '각 멤버에게 배정된 업무가 몇 건인지 알아야 합니다. 담당 업무가 없는 멤버도 0으로 포함하세요. 멤버명(name)과 담당 업무 수(assigned_tasks)를 많은 순으로 보여주세요.',
      hint: '담당 데이터가 없는 행도 보존하는 조인 + 그룹 집계 패턴입니다.',
      explanation: 'members 기준 LEFT JOIN tasks로 미배정 멤버도 유지하고, COUNT(t.id)로 배정된 업무만 카운트해 0건 멤버는 자동으로 0으로 잡힙니다.',
      relatedTables: ['members', 'tasks'],
      sql: `SELECT m.name, COUNT(t.id) AS assigned_tasks
FROM members m
LEFT JOIN tasks t ON t.assignee_id = m.id
GROUP BY m.id, m.name
ORDER BY assigned_tasks DESC;`,
    },
    {
      title: '프로젝트 참여 멤버',
      description: '어떤 멤버가 어떤 프로젝트에 어떤 역할(duty)로 참여하는지 한눈에 보여줘야 합니다. 프로젝트명(project_name), 멤버명(member_name), 역할(duty)을 프로젝트명과 멤버명 순으로 정렬하세요.',
      hint: '중간 매핑 테이블을 거쳐 다대다 관계를 푸는 3중 조인 패턴입니다.',
      explanation: 'project_members 매핑 테이블을 중심으로 projects, members 양쪽을 JOIN하여 다대다 관계를 평탄화해서 보여줍니다.',
      relatedTables: ['projects', 'project_members', 'members'],
      sql: `SELECT p.name AS project_name, m.name AS member_name, pm.duty
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
JOIN members m ON m.id = pm.member_id
ORDER BY p.name, m.name;`,
    },
    {
      title: '업무 담당자와 프로젝트',
      description: '업무 목록을 보면서 어느 프로젝트의 업무인지, 담당자는 누구인지 함께 확인해야 합니다. 담당자가 없는 업무도 포함하세요. 프로젝트명(project_name), 업무 제목(title), 담당자(assignee), 상태(status)를 프로젝트명·마감일 순으로 보여주세요.',
      hint: '필수 관계는 일반 조인, 선택 관계는 외부 조인으로 섞어 쓰는 패턴입니다.',
      explanation: '프로젝트는 반드시 있어야 하므로 INNER JOIN, 담당자는 NULL일 수 있으므로 LEFT JOIN을 사용해 모든 업무를 빠짐없이 표시합니다.',
      relatedTables: ['tasks', 'projects', 'members'],
      sql: `SELECT p.name AS project_name, t.title, m.name AS assignee, t.status
FROM tasks t
JOIN projects p ON p.id = t.project_id
LEFT JOIN members m ON m.id = t.assignee_id
ORDER BY p.name, t.due_date;`,
    },
    {
      title: '댓글이 있는 업무',
      description: '소통이 활발한 업무를 찾기 위해, 댓글이 달린 업무만 골라 댓글 수가 많은 순으로 보여주세요. 업무 제목(title)과 댓글 수(comment_count)가 필요합니다.',
      hint: '자식 테이블 존재 여부 + 그룹 집계 + 내림차순 패턴입니다.',
      explanation: 'task_comments와 INNER JOIN하므로 댓글이 있는 업무만 남고, GROUP BY로 업무별 댓글을 묶어 COUNT로 세어 정렬합니다.',
      relatedTables: ['tasks', 'task_comments'],
      sql: `SELECT t.title, COUNT(c.id) AS comment_count
FROM tasks t
JOIN task_comments c ON c.task_id = t.id
GROUP BY t.id, t.title
ORDER BY comment_count DESC;`,
    },
    {
      title: '상태 변경된 업무',
      description: '업무 상태 변경 이력을 시간 순서로 추적하면서 어떤 업무의 변경인지도 함께 보여줘야 합니다. 업무 제목(title), 이전 상태(from_status), 변경 후 상태(to_status), 변경 일시(changed_at)를 시간 오름차순으로 정렬하세요.',
      hint: '이력 테이블을 본 테이블과 조인해 라벨을 채우는 패턴입니다.',
      explanation: 'task_logs와 tasks를 task_id로 JOIN하여 변경 로그에 업무 제목을 결합하고 ORDER BY changed_at으로 시간 흐름대로 정렬합니다.',
      relatedTables: ['tasks', 'task_logs'],
      sql: `SELECT t.title, l.from_status, l.to_status, l.changed_at
FROM task_logs l
JOIN tasks t ON t.id = l.task_id
ORDER BY l.changed_at;`,
    },
    {
      title: '고객사별 프로젝트 수',
      description: '각 고객사가 몇 개의 프로젝트를 가지고 있는지 확인하세요. 프로젝트가 없는 고객사도 0으로 포함되어야 합니다. 고객사명(name)과 프로젝트 수(project_count)를 많은 순으로 보여주세요.',
      hint: '부모 보존 조인 + 그룹 집계 패턴입니다.',
      explanation: 'clients 기준 LEFT JOIN projects로 프로젝트가 없는 고객사도 유지하고 COUNT(p.id)로 NULL을 제외해 0건이 자연스럽게 0으로 잡힙니다.',
      relatedTables: ['clients', 'projects'],
      sql: `SELECT c.name, COUNT(p.id) AS project_count
FROM clients c
LEFT JOIN projects p ON p.client_id = c.id
GROUP BY c.id, c.name
ORDER BY project_count DESC;`,
    },
    {
      title: '프로젝트별 고우선순위 업무',
      description: '프로젝트마다 우선순위가 HIGH인 업무가 몇 건씩 있는지 확인하세요. HIGH 업무가 없는 프로젝트도 0건으로 포함하고, 많은 순으로 정렬해 보여주세요. 프로젝트명(name)과 고우선순위 업무 수(high_priority_count)가 필요합니다.',
      hint: '조인 ON 절에 조건을 끼워 넣어 카운트 대상을 좁히는 패턴입니다.',
      explanation: 'WHERE에 priority 조건을 두면 HIGH가 없는 프로젝트가 사라지므로, LEFT JOIN의 ON 절에 priority = \'HIGH\'를 넣어 0건도 보존합니다.',
      relatedTables: ['projects', 'tasks'],
      sql: `SELECT p.name, COUNT(t.id) AS high_priority_count
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id AND t.priority = 'HIGH'
GROUP BY p.id, p.name
ORDER BY high_priority_count DESC;`,
    },
    {
      title: '마감 지난 미완료 업무',
      description: '특정 시점(2026-04-15) 기준으로 마감이 지났는데도 아직 끝나지 않은 업무를 찾아내야 합니다. 프로젝트명(project_name), 업무 제목(title), 담당자(assignee), 마감일(due_date)을 마감일 빠른 순으로 보여주세요.',
      hint: '복합 조건 필터링 + 다중 테이블 조인 패턴입니다.',
      explanation: 'status != \'DONE\'과 due_date < 기준일을 AND로 묶어 지연 업무만 필터링하고, 프로젝트와 담당자 정보를 조인해 함께 표시합니다.',
      relatedTables: ['projects', 'tasks', 'members'],
      sql: `SELECT p.name AS project_name, t.title, m.name AS assignee, t.due_date
FROM tasks t
JOIN projects p ON p.id = t.project_id
LEFT JOIN members m ON m.id = t.assignee_id
WHERE t.status != 'DONE'
  AND t.due_date < '2026-04-15'
ORDER BY t.due_date;`,
    },
  ],
  advanced: [
    {
      title: '프로젝트별 진행률',
      description: '프로젝트별로 전체 업무 대비 완료된 업무의 비율(진행률, %)을 계산해 진행률 높은 순으로 보여주세요. 프로젝트명(name), 전체 업무 수(total_tasks), 완료 업무 수(done_tasks), 진행률(done_rate, 소수점 1자리)이 필요합니다.',
      hint: '조건부 합계로 비율을 계산하는 패턴입니다.',
      explanation: 'CASE WHEN으로 완료 업무에만 1을 매겨 SUM으로 세고, 전체 COUNT 대비 비율을 계산한 뒤 ROUND로 소수점 한 자리로 다듬어 진행률을 만듭니다.',
      relatedTables: ['projects', 'tasks'],
      sql: `SELECT
  p.name,
  COUNT(t.id) AS total_tasks,
  SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) AS done_tasks,
  ROUND(SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) * 100.0 / COUNT(t.id), 1) AS done_rate
FROM projects p
JOIN tasks t ON t.project_id = p.id
GROUP BY p.id, p.name
ORDER BY done_rate DESC;`,
    },
    {
      title: '담당자 없는 업무',
      description: '아직 누구에게도 배정되지 않은 업무를 찾아내야 합니다. 프로젝트명(project_name)과 업무 제목(title)을 프로젝트명 순으로 보여주세요.',
      hint: 'NULL 값 탐지 필터링 패턴입니다.',
      explanation: 'WHERE t.assignee_id IS NULL로 담당자가 비어 있는 행만 추리고, projects와 JOIN하여 어느 프로젝트의 미배정 업무인지 함께 표시합니다.',
      relatedTables: ['tasks', 'projects'],
      sql: `SELECT p.name AS project_name, t.title
FROM tasks t
JOIN projects p ON p.id = t.project_id
WHERE t.assignee_id IS NULL
ORDER BY p.name;`,
    },
    {
      title: '참여하지 않는 멤버',
      description: '어떤 프로젝트에도 참여하지 않은 유휴 멤버를 찾아내야 합니다. 멤버 아이디(id), 이름(name), 역할(role)을 아이디 순으로 보여주세요.',
      hint: '안티 조인(반대 매칭) 패턴입니다.',
      explanation: 'members LEFT JOIN project_members 후 WHERE pm.member_id IS NULL 조건으로, 매핑이 전혀 없는 멤버만 골라냅니다. 전형적인 안티 조인입니다.',
      relatedTables: ['members', 'project_members'],
      sql: `SELECT m.id, m.name, m.role
FROM members m
LEFT JOIN project_members pm ON pm.member_id = m.id
WHERE pm.member_id IS NULL
ORDER BY m.id;`,
    },
    {
      title: '프로젝트별 업무 시간 순위',
      description: '각 프로젝트 내에서 예상 작업 시간이 큰 업무 순으로 순위를 매겨야 합니다. 프로젝트명(name), 업무 제목(title), 예상 시간(estimate_hours), 프로젝트 내 순위(estimate_rank)를 프로젝트명·순위 순으로 보여주세요.',
      hint: '그룹 안에서 순위를 매기는 윈도우 함수 패턴입니다.',
      explanation: 'RANK() OVER (PARTITION BY p.id ORDER BY t.estimate_hours DESC)로 프로젝트별 파티션을 만들고 그 안에서 작업 시간 내림차순 순위를 부여합니다.',
      relatedTables: ['projects', 'tasks'],
      sql: `SELECT
  p.name,
  t.title,
  t.estimate_hours,
  RANK() OVER (PARTITION BY p.id ORDER BY t.estimate_hours DESC) AS estimate_rank
FROM tasks t
JOIN projects p ON p.id = t.project_id
ORDER BY p.name, estimate_rank;`,
    },
    {
      title: '멤버별 업무 부하',
      description: '각 멤버가 아직 끝나지 않은 업무로 얼마나 부하를 받고 있는지 예상 시간 합으로 보여주세요. 미배정 멤버는 0시간으로 처리합니다. 멤버명(name)과 총 예상 시간(total_hours)을 부하 높은 순으로 정렬하세요.',
      hint: '조건부 조인 + NULL 기본값 처리(COALESCE) 패턴입니다.',
      explanation: 'LEFT JOIN ON 절에 status != \'DONE\' 조건을 두어 진행 중 업무만 합산 대상으로 삼고, COALESCE로 합산 결과 NULL을 0으로 치환합니다.',
      relatedTables: ['members', 'tasks'],
      sql: `SELECT m.name, COALESCE(SUM(t.estimate_hours), 0) AS total_hours
FROM members m
LEFT JOIN tasks t ON t.assignee_id = m.id AND t.status != 'DONE'
GROUP BY m.id, m.name
ORDER BY total_hours DESC;`,
    },
    {
      title: '프로젝트별 댓글 활동',
      description: '프로젝트마다 소속 업무에 달린 댓글이 총 몇 건인지 집계해 활동량이 많은 순서로 보여주세요. 프로젝트명(name)과 댓글 수(comment_count)가 필요합니다.',
      hint: '세 테이블을 거쳐 손자 테이블의 행을 집계하는 패턴입니다.',
      explanation: 'projects→tasks→task_comments를 차례로 조인하여 프로젝트 단위로 한 단계 떨어진 댓글 수를 GROUP BY와 COUNT로 모읍니다.',
      relatedTables: ['projects', 'tasks', 'task_comments'],
      sql: `SELECT p.name, COUNT(c.id) AS comment_count
FROM projects p
JOIN tasks t ON t.project_id = p.id
LEFT JOIN task_comments c ON c.task_id = t.id
GROUP BY p.id, p.name
ORDER BY comment_count DESC;`,
    },
    {
      title: '상태 변경 횟수 많은 업무',
      description: '상태가 자주 바뀐 업무는 진행이 불안정할 수 있습니다. 업무별 상태 변경 횟수를 세어 많은 순으로 보여주세요. 변경 이력이 없는 업무도 0으로 포함합니다. 업무 제목(title)과 변경 횟수(change_count)가 필요합니다.',
      hint: '이력 테이블을 본 테이블에 보존 조인하여 빈도 집계하는 패턴입니다.',
      explanation: 'tasks LEFT JOIN task_logs로 변경 이력이 없는 업무도 결과에 남기고, COUNT(l.id)로 이력 행 수만 세어 0건 업무도 함께 정렬합니다.',
      relatedTables: ['tasks', 'task_logs'],
      sql: `SELECT t.title, COUNT(l.id) AS change_count
FROM tasks t
LEFT JOIN task_logs l ON l.task_id = t.id
GROUP BY t.id, t.title
ORDER BY change_count DESC;`,
    },
    {
      title: '산업별 예상 업무 시간',
      description: '고객사가 속한 산업군(industry) 단위로, 진행 중인 모든 업무의 예상 시간 합을 보여주세요. 산업군과 총 예상 시간(total_estimate)을 합 큰 순으로 정렬합니다.',
      hint: '여러 단계의 테이블을 거쳐 상위 카테고리로 롤업하는 패턴입니다.',
      explanation: 'clients→projects→tasks 3단 조인 후 GROUP BY c.industry로 산업군 단위로 묶고 SUM(estimate_hours)로 작업 시간을 누적합니다.',
      relatedTables: ['clients', 'projects', 'tasks'],
      sql: `SELECT c.industry, SUM(t.estimate_hours) AS total_estimate
FROM clients c
JOIN projects p ON p.client_id = c.id
JOIN tasks t ON t.project_id = p.id
GROUP BY c.industry
ORDER BY total_estimate DESC;`,
    },
    {
      title: '프로젝트 멤버와 업무 배정 비교',
      description: '프로젝트에 공식적으로 참여 중인 멤버 수와, 실제로 업무를 배정받은 멤버 수를 비교해야 합니다. 프로젝트명(name), 참여 멤버 수(member_count), 업무 배정 멤버 수(assigned_member_count)를 프로젝트명 순으로 보여주세요.',
      hint: '서로 다른 조인 경로의 고유값을 동시에 카운트하는 패턴입니다.',
      explanation: 'project_members와 tasks를 각각 LEFT JOIN한 뒤 COUNT(DISTINCT ...)로 멤버 아이디 중복을 제거해, 한 쿼리에서 두 가지 인원수를 비교합니다.',
      relatedTables: ['projects', 'project_members', 'tasks'],
      sql: `SELECT
  p.name,
  COUNT(DISTINCT pm.member_id) AS member_count,
  COUNT(DISTINCT t.assignee_id) AS assigned_member_count
FROM projects p
LEFT JOIN project_members pm ON pm.project_id = p.id
LEFT JOIN tasks t ON t.project_id = p.id
GROUP BY p.id, p.name
ORDER BY p.name;`,
    },
    {
      title: '업무 상태 전환 요약',
      description: '업무가 어떤 상태에서 어떤 상태로 얼마나 자주 옮겨갔는지 전환 패턴을 요약해야 합니다. 최초 생성(이전 상태가 비어 있는 경우)은 START로 표시하세요. 이전 상태(from_status), 변경 후 상태(to_status), 전환 횟수(transition_count)를 횟수 많은 순으로 보여주세요.',
      hint: 'NULL을 대체 라벨로 치환 후 다중 컬럼으로 그룹 집계하는 패턴입니다.',
      explanation: 'COALESCE(from_status, \'START\')로 NULL을 START 라벨로 치환하고, (from_status, to_status) 두 컬럼으로 GROUP BY 하여 전환별 빈도를 집계합니다.',
      relatedTables: ['task_logs'],
      sql: `SELECT
  COALESCE(from_status, 'START') AS from_status,
  to_status,
  COUNT(*) AS transition_count
FROM task_logs
GROUP BY COALESCE(from_status, 'START'), to_status
ORDER BY transition_count DESC;`,
    },
  ],
})
