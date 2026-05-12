import { defineExampleSet } from './shared'

export const joinSpecialExamples = defineExampleSet('11_join_special.sql', {
  beginner: [
    {
      title: '부서 목록과 예산',
      description: '부서의 식별자(id), 이름(name), 위치(location), 예산(budget)을 예산이 큰 순서대로 보여주세요. 어느 부서가 가장 큰 예산을 가지고 있는지 한눈에 확인하기 위한 자료입니다.',
      hint: '단일 테이블 정렬',
      explanation: 'departments 한 테이블에서 ORDER BY budget DESC로 내림차순 정렬한다. 조인 없이 컬럼만 골라 정렬하는 가장 기본 패턴이다.',
      relatedTables: ['departments'],
      sql: `SELECT id, name, location, budget
FROM departments
ORDER BY budget DESC;`,
    },
    {
      title: '직원 연봉 순서',
      description: '직원의 이름(name), 역할(role), 연봉(salary), 입사일(hire_date)을 연봉이 높은 순서대로 보여주세요. 보상 수준을 한눈에 비교하기 위한 자료입니다.',
      hint: '단일 테이블 정렬',
      explanation: 'employees 테이블에서 필요한 컬럼만 SELECT하고 ORDER BY salary DESC로 정렬한다. 조인이 필요 없는 단순 조회 패턴이다.',
      relatedTables: ['employees'],
      sql: `SELECT name, role, salary, hire_date
FROM employees
ORDER BY salary DESC;`,
    },
    {
      title: '서울 부서',
      description: '위치(location)가 서울인 부서의 이름(name)과 예산(budget)을 이름순으로 보여주세요. 특정 지역의 부서만 빠르게 찾는 용도입니다.',
      hint: '단순 조건 필터',
      explanation: 'WHERE location = \'서울\'로 행을 좁힌 뒤 ORDER BY name으로 정렬한다. 동등 비교 필터링의 가장 기본 형태다.',
      relatedTables: ['departments'],
      sql: `SELECT name, budget
FROM departments
WHERE location = '서울'
ORDER BY name;`,
    },
    {
      title: '프로젝트 상태별 수',
      description: '프로젝트의 상태(status)별로 프로젝트가 몇 건씩 있는지 많은 순서대로 보여주세요. 진행 상황을 한눈에 파악하기 위한 집계 자료입니다.',
      hint: '단일 컬럼 그룹 집계',
      explanation: 'GROUP BY status로 상태별 묶음을 만들고 COUNT(*)로 행 수를 센다. 가장 단순한 그룹 집계 패턴이다.',
      relatedTables: ['projects'],
      sql: `SELECT status, COUNT(*) AS project_count
FROM projects
GROUP BY status
ORDER BY project_count DESC;`,
    },
    {
      title: '고객 산업별 수',
      description: '고객의 산업(industry)별로 고객사가 몇 곳씩 있는지 많은 순서대로 보여주세요. 어떤 산업군 고객이 많은지 한눈에 확인하기 위한 자료입니다.',
      hint: '단일 컬럼 그룹 집계',
      explanation: 'clients 테이블을 industry로 GROUP BY하고 COUNT(*)로 건수를 집계한다. 카테고리별 빈도 분포를 보는 표준 패턴이다.',
      relatedTables: ['clients'],
      sql: `SELECT industry, COUNT(*) AS client_count
FROM clients
GROUP BY industry
ORDER BY client_count DESC;`,
    },
    {
      title: '프로젝트 예산 큰 순서',
      description: '프로젝트의 이름(name), 상태(status), 예산(budget)을 예산이 큰 순서로 상위 5건만 보여주세요. 가장 큰 비중을 가진 프로젝트를 추려내는 용도입니다.',
      hint: '상위 N건 추출',
      explanation: 'ORDER BY budget DESC로 정렬한 뒤 LIMIT 5로 상위 다섯 건만 자른다. Top-N 조회 패턴이다.',
      relatedTables: ['projects'],
      sql: `SELECT name, status, budget
FROM projects
ORDER BY budget DESC
LIMIT 5;`,
    },
    {
      title: '프로젝트 역할별 멤버 수',
      description: '프로젝트 참여자들의 역할(role)별로 인원이 몇 명씩 되는지 많은 순서대로 보여주세요. 어떤 역할이 가장 많이 투입되는지 파악하기 위한 자료입니다.',
      hint: '단일 컬럼 그룹 집계',
      explanation: 'project_members 테이블에서 role 기준으로 GROUP BY하고 COUNT로 인원을 센다. 역할 분포 확인 패턴이다.',
      relatedTables: ['project_members'],
      sql: `SELECT role, COUNT(*) AS member_count
FROM project_members
GROUP BY role
ORDER BY member_count DESC;`,
    },
    {
      title: '회의 일자 순서',
      description: '회의의 소속 프로젝트 식별자(project_id), 제목(title), 개최일(held_at)을 개최일이 빠른 순서로 보여주세요. 시간 순으로 진행된 회의 목록을 정리하기 위한 용도입니다.',
      hint: '단일 테이블 시간 정렬',
      explanation: 'meetings 테이블을 ORDER BY held_at으로 오름차순 정렬한다. 일자 기준 타임라인 정렬의 기본형이다.',
      relatedTables: ['meetings'],
      sql: `SELECT project_id, title, held_at
FROM meetings
ORDER BY held_at;`,
    },
    {
      title: '회의 참석 여부별 수',
      description: '회의 참석 여부(attended)별로 인원이 몇 명씩 되는지 참석=1이 위에 오도록 정리해서 보여주세요. 전체 참석률 감각을 잡기 위한 자료입니다.',
      hint: '플래그 컬럼 그룹 집계',
      explanation: '0/1 플래그 컬럼인 attended로 GROUP BY해서 각 값별 행 수를 센다. 불리언 분포 확인 패턴이다.',
      relatedTables: ['meeting_attendees'],
      sql: `SELECT attended, COUNT(*) AS attendee_count
FROM meeting_attendees
GROUP BY attended
ORDER BY attended DESC;`,
    },
    {
      title: '활성 직원 수',
      description: '활성 상태(is_active=1)인 직원이 총 몇 명인지 한 줄로 보여주세요. 현재 재직 인원 규모를 빠르게 확인하기 위한 용도입니다.',
      hint: '조건부 카운트',
      explanation: 'WHERE is_active = 1로 활성 직원만 남기고 COUNT(*)로 행 수를 집계한다. 필터 + 단일 집계 패턴이다.',
      relatedTables: ['employees'],
      sql: `SELECT COUNT(*) AS active_employee_count
FROM employees
WHERE is_active = 1;`,
    },
  ],
  intermediate: [
    {
      title: '직원과 부서',
      description: '직원의 이름(name)과 함께 소속 부서의 이름(department_name) 및 위치(location)를 보여주세요. 부서명, 직원명 순으로 정렬해 부서 단위로 묶이도록 합니다.',
      hint: '기본 두 테이블 조인',
      explanation: 'employees와 departments를 dept_id 기준으로 INNER JOIN해 직원과 부서 정보를 한 행에 묶는다. 가장 기본적인 두 테이블 조인 패턴이다.',
      relatedTables: ['employees', 'departments'],
      sql: `SELECT e.name, d.name AS department_name, d.location
FROM employees e
JOIN departments d ON d.id = e.dept_id
ORDER BY d.name, e.name;`,
    },
    {
      title: '직원과 매니저 SELF JOIN',
      description: '직원(employee)과 그 직원의 매니저(manager) 이름, 그리고 역할(role)을 함께 보여주세요. 매니저가 없는 직원도 빠지지 않게 포함합니다.',
      hint: '셀프 조인',
      explanation: '같은 employees 테이블을 두 번 별칭으로 참조해 manager_id로 연결하는 SELF JOIN이다. 매니저 없는 직원을 살리기 위해 LEFT JOIN을 쓴다.',
      relatedTables: ['employees'],
      sql: `SELECT e.name AS employee, m.name AS manager, e.role
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id
ORDER BY manager, employee;`,
    },
    {
      title: '프로젝트와 담당 부서',
      description: '프로젝트의 이름(project_name)과 담당 부서의 이름(department_name), 그리고 상태(status)를 부서명·프로젝트명 순으로 보여주세요. 어느 부서가 어떤 프로젝트를 맡고 있는지 파악하기 위한 자료입니다.',
      hint: '기본 두 테이블 조인',
      explanation: 'projects.dept_id로 departments와 INNER JOIN해 담당 부서 정보를 붙인다. 외래키 한 단계 조인 패턴이다.',
      relatedTables: ['projects', 'departments'],
      sql: `SELECT p.name AS project_name, d.name AS department_name, p.status
FROM projects p
JOIN departments d ON d.id = p.dept_id
ORDER BY d.name, p.name;`,
    },
    {
      title: '프로젝트와 고객사',
      description: '프로젝트의 이름(project_name)과 고객사 이름(client_name), 산업(industry)을 보여주세요. 고객사가 없는 사내 프로젝트도 함께 보여야 합니다.',
      hint: '선택 관계 보존 조인',
      explanation: 'client_id가 NULL일 수 있으므로 LEFT JOIN으로 고객사가 없는 프로젝트도 결과에 남긴다. 옵셔널 관계를 다루는 표준 패턴이다.',
      relatedTables: ['projects', 'clients'],
      sql: `SELECT p.name AS project_name, c.name AS client_name, c.industry
FROM projects p
LEFT JOIN clients c ON c.id = p.client_id
ORDER BY p.name;`,
    },
    {
      title: '프로젝트 참여 직원',
      description: '프로젝트 이름(project_name), 참여 직원 이름(employee_name), 그리고 참여 역할(role)을 프로젝트별·역할별로 정렬해 보여주세요. 누가 어떤 프로젝트에 어떤 역할로 들어가 있는지 한눈에 보기 위한 자료입니다.',
      hint: 'N:M 브리지 테이블 조인',
      explanation: 'project_members를 가운데 두고 projects, employees를 양옆으로 조인하는 다대다 브리지 패턴이다. 두 번의 INNER JOIN으로 세 테이블을 엮는다.',
      relatedTables: ['projects', 'project_members', 'employees'],
      sql: `SELECT p.name AS project_name, e.name AS employee_name, pm.role
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
JOIN employees e ON e.id = pm.employee_id
ORDER BY p.name, pm.role;`,
    },
    {
      title: '부서별 인원과 평균 연봉',
      description: '부서 이름별로 소속 직원 수(headcount)와 평균 연봉(avg_salary, 정수 반올림)을 평균 연봉이 높은 순서로 보여주세요. 부서별 인적 자원과 보상 수준을 비교하기 위한 자료입니다.',
      hint: '조인 후 그룹 집계',
      explanation: 'departments와 employees를 조인한 뒤 부서 단위로 GROUP BY해 COUNT와 AVG를 계산한다. ROUND로 평균을 정수로 정리한다.',
      relatedTables: ['departments', 'employees'],
      sql: `SELECT d.name, COUNT(e.id) AS headcount, ROUND(AVG(e.salary), 0) AS avg_salary
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name
ORDER BY avg_salary DESC;`,
    },
    {
      title: '프로젝트별 멤버 수',
      description: '프로젝트 이름과 거기에 참여한 인원 수(member_count)를 인원이 많은 순서로 보여주세요. 멤버가 한 명도 없는 프로젝트는 0으로 표시되어야 합니다.',
      hint: '왼쪽 보존 + 그룹 집계',
      explanation: 'projects를 기준으로 project_members와 LEFT JOIN한 뒤 GROUP BY로 묶으면 멤버 없는 프로젝트도 0으로 카운트된다. 모든 마스터 행을 보존하는 집계 패턴이다.',
      relatedTables: ['projects', 'project_members'],
      sql: `SELECT p.name, COUNT(pm.employee_id) AS member_count
FROM projects p
LEFT JOIN project_members pm ON pm.project_id = p.id
GROUP BY p.id, p.name
ORDER BY member_count DESC;`,
    },
    {
      title: '회의별 참석자 수',
      description: '회의 제목(title)과 실제 참석한 인원 수(attendee_count)를 참석자가 많은 순서로 보여주세요. 참석자가 없는 회의도 0으로 함께 나와야 합니다.',
      hint: 'ON 절 조건이 붙은 LEFT JOIN',
      explanation: 'a.attended = 1 조건을 WHERE가 아닌 ON 절에 두어 참석자 없는 회의의 행이 사라지지 않게 한다. LEFT JOIN과 조건 위치의 차이를 보여주는 패턴이다.',
      relatedTables: ['meetings', 'meeting_attendees'],
      sql: `SELECT m.title, COUNT(a.id) AS attendee_count
FROM meetings m
LEFT JOIN meeting_attendees a ON a.meeting_id = m.id AND a.attended = 1
GROUP BY m.id, m.title
ORDER BY attendee_count DESC;`,
    },
    {
      title: '배정 없는 직원',
      description: '어떤 프로젝트에도 참여하고 있지 않은 직원의 이름과 소속 부서 이름(department_name)을 직원 식별자 순서로 보여주세요. 유휴 인력 파악을 위한 자료입니다.',
      hint: '안티조인',
      explanation: 'project_members와 LEFT JOIN한 뒤 WHERE pm.id IS NULL로 매칭이 없는 행만 남기는 안티조인 패턴이다. NOT EXISTS와 같은 효과를 낸다.',
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
      description: '회의가 한 건도 잡혀 있지 않은 프로젝트의 식별자(id), 이름(name), 상태(status)를 식별자 순서로 보여주세요. 소통이 부족한 프로젝트를 점검하기 위한 자료입니다.',
      hint: '안티조인',
      explanation: 'meetings와 LEFT JOIN한 뒤 m.id IS NULL인 행만 남겨 회의가 전혀 없는 프로젝트를 골라내는 안티조인 패턴이다.',
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
      description: '프로젝트 이름과 함께 회의에 초대된 총 인원(invited_count), 실제 참석한 인원(attended_count), 그리고 참석률(attendance_rate, %, 소수 한 자리)을 참석률이 높은 순서로 보여주세요. 어느 프로젝트가 회의 참여가 활발한지 비교하는 자료입니다.',
      hint: '복수 조인 + 조건부 비율',
      explanation: 'projects, meetings, meeting_attendees를 세 단계로 조인한 뒤 CASE WHEN으로 참석 인원을 합산해 비율을 계산한다. 분자에 100.0을 곱해 정수 나눗셈을 피하는 게 포인트다.',
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
      description: '부서 이름과 그 부서의 예산(department_budget), 해당 부서가 맡은 프로젝트 예산 합계(project_budget), 그리고 둘의 차이(budget_gap)를 차이가 큰 순서로 보여주세요. 부서별 예산이 프로젝트 규모와 균형이 맞는지 점검하기 위한 자료입니다.',
      hint: '왼쪽 보존 + 차이 계산',
      explanation: 'departments 기준으로 projects를 LEFT JOIN해 프로젝트가 없는 부서도 살리고, COALESCE로 NULL을 0으로 바꾼 뒤 차이를 계산한다.',
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
      description: '직원 이름과 참여 중인 프로젝트 수(project_count), 그리고 그 수를 기준으로 매긴 순위(project_rank)를 순위·이름 순으로 보여주세요. 프로젝트 부하가 누구에게 집중되어 있는지 확인하기 위한 자료입니다.',
      hint: '집계 + 윈도우 RANK',
      explanation: 'employees와 project_members를 LEFT JOIN해 직원별 참여 수를 집계한 뒤, RANK() OVER로 동률을 허용하는 순위를 부여한다. 집계와 윈도우 함수를 함께 쓰는 패턴이다.',
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
      description: '고객사 이름과 의뢰한 프로젝트 수(project_count), 그리고 총 프로젝트 예산(total_budget)을 예산 큰 순으로 보여주세요. 고객사별 매출 규모를 비교하기 위한 자료입니다.',
      hint: '왼쪽 보존 + 합계 집계',
      explanation: 'clients를 기준으로 projects를 LEFT JOIN하고 GROUP BY로 묶어 COUNT와 SUM을 동시에 계산한다. 프로젝트가 없는 고객사도 결과에 남는다.',
      relatedTables: ['clients', 'projects'],
      sql: `SELECT c.name, COUNT(p.id) AS project_count, SUM(p.budget) AS total_budget
FROM clients c
LEFT JOIN projects p ON p.client_id = c.id
GROUP BY c.id, c.name
ORDER BY total_budget DESC;`,
    },
    {
      title: '사내 프로젝트 비중',
      description: '프로젝트를 사내(INTERNAL)와 고객사(CLIENT) 두 그룹으로 나누어 각 그룹의 프로젝트 수(project_count)와 총 예산(total_budget)을 예산이 큰 순으로 보여주세요. 사내 투자와 외부 수주 규모를 비교하기 위한 자료입니다.',
      hint: 'CASE 식으로 그룹 분기',
      explanation: 'client_id가 NULL인지 여부로 두 카테고리를 만든 뒤 CASE 식 자체를 GROUP BY 키로 사용하는 패턴이다. 조인 없이 한 테이블로 처리한다.',
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
      description: '회의에 불참(attended=0)한 횟수가 많은 직원의 이름과 불참 횟수(absent_count)를 많은 순서로 보여주세요. 회의 참여가 저조한 인원을 식별하기 위한 자료입니다.',
      hint: '필터 + 그룹 집계',
      explanation: 'employees와 meeting_attendees를 조인한 뒤 WHERE로 불참 행만 남기고 직원별로 카운트한다. 조인 후 필터링 패턴이다.',
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
      description: '프로젝트 이름과 함께 개발자 수(dev_count), PM 수(pm_count), 기타 직군 수(other_count)를 한 행으로 보여주세요. 프로젝트마다 직군 구성이 어떻게 다른지 비교하기 위한 자료입니다.',
      hint: '조건부 집계 피벗',
      explanation: 'CASE WHEN을 SUM 안에 넣어 역할별 인원을 컬럼으로 펼치는 조건부 집계(피벗) 패턴이다. project_members 없는 프로젝트도 0으로 남기기 위해 LEFT JOIN을 쓴다.',
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
      description: '팀원이 한 명 이상 있는 팀장의 이름(manager_name)과 그 팀장이 거느린 팀원 수(member_count)를 팀원이 많은 순서로 보여주세요. 어느 팀장이 가장 큰 조직을 이끄는지 파악하기 위한 자료입니다.',
      hint: '셀프 조인 + HAVING',
      explanation: 'employees를 manager/member 두 별칭으로 셀프 조인해 manager_id로 연결하고, HAVING으로 팀원 수가 0인 행을 제거한다.',
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
      description: '프로젝트의 이름과 상태, 시작일(start_date), 종료일(end_date), 그리고 진행 일수(project_days)를 일수가 긴 순서로 보여주세요. 종료일이 비어 있는 프로젝트는 2024-12-31까지로 가정합니다.',
      hint: '날짜 차이 + NULL 기본값',
      explanation: 'julianday()로 두 날짜를 일수로 변환해 빼고, COALESCE로 종료일 NULL을 기준일로 대체한다. SQLite의 날짜 산술 패턴이다.',
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
      description: '담당 부서 이름(department_name), 프로젝트 이름(project_name), 고객사 이름(client_name, 없으면 "사내"), 참여 인원 수(member_count), 회의 수(meeting_count)를 인원 많은 순·회의 많은 순으로 보여주세요. 프로젝트 단위의 전반적인 현황을 한 화면에 모으는 리포트입니다.',
      hint: '복수 LEFT JOIN + DISTINCT 집계',
      explanation: 'projects를 중심으로 부서·고객사·멤버·회의를 모두 LEFT JOIN하고, 다중 조인으로 발생하는 행 중복을 COUNT(DISTINCT)로 제거한다. COALESCE로 사내 프로젝트의 NULL을 표시 문자열로 바꾼다.',
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
