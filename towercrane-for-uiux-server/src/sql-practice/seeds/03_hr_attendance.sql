-- @title 직원/부서/근태 세트
-- @slug hr-attendance
-- @level beginner
-- @description 부서, 직원, 출퇴근 로그, 휴가 신청, 근무 스케줄로 인사 데이터를 연습합니다.
-- @topics JOIN, DATE, GROUP BY, COUNT, CASE
-- @tables departments, employees, attendance_logs, leave_requests, work_schedules
-- @recommendedQueries SELECT d.name, COUNT(e.id) AS employee_count FROM departments d LEFT JOIN employees e ON e.department_id = d.id GROUP BY d.id; | SELECT e.name, a.work_date, a.status FROM attendance_logs a JOIN employees e ON e.id = a.employee_id WHERE a.status != 'NORMAL'; | SELECT status, COUNT(*) AS request_count FROM leave_requests GROUP BY status;

PRAGMA foreign_keys = ON;

CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  manager_name TEXT,
  location TEXT
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  department_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  hired_at TEXT NOT NULL,
  salary INTEGER NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE attendance_logs (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,
  clock_in TEXT,
  clock_out TEXT,
  status TEXT NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE leave_requests (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE work_schedules (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  weekday TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

INSERT INTO departments (id, name, manager_name, location) VALUES
(1, '개발팀', '김민준', '서울'),
(2, '디자인팀', '이서연', '서울'),
(3, '영업팀', '박도현', '부산'),
(4, '운영팀', '최유진', '대전');

INSERT INTO employees (id, department_id, name, position, hired_at, salary) VALUES
(1, 1, '강태오', '백엔드 개발자', '2024-03-01', 52000000),
(2, 1, '한지민', '프론트엔드 개발자', '2024-06-10', 48000000),
(3, 2, '오수아', '프로덕트 디자이너', '2023-11-20', 50000000),
(4, 3, '윤재혁', '세일즈 매니저', '2025-01-15', 46000000),
(5, 4, '정다은', '운영 담당자', '2025-04-01', 42000000);

INSERT INTO attendance_logs (id, employee_id, work_date, clock_in, clock_out, status) VALUES
(1, 1, '2026-03-02', '09:01', '18:10', 'NORMAL'),
(2, 2, '2026-03-02', '09:45', '18:20', 'LATE'),
(3, 3, '2026-03-02', '08:55', '18:00', 'NORMAL'),
(4, 4, '2026-03-02', NULL, NULL, 'ABSENT'),
(5, 5, '2026-03-02', '09:05', '17:50', 'NORMAL'),
(6, 1, '2026-03-03', '09:00', '18:00', 'NORMAL'),
(7, 2, '2026-03-03', '09:10', '18:30', 'NORMAL');

INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, status) VALUES
(1, 1, 'ANNUAL', '2026-03-10', '2026-03-10', 'APPROVED'),
(2, 2, 'HALF_DAY', '2026-03-12', '2026-03-12', 'PENDING'),
(3, 4, 'SICK', '2026-03-02', '2026-03-03', 'APPROVED'),
(4, 5, 'ANNUAL', '2026-03-20', '2026-03-21', 'REJECTED');

INSERT INTO work_schedules (id, employee_id, weekday, start_time, end_time) VALUES
(1, 1, 'MON', '09:00', '18:00'),
(2, 2, 'MON', '09:00', '18:00'),
(3, 3, 'MON', '09:00', '18:00'),
(4, 4, 'MON', '10:00', '19:00'),
(5, 5, 'MON', '09:00', '18:00');
