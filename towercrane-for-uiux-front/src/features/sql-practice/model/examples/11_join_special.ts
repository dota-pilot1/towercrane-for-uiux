import { defineExampleSet } from './shared'

export const joinSpecialExamples = defineExampleSet('11_join_special.sql', {
  beginner: [
    {
      title: '부서 목록과 예산',
      relatedTables: ['departments'],
      sql: `SELECT id, name, location, budget
FROM departments
ORDER BY budget DESC;`,
    },
    {
      title: '직원 연봉 순서',
      relatedTables: ['employees'],
      sql: `SELECT name, role, salary, hire_date
FROM employees
ORDER BY salary DESC;`,
    },
    {
      title: '서울 부서',
      relatedTables: ['departments'],
      sql: `SELECT name, budget
FROM departments
WHERE location = '서울'
ORDER BY name;`,
    },
    {
      title: '프로젝트 상태별 수',
      relatedTables: ['projects'],
      sql: `SELECT status, COUNT(*) AS project_count
FROM projects
GROUP BY status
ORDER BY project_count DESC;`,
    },
    {
      title: '고객 산업별 수',
      relatedTables: ['clients'],
      sql: `SELECT industry, COUNT(*) AS client_count
FROM clients
GROUP BY industry
ORDER BY client_count DESC;`,
    },
    {
      title: '프로젝트 예산 큰 순서',
      relatedTables: ['projects'],
      sql: `SELECT name, status, budget
FROM projects
ORDER BY budget DESC
LIMIT 5;`,
    },
    {
      title: '프로젝트 역할별 멤버 수',
      relatedTables: ['project_members'],
      sql: `SELECT role, COUNT(*) AS member_count
FROM project_members
GROUP BY role
ORDER BY member_count DESC;`,
    },
    {
      title: '회의 일자 순서',
      relatedTables: ['meetings'],
      sql: `SELECT project_id, title, held_at
FROM meetings
ORDER BY held_at;`,
    },
    {
      title: '회의 참석 여부별 수',
      relatedTables: ['meeting_attendees'],
      sql: `SELECT attended, COUNT(*) AS attendee_count
FROM meeting_attendees
GROUP BY attended
ORDER BY attended DESC;`,
    },
    {
      title: '활성 직원 수',
      relatedTables: ['employees'],
      sql: `SELECT COUNT(*) AS active_employee_count
FROM employees
WHERE is_active = 1;`,
    },
  ],
  intermediate: [
    {
      title: '직원과 부서',
      relatedTables: ['employees', 'departments'],
      sql: `SELECT e.name, d.name AS department_name, d.location
FROM employees e
JOIN departments d ON d.id = e.dept_id
ORDER BY d.name, e.name;`,
    },
    {
      title: '직원과 매니저 SELF JOIN',
      relatedTables: ['employees'],
      sql: `SELECT e.name AS employee, m.name AS manager, e.role
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id
ORDER BY manager, employee;`,
    },
    {
      title: '프로젝트와 담당 부서',
      relatedTables: ['projects', 'departments'],
      sql: `SELECT p.name AS project_name, d.name AS department_name, p.status
FROM projects p
JOIN departments d ON d.id = p.dept_id
ORDER BY d.name, p.name;`,
    },
    {
      title: '프로젝트와 고객사',
      relatedTables: ['projects', 'clients'],
      sql: `SELECT p.name AS project_name, c.name AS client_name, c.industry
FROM projects p
LEFT JOIN clients c ON c.id = p.client_id
ORDER BY p.name;`,
    },
    {
      title: '프로젝트 참여 직원',
      relatedTables: ['projects', 'project_members', 'employees'],
      sql: `SELECT p.name AS project_name, e.name AS employee_name, pm.role
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
JOIN employees e ON e.id = pm.employee_id
ORDER BY p.name, pm.role;`,
    },
    {
      title: '부서별 인원과 평균 연봉',
      relatedTables: ['departments', 'employees'],
      sql: `SELECT d.name, COUNT(e.id) AS headcount, ROUND(AVG(e.salary), 0) AS avg_salary
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
ORDER BY avg_salary DESC;`,
    },
    {
      title: '프로젝트별 멤버 수',
      relatedTables: ['projects', 'project_members'],
      sql: `SELECT p.name, COUNT(pm.employee_id) AS member_count
FROM projects p
LEFT JOIN project_members pm ON pm.project_id = p.id
GROUP BY p.id, p.name
ORDER BY member_count DESC;`,
    },
    {
      title: '회의별 참석자 수',
      relatedTables: ['meetings', 'meeting_attendees'],
      sql: `SELECT m.title, COUNT(a.id) AS attendee_count
FROM meetings m
LEFT JOIN meeting_attendees a ON a.meeting_id = m.id AND a.attended = 1
GROUP BY m.id, m.title
ORDER BY attendee_count DESC;`,
    },
    {
      title: '배정 없는 직원',
      relatedTables: ['employees', 'departments', 'project_members'],
      sql: `SELECT e.name, d.name AS department_name
FROM employees e
JOIN departments d ON d.id = e.dept_id
LEFT JOIN project_members pm ON pm.employee_id = e.id
WHERE pm.id IS NULL
ORDER BY e.id;`,
    },
    {
      title: '회의 없는 프로젝트',
      relatedTables: ['projects', 'meetings'],
      sql: `SELECT p.id, p.name, p.status
FROM projects p
LEFT JOIN meetings m ON m.project_id = p.id
WHERE m.id IS NULL
ORDER BY p.id;`,
    },
  ],
  advanced: [
    {
      title: '프로젝트별 참석률',
      relatedTables: ['projects', 'meetings', 'meeting_attendees'],
      sql: `SELECT
  p.name,
  COUNT(a.id) AS invited_count,
  SUM(CASE WHEN a.attended = 1 THEN 1 ELSE 0 END) AS attended_count,
  ROUND(SUM(CASE WHEN a.attended = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id), 1) AS attendance_rate
FROM projects p
JOIN meetings m ON m.project_id = p.id
JOIN meeting_attendees a ON a.meeting_id = m.id
GROUP BY p.id, p.name
ORDER BY attendance_rate DESC;`,
    },
    {
      title: '부서 예산 대비 프로젝트 예산',
      relatedTables: ['departments', 'projects'],
      sql: `SELECT
  d.name,
  d.budget AS department_budget,
  COALESCE(SUM(p.budget), 0) AS project_budget,
  COALESCE(SUM(p.budget), 0) - d.budget AS budget_gap
FROM departments d
LEFT JOIN projects p ON p.dept_id = d.id
GROUP BY d.id, d.name, d.budget
ORDER BY budget_gap DESC;`,
    },
    {
      title: '직원별 프로젝트 수 순위',
      relatedTables: ['employees', 'project_members'],
      sql: `SELECT
  e.name,
  COUNT(pm.project_id) AS project_count,
  RANK() OVER (ORDER BY COUNT(pm.project_id) DESC) AS project_rank
FROM employees e
LEFT JOIN project_members pm ON pm.employee_id = e.id
GROUP BY e.id, e.name
ORDER BY project_rank, e.name;`,
    },
    {
      title: '고객사별 프로젝트 예산',
      relatedTables: ['clients', 'projects'],
      sql: `SELECT c.name, COUNT(p.id) AS project_count, SUM(p.budget) AS total_budget
FROM clients c
LEFT JOIN projects p ON p.client_id = c.id
GROUP BY c.id, c.name
ORDER BY total_budget DESC;`,
    },
    {
      title: '사내 프로젝트 비중',
      relatedTables: ['projects'],
      sql: `SELECT
  CASE WHEN client_id IS NULL THEN 'INTERNAL' ELSE 'CLIENT' END AS project_type,
  COUNT(*) AS project_count,
  SUM(budget) AS total_budget
FROM projects
GROUP BY CASE WHEN client_id IS NULL THEN 'INTERNAL' ELSE 'CLIENT' END
ORDER BY total_budget DESC;`,
    },
    {
      title: '회의 불참 직원 통계',
      relatedTables: ['employees', 'meeting_attendees'],
      sql: `SELECT e.name, COUNT(a.id) AS absent_count
FROM employees e
JOIN meeting_attendees a ON a.employee_id = e.id
WHERE a.attended = 0
GROUP BY e.id, e.name
ORDER BY absent_count DESC;`,
    },
    {
      title: '프로젝트별 직군 구성',
      relatedTables: ['projects', 'project_members'],
      sql: `SELECT
  p.name,
  SUM(CASE WHEN pm.role = 'DEV' THEN 1 ELSE 0 END) AS dev_count,
  SUM(CASE WHEN pm.role = 'PM' THEN 1 ELSE 0 END) AS pm_count,
  SUM(CASE WHEN pm.role NOT IN ('DEV', 'PM') THEN 1 ELSE 0 END) AS other_count
FROM projects p
LEFT JOIN project_members pm ON pm.project_id = p.id
GROUP BY p.id, p.name
ORDER BY p.name;`,
    },
    {
      title: '팀장과 팀원 수',
      relatedTables: ['employees'],
      sql: `SELECT manager.name AS manager_name, COUNT(member.id) AS member_count
FROM employees manager
LEFT JOIN employees member ON member.manager_id = manager.id
GROUP BY manager.id, manager.name
HAVING member_count > 0
ORDER BY member_count DESC;`,
    },
    {
      title: '프로젝트 기간 계산',
      relatedTables: ['projects'],
      sql: `SELECT
  name,
  status,
  start_date,
  end_date,
  julianday(COALESCE(end_date, '2024-12-31')) - julianday(start_date) AS project_days
FROM projects
ORDER BY project_days DESC;`,
    },
    {
      title: 'JOIN 종합 리포트',
      relatedTables: ['departments', 'employees', 'projects', 'clients', 'project_members', 'meetings'],
      sql: `SELECT
  d.name AS department_name,
  p.name AS project_name,
  COALESCE(c.name, '사내') AS client_name,
  COUNT(DISTINCT pm.employee_id) AS member_count,
  COUNT(DISTINCT m.id) AS meeting_count
FROM projects p
JOIN departments d ON d.id = p.dept_id
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN project_members pm ON pm.project_id = p.id
LEFT JOIN meetings m ON m.project_id = p.id
GROUP BY d.name, p.name, c.name
ORDER BY member_count DESC, meeting_count DESC;`,
    },
  ],
})
