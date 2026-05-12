import { defineExampleSet } from './shared'

export const hrAttendanceExamples = defineExampleSet('03_hr_attendance.sql', {
  beginner: [
    {
      title: '부서 목록 보기',
      relatedTables: ['departments'],
      sql: `SELECT id, name, manager_name, location
FROM departments
ORDER BY id;`,
    },
    {
      title: '연봉 높은 직원',
      relatedTables: ['employees'],
      sql: `SELECT name, position, salary
FROM employees
ORDER BY salary DESC;`,
    },
    {
      title: '서울 부서 찾기',
      relatedTables: ['departments'],
      sql: `SELECT name, manager_name
FROM departments
WHERE location = '서울'
ORDER BY name;`,
    },
    {
      title: '지각 또는 결근 로그',
      relatedTables: ['attendance_logs'],
      sql: `SELECT employee_id, work_date, status
FROM attendance_logs
WHERE status != 'NORMAL'
ORDER BY work_date, employee_id;`,
    },
    {
      title: '휴가 상태별 건수',
      relatedTables: ['leave_requests'],
      sql: `SELECT status, COUNT(*) AS request_count
FROM leave_requests
GROUP BY status
ORDER BY request_count DESC;`,
    },
    {
      title: '근무 스케줄 목록',
      relatedTables: ['work_schedules'],
      sql: `SELECT employee_id, weekday, start_time, end_time
FROM work_schedules
ORDER BY employee_id;`,
    },
    {
      title: '직책별 직원 수',
      relatedTables: ['employees'],
      sql: `SELECT position, COUNT(*) AS employee_count
FROM employees
GROUP BY position
ORDER BY employee_count DESC;`,
    },
    {
      title: '부서별 직원 수',
      relatedTables: ['employees'],
      sql: `SELECT department_id, COUNT(*) AS employee_count
FROM employees
GROUP BY department_id
ORDER BY employee_count DESC;`,
    },
    {
      title: '입사일 빠른 순서',
      relatedTables: ['employees'],
      sql: `SELECT name, position, hired_at
FROM employees
ORDER BY hired_at ASC;`,
    },
    {
      title: '근태 상태별 건수',
      relatedTables: ['attendance_logs'],
      sql: `SELECT status, COUNT(*) AS log_count
FROM attendance_logs
GROUP BY status
ORDER BY log_count DESC;`,
    },
  ],
  intermediate: [
    {
      title: '부서명과 직원 목록',
      relatedTables: ['departments', 'employees'],
      sql: `SELECT d.name AS department_name, e.name AS employee_name, e.position
FROM employees e
JOIN departments d ON d.id = e.department_id
ORDER BY d.name, e.name;`,
    },
    {
      title: '부서별 평균 연봉',
      relatedTables: ['departments', 'employees'],
      sql: `SELECT d.name, ROUND(AVG(e.salary), 0) AS avg_salary
FROM departments d
JOIN employees e ON e.department_id = d.id
GROUP BY d.id, d.name
ORDER BY avg_salary DESC;`,
    },
    {
      title: '이상 근태 직원명',
      relatedTables: ['employees', 'attendance_logs'],
      sql: `SELECT e.name, a.work_date, a.status
FROM attendance_logs a
JOIN employees e ON e.id = a.employee_id
WHERE a.status != 'NORMAL'
ORDER BY a.work_date;`,
    },
    {
      title: '직원별 근태 로그 수',
      relatedTables: ['employees', 'attendance_logs'],
      sql: `SELECT e.name, COUNT(a.id) AS log_count
FROM employees e
LEFT JOIN attendance_logs a ON a.employee_id = e.id
GROUP BY e.id, e.name
ORDER BY log_count DESC;`,
    },
    {
      title: '직원별 휴가 신청 수',
      relatedTables: ['employees', 'leave_requests'],
      sql: `SELECT e.name, COUNT(l.id) AS leave_count
FROM employees e
LEFT JOIN leave_requests l ON l.employee_id = e.id
GROUP BY e.id, e.name
ORDER BY leave_count DESC;`,
    },
    {
      title: '승인된 휴가와 부서',
      relatedTables: ['departments', 'employees', 'leave_requests'],
      sql: `SELECT d.name AS department_name, e.name AS employee_name, l.leave_type, l.start_date, l.end_date
FROM leave_requests l
JOIN employees e ON e.id = l.employee_id
JOIN departments d ON d.id = e.department_id
WHERE l.status = 'APPROVED'
ORDER BY l.start_date;`,
    },
    {
      title: '월요일 스케줄과 직원',
      relatedTables: ['employees', 'work_schedules'],
      sql: `SELECT e.name, w.weekday, w.start_time, w.end_time
FROM work_schedules w
JOIN employees e ON e.id = w.employee_id
WHERE w.weekday = 'MON'
ORDER BY w.start_time, e.name;`,
    },
    {
      title: '부서별 이상 근태 수',
      relatedTables: ['departments', 'employees', 'attendance_logs'],
      sql: `SELECT d.name, COUNT(a.id) AS abnormal_count
FROM departments d
JOIN employees e ON e.department_id = d.id
LEFT JOIN attendance_logs a ON a.employee_id = e.id AND a.status != 'NORMAL'
GROUP BY d.id, d.name
ORDER BY abnormal_count DESC;`,
    },
    {
      title: '휴가 대기 직원',
      relatedTables: ['employees', 'leave_requests'],
      sql: `SELECT e.name, l.leave_type, l.start_date
FROM leave_requests l
JOIN employees e ON e.id = l.employee_id
WHERE l.status = 'PENDING'
ORDER BY l.start_date;`,
    },
    {
      title: '부서별 고연봉 직원 수',
      relatedTables: ['departments', 'employees'],
      sql: `SELECT d.name, COUNT(e.id) AS high_salary_count
FROM departments d
JOIN employees e ON e.department_id = d.id
WHERE e.salary >= 48000000
GROUP BY d.id, d.name
ORDER BY high_salary_count DESC;`,
    },
  ],
  advanced: [
    {
      title: '부서별 근태 리스크 점수',
      relatedTables: ['departments', 'employees', 'attendance_logs'],
      sql: `SELECT
  d.name,
  SUM(CASE WHEN a.status = 'LATE' THEN 1 WHEN a.status = 'ABSENT' THEN 3 ELSE 0 END) AS risk_score
FROM departments d
JOIN employees e ON e.department_id = d.id
LEFT JOIN attendance_logs a ON a.employee_id = e.id
GROUP BY d.id, d.name
ORDER BY risk_score DESC;`,
    },
    {
      title: '직원별 평균 출근 시각',
      relatedTables: ['employees', 'attendance_logs'],
      sql: `SELECT e.name, ROUND(AVG(strftime('%H', a.clock_in) * 60 + strftime('%M', a.clock_in)), 1) AS avg_clock_in_minutes
FROM employees e
JOIN attendance_logs a ON a.employee_id = e.id
WHERE a.clock_in IS NOT NULL
GROUP BY e.id, e.name
ORDER BY avg_clock_in_minutes;`,
    },
    {
      title: '근무 기록 없는 직원',
      relatedTables: ['employees', 'attendance_logs'],
      sql: `SELECT e.id, e.name
FROM employees e
LEFT JOIN attendance_logs a ON a.employee_id = e.id
WHERE a.id IS NULL
ORDER BY e.id;`,
    },
    {
      title: '부서별 연봉 순위',
      relatedTables: ['employees', 'departments'],
      sql: `SELECT
  d.name AS department_name,
  e.name AS employee_name,
  e.salary,
  RANK() OVER (PARTITION BY d.id ORDER BY e.salary DESC) AS salary_rank
FROM employees e
JOIN departments d ON d.id = e.department_id
ORDER BY d.name, salary_rank;`,
    },
    {
      title: '휴가 일수 계산',
      relatedTables: ['employees', 'leave_requests'],
      sql: `SELECT
  e.name,
  l.leave_type,
  l.status,
  julianday(l.end_date) - julianday(l.start_date) + 1 AS leave_days
FROM leave_requests l
JOIN employees e ON e.id = l.employee_id
ORDER BY leave_days DESC;`,
    },
    {
      title: '일자별 정상 근태율',
      relatedTables: ['attendance_logs'],
      sql: `SELECT
  work_date,
  COUNT(*) AS total_logs,
  SUM(CASE WHEN status = 'NORMAL' THEN 1 ELSE 0 END) AS normal_count,
  ROUND(SUM(CASE WHEN status = 'NORMAL' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS normal_rate
FROM attendance_logs
GROUP BY work_date
ORDER BY work_date;`,
    },
    {
      title: '스케줄 대비 늦은 출근',
      relatedTables: ['employees', 'attendance_logs', 'work_schedules'],
      sql: `SELECT e.name, a.work_date, w.start_time, a.clock_in
FROM attendance_logs a
JOIN employees e ON e.id = a.employee_id
JOIN work_schedules w ON w.employee_id = e.id
WHERE a.clock_in > w.start_time
ORDER BY a.work_date, a.clock_in;`,
    },
    {
      title: '휴가 승인과 결근 연결',
      relatedTables: ['employees', 'attendance_logs', 'leave_requests'],
      sql: `SELECT e.name, a.work_date, a.status, l.leave_type, l.status AS leave_status
FROM attendance_logs a
JOIN employees e ON e.id = a.employee_id
LEFT JOIN leave_requests l ON l.employee_id = e.id
  AND a.work_date BETWEEN l.start_date AND l.end_date
  AND l.status = 'APPROVED'
WHERE a.status = 'ABSENT'
ORDER BY a.work_date;`,
    },
    {
      title: '부서별 인건비 비중',
      relatedTables: ['departments', 'employees'],
      sql: `WITH dept_salary AS (
  SELECT d.name, SUM(e.salary) AS salary_total
  FROM departments d
  JOIN employees e ON e.department_id = d.id
  GROUP BY d.id, d.name
)
SELECT name, salary_total, ROUND(salary_total * 100.0 / SUM(salary_total) OVER (), 1) AS salary_share
FROM dept_salary
ORDER BY salary_share DESC;`,
    },
    {
      title: '직원 근태 종합표',
      relatedTables: ['departments', 'employees', 'attendance_logs', 'leave_requests'],
      sql: `SELECT
  d.name AS department_name,
  e.name,
  COUNT(DISTINCT a.id) AS attendance_count,
  COUNT(DISTINCT l.id) AS leave_count
FROM employees e
JOIN departments d ON d.id = e.department_id
LEFT JOIN attendance_logs a ON a.employee_id = e.id
LEFT JOIN leave_requests l ON l.employee_id = e.id
GROUP BY e.id, d.name, e.name
ORDER BY department_name, e.name;`,
    },
  ],
})
