import { defineExampleSet } from './shared'

export const projectTaskExamples = defineExampleSet('04_project_task.sql', {
  beginner: [
    {
      title: '고객사 목록',
      relatedTables: ['clients'],
      sql: `SELECT id, name, industry, contact_name
FROM clients
ORDER BY id;`,
    },
    {
      title: '진행 중 프로젝트',
      relatedTables: ['projects'],
      sql: `SELECT name, status, started_at
FROM projects
WHERE status = 'ACTIVE'
ORDER BY started_at;`,
    },
    {
      title: '멤버 역할별 인원',
      relatedTables: ['members'],
      sql: `SELECT role, COUNT(*) AS member_count
FROM members
GROUP BY role
ORDER BY member_count DESC;`,
    },
    {
      title: '마감 임박 업무',
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
      relatedTables: ['tasks'],
      sql: `SELECT title, status, due_date
FROM tasks
WHERE status != 'DONE'
ORDER BY due_date;`,
    },
    {
      title: '우선순위별 업무 수',
      relatedTables: ['tasks'],
      sql: `SELECT priority, COUNT(*) AS task_count
FROM tasks
GROUP BY priority
ORDER BY task_count DESC;`,
    },
    {
      title: '업무 상태별 수',
      relatedTables: ['tasks'],
      sql: `SELECT status, COUNT(*) AS task_count
FROM tasks
GROUP BY status
ORDER BY task_count DESC;`,
    },
    {
      title: '프로젝트별 예상 시간',
      relatedTables: ['tasks'],
      sql: `SELECT project_id, SUM(estimate_hours) AS total_estimate
FROM tasks
GROUP BY project_id
ORDER BY total_estimate DESC;`,
    },
    {
      title: '최근 업무 댓글',
      relatedTables: ['task_comments'],
      sql: `SELECT task_id, member_id, content, created_at
FROM task_comments
ORDER BY created_at DESC;`,
    },
    {
      title: '상태 변경 로그',
      relatedTables: ['task_logs'],
      sql: `SELECT task_id, from_status, to_status, changed_at
FROM task_logs
ORDER BY changed_at;`,
    },
  ],
  intermediate: [
    {
      title: '프로젝트와 고객사',
      relatedTables: ['projects', 'clients'],
      sql: `SELECT p.name AS project_name, c.name AS client_name, p.status
FROM projects p
JOIN clients c ON c.id = p.client_id
ORDER BY p.started_at;`,
    },
    {
      title: '프로젝트별 업무 수',
      relatedTables: ['projects', 'tasks'],
      sql: `SELECT p.name, COUNT(t.id) AS task_count
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
GROUP BY p.id, p.name
ORDER BY task_count DESC;`,
    },
    {
      title: '멤버별 담당 업무 수',
      relatedTables: ['members', 'tasks'],
      sql: `SELECT m.name, COUNT(t.id) AS assigned_tasks
FROM members m
LEFT JOIN tasks t ON t.assignee_id = m.id
GROUP BY m.id, m.name
ORDER BY assigned_tasks DESC;`,
    },
    {
      title: '프로젝트 참여 멤버',
      relatedTables: ['projects', 'project_members', 'members'],
      sql: `SELECT p.name AS project_name, m.name AS member_name, pm.duty
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
JOIN members m ON m.id = pm.member_id
ORDER BY p.name, m.name;`,
    },
    {
      title: '업무 담당자와 프로젝트',
      relatedTables: ['tasks', 'projects', 'members'],
      sql: `SELECT p.name AS project_name, t.title, m.name AS assignee, t.status
FROM tasks t
JOIN projects p ON p.id = t.project_id
LEFT JOIN members m ON m.id = t.assignee_id
ORDER BY p.name, t.due_date;`,
    },
    {
      title: '댓글이 있는 업무',
      relatedTables: ['tasks', 'task_comments'],
      sql: `SELECT t.title, COUNT(c.id) AS comment_count
FROM tasks t
JOIN task_comments c ON c.task_id = t.id
GROUP BY t.id, t.title
ORDER BY comment_count DESC;`,
    },
    {
      title: '상태 변경된 업무',
      relatedTables: ['tasks', 'task_logs'],
      sql: `SELECT t.title, l.from_status, l.to_status, l.changed_at
FROM task_logs l
JOIN tasks t ON t.id = l.task_id
ORDER BY l.changed_at;`,
    },
    {
      title: '고객사별 프로젝트 수',
      relatedTables: ['clients', 'projects'],
      sql: `SELECT c.name, COUNT(p.id) AS project_count
FROM clients c
LEFT JOIN projects p ON p.client_id = c.id
GROUP BY c.id, c.name
ORDER BY project_count DESC;`,
    },
    {
      title: '프로젝트별 고우선순위 업무',
      relatedTables: ['projects', 'tasks'],
      sql: `SELECT p.name, COUNT(t.id) AS high_priority_count
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id AND t.priority = 'HIGH'
GROUP BY p.id, p.name
ORDER BY high_priority_count DESC;`,
    },
    {
      title: '마감 지난 미완료 업무',
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
      relatedTables: ['tasks', 'projects'],
      sql: `SELECT p.name AS project_name, t.title
FROM tasks t
JOIN projects p ON p.id = t.project_id
WHERE t.assignee_id IS NULL
ORDER BY p.name;`,
    },
    {
      title: '참여하지 않는 멤버',
      relatedTables: ['members', 'project_members'],
      sql: `SELECT m.id, m.name, m.role
FROM members m
LEFT JOIN project_members pm ON pm.member_id = m.id
WHERE pm.member_id IS NULL
ORDER BY m.id;`,
    },
    {
      title: '프로젝트별 업무 시간 순위',
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
      relatedTables: ['members', 'tasks'],
      sql: `SELECT m.name, COALESCE(SUM(t.estimate_hours), 0) AS total_hours
FROM members m
LEFT JOIN tasks t ON t.assignee_id = m.id AND t.status != 'DONE'
GROUP BY m.id, m.name
ORDER BY total_hours DESC;`,
    },
    {
      title: '프로젝트별 댓글 활동',
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
      relatedTables: ['tasks', 'task_logs'],
      sql: `SELECT t.title, COUNT(l.id) AS change_count
FROM tasks t
LEFT JOIN task_logs l ON l.task_id = t.id
GROUP BY t.id, t.title
ORDER BY change_count DESC;`,
    },
    {
      title: '산업별 예상 업무 시간',
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
