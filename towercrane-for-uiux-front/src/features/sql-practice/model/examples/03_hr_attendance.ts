import { defineExampleSet } from './shared'

export const hrAttendanceExamples = defineExampleSet('03_hr_attendance.sql', {
  beginner: [
    {
      id: '03_hr_attendance.beginner.01',
      title: '부서 목록 보기',
      description:
        '회사의 모든 부서를 한눈에 볼 수 있도록 목록을 보여주세요. 부서ID(id), 부서명(name), 부서장(manager_name), 위치(location)를 출력하고, 부서ID가 작은 순으로 정렬합니다.',
      hint: '단일 테이블의 전체 행을 특정 컬럼 기준으로 오름차순 나열하는 기본 패턴입니다.',
      explanation:
        'SELECT는 테이블에서 원하는 컬럼을 골라오고, ORDER BY id는 id 값이 작은 것부터 큰 순서로 정렬합니다. ASC가 기본값이므로 생략 가능합니다.',
      relatedTables: ['departments'],
      sql: `SELECT id, name, manager_name, location
FROM departments
ORDER BY id;`,
    },
    {
      id: '03_hr_attendance.beginner.02',
      title: '연봉 높은 직원',
      description:
        '회사의 모든 직원을 연봉이 높은 순으로 정렬해서 보여주세요. 이름(name), 직책(position), 연봉(salary)을 출력합니다.',
      hint: '특정 컬럼을 기준으로 내림차순 정렬하는 기본 패턴입니다.',
      explanation:
        'ORDER BY salary DESC는 숫자 컬럼을 큰 값부터 작은 값 순으로 정렬합니다. 기본값은 ASC이므로 큰 값부터 보려면 DESC를 명시해야 합니다.',
      relatedTables: ['employees'],
      sql: `SELECT name, position, salary
FROM employees
ORDER BY salary DESC;`,
    },
    {
      id: '03_hr_attendance.beginner.03',
      title: '서울 부서 찾기',
      description:
        '위치가 서울인 부서만 골라서 보여주세요. 부서명(name)과 부서장(manager_name)을 출력하고, 부서명 가나다 순으로 정렬합니다.',
      hint: '특정 컬럼 값이 일치하는 행만 거르는 단순 조건 필터입니다.',
      explanation:
        "WHERE location = '서울' 조건으로 해당 위치인 행만 남기고, ORDER BY name으로 부서명 사전순 정렬을 수행합니다.",
      relatedTables: ['departments'],
      sql: `SELECT name, manager_name
FROM departments
WHERE location = '서울'
ORDER BY name;`,
    },
    {
      id: '03_hr_attendance.beginner.04',
      title: '지각 또는 결근 로그',
      description:
        '근태 로그 중 정상이 아닌(지각·결근 등) 기록만 골라서 보여주세요. 직원ID(employee_id), 근무일(work_date), 상태(status)를 출력하고 근무일이 빠른 순으로 정렬합니다.',
      hint: '특정 값을 제외하는 부등 조건 필터입니다.',
      explanation:
        "WHERE status != 'NORMAL' 은 NORMAL이 아닌 모든 상태(LATE, ABSENT 등)를 통과시킵니다. 정렬 컬럼을 여러 개 지정하면 앞의 컬럼이 같을 때 다음 컬럼으로 2차 정렬됩니다.",
      relatedTables: ['attendance_logs'],
      sql: `SELECT employee_id, work_date, status
FROM attendance_logs
WHERE status != 'NORMAL'
ORDER BY work_date, employee_id;`,
    },
    {
      id: '03_hr_attendance.beginner.05',
      title: '휴가 상태별 건수',
      description:
        '휴가 신청 상태(승인 대기, 승인 완료 등)별로 신청이 몇 건씩 있는지 집계해서 보여주세요. 상태(status)와 건수(request_count)를 출력하고 건수가 많은 순으로 정렬합니다.',
      hint: '같은 값을 묶어서 개수를 세는 그룹별 집계 패턴입니다.',
      explanation:
        'GROUP BY status는 같은 status 값을 가진 행을 한 그룹으로 묶고, COUNT(*)는 그룹당 행 수를 셉니다. 집계 결과 컬럼으로 정렬할 때는 별칭을 그대로 사용할 수 있습니다.',
      relatedTables: ['leave_requests'],
      sql: `SELECT status, COUNT(*) AS request_count
FROM leave_requests
GROUP BY status
ORDER BY request_count DESC;`,
    },
    {
      id: '03_hr_attendance.beginner.06',
      title: '근무 스케줄 목록',
      description:
        '직원별 근무 스케줄을 모두 보여주세요. 직원ID(employee_id), 요일(weekday), 시작 시각(start_time), 종료 시각(end_time)을 출력하고 직원ID 순으로 정렬합니다.',
      hint: '단일 테이블의 컬럼 선택과 단순 정렬 조합입니다.',
      explanation:
        '필터 없이 모든 행을 가져와 employee_id로 정렬합니다. 동일 직원의 여러 요일 스케줄이 인접하게 표시되어 가독성이 좋아집니다.',
      relatedTables: ['work_schedules'],
      sql: `SELECT employee_id, weekday, start_time, end_time
FROM work_schedules
ORDER BY employee_id;`,
    },
    {
      id: '03_hr_attendance.beginner.07',
      title: '직책별 직원 수',
      description:
        '각 직책별로 몇 명의 직원이 있는지 집계해서 보여주세요. 직책(position)과 직원 수(employee_count)를 출력하고 인원이 많은 직책부터 표시합니다.',
      hint: '카테고리 컬럼으로 묶어 개수를 세는 그룹별 집계입니다.',
      explanation:
        'GROUP BY position으로 같은 직책끼리 묶고 COUNT(*)로 그룹당 직원 수를 셉니다. 분포를 빠르게 파악할 때 자주 쓰는 패턴입니다.',
      relatedTables: ['employees'],
      sql: `SELECT position, COUNT(*) AS employee_count
FROM employees
GROUP BY position
ORDER BY employee_count DESC;`,
    },
    {
      id: '03_hr_attendance.beginner.08',
      title: '부서별 직원 수',
      description:
        '부서별로 직원이 몇 명인지 집계해서 보여주세요. 부서ID(department_id)와 직원 수(employee_count)를 출력하고 인원이 많은 부서부터 정렬합니다.',
      hint: '외래키 컬럼을 기준으로 묶는 그룹별 집계 패턴입니다.',
      explanation:
        'employees 테이블의 department_id로 그룹화하면 부서별 분포를 알 수 있습니다. 부서명을 함께 보려면 departments 테이블과 조인해야 하지만, 여기서는 ID만으로 충분합니다.',
      relatedTables: ['employees'],
      sql: `SELECT department_id, COUNT(*) AS employee_count
FROM employees
GROUP BY department_id
ORDER BY employee_count DESC;`,
    },
    {
      id: '03_hr_attendance.beginner.09',
      title: '입사일 빠른 순서',
      description:
        '직원들을 입사일이 빠른 순으로 정렬해서 보여주세요. 이름(name), 직책(position), 입사일(hired_at)을 출력합니다.',
      hint: '날짜 컬럼 기준 오름차순 정렬로 입사 순서를 만드는 패턴입니다.',
      explanation:
        '날짜/시간 컬럼은 문자열·숫자처럼 ORDER BY로 정렬됩니다. ASC는 과거→현재 순서로 표시됩니다.',
      relatedTables: ['employees'],
      sql: `SELECT name, position, hired_at
FROM employees
ORDER BY hired_at ASC;`,
    },
    {
      id: '03_hr_attendance.beginner.10',
      title: '근태 상태별 건수',
      description:
        '근태 로그를 상태(정상, 지각, 결근 등)별로 몇 건이 쌓였는지 집계해서 보여주세요. 상태(status)와 건수(log_count)를 출력하고 건수가 많은 순으로 정렬합니다.',
      hint: '상태 코드 컬럼으로 묶어 개수를 세는 그룹별 집계입니다.',
      explanation:
        'GROUP BY status로 같은 상태 값을 묶고 COUNT(*)로 그룹별 로그 수를 계산합니다. 운영 지표 대시보드에서 자주 쓰이는 형태입니다.',
      relatedTables: ['attendance_logs'],
      sql: `SELECT status, COUNT(*) AS log_count
FROM attendance_logs
GROUP BY status
ORDER BY log_count DESC;`,
    },
  ],
  intermediate: [
    {
      id: '03_hr_attendance.intermediate.01',
      title: '부서명과 직원 목록',
      description:
        '각 직원이 어느 부서 소속인지 한눈에 볼 수 있도록 부서명과 직원 정보를 함께 보여주세요. 부서명(department_name), 직원명(employee_name), 직책(position)을 출력하고 부서명, 직원명 순으로 정렬합니다.',
      hint: '두 테이블을 외래키로 연결하는 기본 조인 패턴입니다.',
      explanation:
        'employees.department_id 와 departments.id 를 JOIN으로 연결하면 부서명을 직원 행에 붙일 수 있습니다. 별칭(e, d)을 쓰면 컬럼 출처를 명확히 표현할 수 있습니다.',
      relatedTables: ['departments', 'employees'],
      sql: `SELECT d.name AS department_name, e.name AS employee_name, e.position
FROM employees e
JOIN departments d ON d.id = e.department_id
ORDER BY d.name, e.name;`,
    },
    {
      id: '03_hr_attendance.intermediate.02',
      title: '부서별 평균 연봉',
      description:
        '각 부서의 평균 연봉을 계산해서 보여주세요. 부서명(name)과 평균 연봉(avg_salary, 반올림한 정수)을 출력하고 평균 연봉이 높은 순으로 정렬합니다.',
      hint: '두 테이블을 조인한 후 부서별로 묶어 평균을 구하는 집계 패턴입니다.',
      explanation:
        'JOIN으로 부서·직원을 연결하고 GROUP BY d.id, d.name으로 부서 단위로 묶은 뒤 AVG(salary)로 평균을 계산합니다. ROUND(..., 0)으로 소수점을 정리합니다.',
      relatedTables: ['departments', 'employees'],
      sql: `SELECT d.name, ROUND(AVG(e.salary), 0) AS avg_salary
FROM departments d
JOIN employees e ON e.department_id = d.id
GROUP BY d.id, d.name
ORDER BY avg_salary DESC;`,
    },
    {
      id: '03_hr_attendance.intermediate.03',
      title: '이상 근태 직원명',
      description:
        '정상이 아닌 근태 로그를 직원 이름과 함께 보여주세요. 이름(name), 근무일(work_date), 상태(status)를 출력하고 근무일이 빠른 순으로 정렬합니다.',
      hint: '근태 로그에 직원 정보를 연결한 뒤 비정상 상태만 거르는 패턴입니다.',
      explanation:
        '두 테이블 JOIN으로 employee_id에 이름을 매핑하고, WHERE 조건으로 비정상 상태만 필터링합니다. 운영자가 직원 이름으로 바로 확인할 수 있어야 할 때 유용한 형태입니다.',
      relatedTables: ['employees', 'attendance_logs'],
      sql: `SELECT e.name, a.work_date, a.status
FROM attendance_logs a
JOIN employees e ON e.id = a.employee_id
WHERE a.status != 'NORMAL'
ORDER BY a.work_date;`,
    },
    {
      id: '03_hr_attendance.intermediate.04',
      title: '직원별 근태 로그 수',
      description:
        '모든 직원의 누적 근태 로그 수를 보여주세요. 로그가 한 건도 없는 직원도 0으로 표시되어야 합니다. 이름(name)과 로그 수(log_count)를 출력하고 로그 수가 많은 순으로 정렬합니다.',
      hint: '왼쪽 테이블을 모두 살리는 LEFT JOIN과 그룹 집계의 조합입니다.',
      explanation:
        'LEFT JOIN을 쓰면 로그가 없는 직원도 결과에 남고, COUNT(a.id)는 NULL을 세지 않으므로 0으로 집계됩니다. COUNT(*)와 다르게 동작한다는 점이 중요합니다.',
      relatedTables: ['employees', 'attendance_logs'],
      sql: `SELECT e.name, COUNT(a.id) AS log_count
FROM employees e
LEFT JOIN attendance_logs a ON a.employee_id = e.id
GROUP BY e.id, e.name
ORDER BY log_count DESC;`,
    },
    {
      id: '03_hr_attendance.intermediate.05',
      title: '직원별 휴가 신청 수',
      description:
        '모든 직원의 휴가 신청 누적 건수를 보여주세요. 신청 이력이 없는 직원도 0으로 표시되어야 합니다. 이름(name)과 신청 수(leave_count)를 출력하고 신청이 많은 순으로 정렬합니다.',
      hint: 'LEFT JOIN으로 자식 행이 없는 부모도 살리고 그룹별 개수를 세는 패턴입니다.',
      explanation:
        'employees를 기준으로 LEFT JOIN하면 휴가 신청이 없는 직원도 누락되지 않습니다. COUNT(l.id)는 매칭된 행만 세므로 0이 자연스럽게 처리됩니다.',
      relatedTables: ['employees', 'leave_requests'],
      sql: `SELECT e.name, COUNT(l.id) AS leave_count
FROM employees e
LEFT JOIN leave_requests l ON l.employee_id = e.id
GROUP BY e.id, e.name
ORDER BY leave_count DESC;`,
    },
    {
      id: '03_hr_attendance.intermediate.06',
      title: '승인된 휴가와 부서',
      description:
        '승인된 휴가 신청을 부서·직원 정보와 함께 보여주세요. 부서명(department_name), 직원명(employee_name), 휴가 종류(leave_type), 시작일(start_date), 종료일(end_date)을 출력하고 시작일이 빠른 순으로 정렬합니다.',
      hint: '세 테이블을 순차적으로 연결한 뒤 승인 상태만 거르는 패턴입니다.',
      explanation:
        'leave_requests → employees → departments 순으로 JOIN해 부서명을 끌어옵니다. WHERE 조건으로 status가 APPROVED인 행만 남겨 운영 보고용 데이터를 만듭니다.',
      relatedTables: ['departments', 'employees', 'leave_requests'],
      sql: `SELECT d.name AS department_name, e.name AS employee_name, l.leave_type, l.start_date, l.end_date
FROM leave_requests l
JOIN employees e ON e.id = l.employee_id
JOIN departments d ON d.id = e.department_id
WHERE l.status = 'APPROVED'
ORDER BY l.start_date;`,
    },
    {
      id: '03_hr_attendance.intermediate.07',
      title: '월요일 스케줄과 직원',
      description:
        '월요일 근무 스케줄을 직원 이름과 함께 보여주세요. 이름(name), 요일(weekday), 시작 시각(start_time), 종료 시각(end_time)을 출력하고 시작 시각이 빠른 순, 동률이면 이름 순으로 정렬합니다.',
      hint: '두 테이블 조인 후 특정 요일만 거르는 단순 필터 조합입니다.',
      explanation:
        "work_schedules를 employees와 JOIN해 직원명을 표시하고, WHERE weekday = 'MON' 으로 월요일 스케줄만 거릅니다. 다중 정렬 키로 시간표를 보기 좋게 만듭니다.",
      relatedTables: ['employees', 'work_schedules'],
      sql: `SELECT e.name, w.weekday, w.start_time, w.end_time
FROM work_schedules w
JOIN employees e ON e.id = w.employee_id
WHERE w.weekday = 'MON'
ORDER BY w.start_time, e.name;`,
    },
    {
      id: '03_hr_attendance.intermediate.08',
      title: '부서별 이상 근태 수',
      description:
        '부서별로 비정상 근태(지각·결근 등)가 몇 건씩 있었는지 집계해서 보여주세요. 이상 근태가 0건인 부서도 0으로 표시되어야 합니다. 부서명(name)과 이상 근태 수(abnormal_count)를 출력하고 건수가 많은 순으로 정렬합니다.',
      hint: '조인 조건 안에 필터를 넣어 LEFT JOIN 결과를 보존하는 패턴입니다.',
      explanation:
        "필터를 WHERE가 아닌 LEFT JOIN의 ON 절에 넣으면, 매칭이 없는 부서도 결과에 남아 0건으로 집계됩니다. WHERE에 status != 'NORMAL'을 넣으면 0건 부서가 사라지는 점을 주의해야 합니다.",
      relatedTables: ['departments', 'employees', 'attendance_logs'],
      sql: `SELECT d.name, COUNT(a.id) AS abnormal_count
FROM departments d
JOIN employees e ON e.department_id = d.id
LEFT JOIN attendance_logs a ON a.employee_id = e.id AND a.status != 'NORMAL'
GROUP BY d.id, d.name
ORDER BY abnormal_count DESC;`,
    },
    {
      id: '03_hr_attendance.intermediate.09',
      title: '휴가 대기 직원',
      description:
        '아직 승인되지 않은 휴가(대기 상태) 신청을 직원 이름과 함께 보여주세요. 이름(name), 휴가 종류(leave_type), 시작일(start_date)을 출력하고 시작일이 빠른 순으로 정렬합니다.',
      hint: '두 테이블 조인 후 특정 상태값만 거르는 패턴입니다.',
      explanation:
        "leave_requests와 employees를 JOIN해 신청자 이름을 붙이고, status = 'PENDING' 조건으로 결재 대기 행만 남깁니다. 결재자에게 알림용 리스트를 만들 때 활용됩니다.",
      relatedTables: ['employees', 'leave_requests'],
      sql: `SELECT e.name, l.leave_type, l.start_date
FROM leave_requests l
JOIN employees e ON e.id = l.employee_id
WHERE l.status = 'PENDING'
ORDER BY l.start_date;`,
    },
    {
      id: '03_hr_attendance.intermediate.10',
      title: '부서별 고연봉 직원 수',
      description:
        '연봉이 4,800만원 이상인 직원이 부서별로 몇 명인지 집계해서 보여주세요. 부서명(name)과 고연봉 직원 수(high_salary_count)를 출력하고 인원이 많은 순으로 정렬합니다.',
      hint: '조인 후 임계값으로 필터링한 결과를 부서별로 묶어 집계합니다.',
      explanation:
        'WHERE e.salary >= 48000000 으로 고연봉 행만 남긴 뒤 부서 단위로 GROUP BY하면 부서별 고연봉 인원이 산출됩니다. 0명인 부서를 포함하려면 LEFT JOIN과 ON절 필터로 바꿔야 합니다.',
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
      id: '03_hr_attendance.advanced.01',
      title: '부서별 근태 리스크 점수',
      description:
        '부서별 근태 리스크 점수를 계산해서 보여주세요. 지각은 1점, 결근은 3점, 그 외는 0점으로 환산해 부서별 합계를 냅니다. 부서명(name)과 리스크 점수(risk_score)를 출력하고 점수가 높은 순으로 정렬합니다.',
      hint: '상태별 가중치를 CASE 식으로 부여하고 그룹별로 합산하는 패턴입니다.',
      explanation:
        'CASE WHEN ... THEN ... 으로 상태값을 점수로 변환한 뒤 SUM으로 합산합니다. LEFT JOIN을 쓰면 로그가 없는 부서도 0점으로 결과에 남습니다.',
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
      id: '03_hr_attendance.advanced.02',
      title: '직원별 평균 출근 시각',
      description:
        '직원별 평균 출근 시각을 "0시 기준 분"으로 환산해서 보여주세요(예: 09:30 → 570). 이름(name)과 평균 출근 분(avg_clock_in_minutes)을 출력하고 일찍 출근하는 직원부터 정렬합니다.',
      hint: '시간 문자열에서 시·분을 뽑아 분 단위 숫자로 변환한 뒤 평균을 내는 패턴입니다.',
      explanation:
        "strftime('%H', ...)과 strftime('%M', ...)으로 시·분을 추출하고, 시 * 60 + 분 식으로 분 단위 숫자를 만든 뒤 AVG로 평균을 냅니다. 시간 데이터를 비교 가능한 숫자로 정규화하는 전형적인 방식입니다.",
      relatedTables: ['employees', 'attendance_logs'],
      sql: `SELECT e.name, ROUND(AVG(strftime('%H', a.clock_in) * 60 + strftime('%M', a.clock_in)), 1) AS avg_clock_in_minutes
FROM employees e
JOIN attendance_logs a ON a.employee_id = e.id
WHERE a.clock_in IS NOT NULL
GROUP BY e.id, e.name
ORDER BY avg_clock_in_minutes;`,
    },
    {
      id: '03_hr_attendance.advanced.03',
      title: '근무 기록 없는 직원',
      description:
        '근태 로그가 한 건도 없는 직원만 찾아서 보여주세요. 직원ID(id)와 이름(name)을 출력하고 직원ID 순으로 정렬합니다.',
      hint: 'LEFT JOIN 후 매칭이 없는 행만 남기는 안티조인 패턴입니다.',
      explanation:
        'LEFT JOIN으로 모든 직원을 살린 뒤 WHERE a.id IS NULL 로 매칭된 로그가 없는 직원만 남기는 anti-join 기법입니다. NOT EXISTS / NOT IN 서브쿼리로도 같은 결과를 낼 수 있습니다.',
      relatedTables: ['employees', 'attendance_logs'],
      sql: `SELECT e.id, e.name
FROM employees e
LEFT JOIN attendance_logs a ON a.employee_id = e.id
WHERE a.id IS NULL
ORDER BY e.id;`,
    },
    {
      id: '03_hr_attendance.advanced.04',
      title: '부서별 연봉 순위',
      description:
        '각 부서 안에서 연봉이 높은 순으로 순위를 매겨 보여주세요. 부서명(department_name), 직원명(employee_name), 연봉(salary), 부서 내 순위(salary_rank)를 출력하고 부서명, 순위 순으로 정렬합니다.',
      hint: '그룹별로 순위를 매기는 윈도우 함수 패턴입니다.',
      explanation:
        'RANK() OVER (PARTITION BY d.id ORDER BY e.salary DESC) 는 부서 단위로 행을 나눠 연봉 내림차순 순위를 부여합니다. 동률은 같은 순위가 매겨지고 다음 순위는 건너뜁니다(예: 1,1,3).',
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
      id: '03_hr_attendance.advanced.05',
      title: '휴가 일수 계산',
      description:
        '각 휴가 신청의 사용 일수(시작일과 종료일을 모두 포함)를 계산해서 보여주세요. 이름(name), 휴가 종류(leave_type), 상태(status), 휴가 일수(leave_days)를 출력하고 일수가 많은 순으로 정렬합니다.',
      hint: '두 날짜의 차이를 계산해 일수로 변환하는 패턴입니다.',
      explanation:
        'julianday() 함수는 날짜를 연속된 숫자로 바꿔주므로 두 날짜의 차이를 일수로 쉽게 구할 수 있습니다. 양 끝 날짜를 포함하려면 +1을 더해야 합니다.',
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
      id: '03_hr_attendance.advanced.06',
      title: '일자별 정상 근태율',
      description:
        '날짜별 전체 근태 로그 수, 정상 로그 수, 정상 근태율(%)을 계산해서 보여주세요. 근무일(work_date), 전체 건수(total_logs), 정상 건수(normal_count), 정상율(normal_rate, 소수 1자리)을 출력하고 날짜가 빠른 순으로 정렬합니다.',
      hint: '조건부 카운팅(CASE)과 전체 카운트를 나눠 비율을 산출하는 패턴입니다.',
      explanation:
        "SUM(CASE WHEN status = 'NORMAL' THEN 1 ELSE 0 END) 형태로 조건부 카운팅을 하고, COUNT(*)로 나눠 비율을 구합니다. 정수 나눗셈을 피하려면 100.0처럼 실수를 곱해야 합니다.",
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
      id: '03_hr_attendance.advanced.07',
      title: '스케줄 대비 늦은 출근',
      description:
        '직원의 실제 출근 시각이 예정된 근무 시작 시각보다 늦은 경우만 찾아서 보여주세요. 이름(name), 근무일(work_date), 예정 시작 시각(start_time), 실제 출근 시각(clock_in)을 출력하고 근무일·출근 시각 순으로 정렬합니다.',
      hint: '세 테이블을 연결하고 시간 컬럼끼리 비교하는 패턴입니다.',
      explanation:
        '근태 로그·직원·스케줄을 JOIN해 같은 직원의 예정 시간과 실제 출근 시간을 한 행에 모은 뒤, clock_in > start_time 조건으로 늦은 행만 추립니다. 시간 문자열은 사전순 비교가 시각 비교와 동일하게 동작합니다.',
      relatedTables: ['employees', 'attendance_logs', 'work_schedules'],
      sql: `SELECT e.name, a.work_date, w.start_time, a.clock_in
FROM attendance_logs a
JOIN employees e ON e.id = a.employee_id
JOIN work_schedules w ON w.employee_id = e.id
WHERE a.clock_in > w.start_time
ORDER BY a.work_date, a.clock_in;`,
    },
    {
      id: '03_hr_attendance.advanced.08',
      title: '휴가 승인과 결근 연결',
      description:
        '결근으로 기록된 근태 로그에 대해, 같은 직원·같은 날짜에 승인된 휴가가 있었는지 함께 보여주세요. 이름(name), 근무일(work_date), 근태 상태(status), 휴가 종류(leave_type), 휴가 상태(leave_status)를 출력하고 근무일이 빠른 순으로 정렬합니다.',
      hint: '조인 조건에 날짜 범위 비교(BETWEEN)와 상태 필터를 함께 넣는 패턴입니다.',
      explanation:
        '결근 로그를 기준으로 LEFT JOIN을 걸면서 ON절에서 날짜가 휴가 기간 안에 포함되는지(BETWEEN) 그리고 휴가가 APPROVED 상태인지를 동시에 검사합니다. 매칭이 없으면 leave_type이 NULL로 남아 "정당한 결근인지" 구분할 수 있습니다.',
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
      id: '03_hr_attendance.advanced.09',
      title: '부서별 인건비 비중',
      description:
        '부서별 인건비 총액과, 전체 인건비에서 차지하는 비중(%)을 계산해서 보여주세요. 부서명(name), 인건비 합계(salary_total), 비중(salary_share, 소수 1자리)을 출력하고 비중이 높은 순으로 정렬합니다.',
      hint: 'CTE로 부서별 합계를 만든 뒤 전체 합계 윈도우 함수로 비중을 구하는 패턴입니다.',
      explanation:
        'WITH 절(CTE)로 부서별 합계를 먼저 만들고, SUM(...) OVER () 윈도우 함수로 전체 합계를 한 행씩 펼쳐 비중을 계산합니다. 2단계 집계를 깔끔하게 표현하는 정석 기법입니다.',
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
      id: '03_hr_attendance.advanced.10',
      title: '직원 근태 종합표',
      description:
        '각 직원의 부서, 누적 근태 로그 수, 누적 휴가 신청 수를 한 줄로 정리한 종합표를 보여주세요. 부서명(department_name), 이름(name), 근태 로그 수(attendance_count), 휴가 신청 수(leave_count)를 출력하고 부서명·이름 순으로 정렬합니다.',
      hint: '여러 자식 테이블을 LEFT JOIN으로 붙일 때 중복 카운팅을 막는 DISTINCT 집계 패턴입니다.',
      explanation:
        '한 직원에 근태 로그와 휴가 신청을 동시에 LEFT JOIN하면 두 자식 테이블의 카티전 결합으로 행이 부풀려집니다. COUNT(DISTINCT a.id), COUNT(DISTINCT l.id)를 써서 각 테이블의 실제 행 수만 세야 합니다.',
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
