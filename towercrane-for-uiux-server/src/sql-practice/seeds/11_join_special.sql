-- @title JOIN 집중 연습 세트
-- @slug join-special
-- @level intermediate
-- @description 직원·부서·프로젝트·클라이언트·회의 7개 테이블로 INNER/LEFT/SELF/다중/집계 JOIN을 단계별로 연습합니다. 의도적으로 누락된 데이터가 포함되어 있어 LEFT JOIN + IS NULL 패턴까지 실습 가능합니다.
-- @topics INNER JOIN, LEFT JOIN, SELF JOIN, MULTI JOIN, GROUP BY, HAVING, SUBQUERY, CASE
-- @tables departments, employees, clients, projects, project_members, meetings, meeting_attendees
-- @recommendedQueries SELECT e.name, d.name AS dept, d.location FROM employees e JOIN departments d ON d.id = e.dept_id ORDER BY d.name, e.name; | SELECT e.name AS employee, m.name AS manager, e.role FROM employees e LEFT JOIN employees m ON m.id = e.manager_id ORDER BY m.name NULLS FIRST, e.name; | SELECT e.name, d.name AS dept FROM employees e JOIN departments d ON d.id = e.dept_id LEFT JOIN project_members pm ON pm.employee_id = e.id WHERE pm.id IS NULL; | SELECT d.name, COUNT(e.id) AS headcount, AVG(e.salary) AS avg_salary FROM departments d JOIN employees e ON e.dept_id = d.id GROUP BY d.id ORDER BY avg_salary DESC; | SELECT p.name, COUNT(pm.employee_id) AS member_count FROM projects p JOIN project_members pm ON pm.project_id = p.id GROUP BY p.id HAVING member_count >= 3 ORDER BY member_count DESC;

PRAGMA foreign_keys = ON;

-- ─── 테이블 정의 ────────────────────────────────────────────────────────────

CREATE TABLE departments (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL,
  location TEXT NOT NULL,
  budget   INTEGER NOT NULL
);

CREATE TABLE employees (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  dept_id    INTEGER NOT NULL,
  manager_id INTEGER,                   -- NULL = 최상위 (CEO)
  role       TEXT NOT NULL,
  salary     INTEGER NOT NULL,
  hire_date  TEXT NOT NULL,
  is_active  INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (dept_id)    REFERENCES departments(id),
  FOREIGN KEY (manager_id) REFERENCES employees(id)
);

CREATE TABLE clients (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  industry       TEXT NOT NULL,
  country        TEXT NOT NULL,
  contract_since TEXT NOT NULL
);

CREATE TABLE projects (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  dept_id    INTEGER NOT NULL,
  client_id  INTEGER,                   -- NULL = 사내 프로젝트
  status     TEXT NOT NULL,             -- PLANNING | IN_PROGRESS | DONE | CANCELLED
  start_date TEXT NOT NULL,
  end_date   TEXT,
  budget     INTEGER NOT NULL,
  FOREIGN KEY (dept_id)   REFERENCES departments(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE project_members (
  id          INTEGER PRIMARY KEY,
  project_id  INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  role        TEXT NOT NULL,            -- PM | DEV | DESIGNER | QA | ANALYST
  joined_at   TEXT NOT NULL,
  FOREIGN KEY (project_id)  REFERENCES projects(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE meetings (
  id         INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  title      TEXT NOT NULL,
  held_at    TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE meeting_attendees (
  id          INTEGER PRIMARY KEY,
  meeting_id  INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  attended    INTEGER NOT NULL DEFAULT 1, -- 1=참석 0=불참
  FOREIGN KEY (meeting_id)  REFERENCES meetings(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ─── 데이터 ─────────────────────────────────────────────────────────────────

INSERT INTO departments (id, name, location, budget) VALUES
(1, '개발팀',   '서울', 150000000),
(2, '기획팀',   '서울',  80000000),
(3, '영업팀',   '부산', 120000000),
(4, '디자인팀', '서울',  60000000),
(5, 'QA팀',     '대전',  50000000),
(6, '인프라팀', '서울',  90000000);

-- manager_id NULL = CEO / 팀원은 각 팀장 참조
-- 직원 1·6·13·14·15 는 어떤 프로젝트에도 배정되지 않음 (LEFT JOIN IS NULL 연습)
INSERT INTO employees (id, name, dept_id, manager_id, role, salary, hire_date) VALUES
(1,  '박대표',   1, NULL, 'CEO',    12000000, '2018-01-15'),
(2,  '김개발',   1,    1, '팀장',   7000000,  '2019-03-01'),
(3,  '이기획',   2,    1, '팀장',   6500000,  '2019-05-10'),
(4,  '최영업',   3,    1, '팀장',   6000000,  '2019-07-01'),
(5,  '정디자인', 4,    1, '팀장',   5800000,  '2020-01-10'),
(6,  '한QA',     5,    1, '팀장',   5500000,  '2020-02-15'),
(7,  '송인프라', 6,    1, '팀장',   6200000,  '2019-11-01'),
(8,  '오백엔드', 1,    2, '시니어', 4800000,  '2020-06-01'),
(9,  '윤프론트', 1,    2, '시니어', 4500000,  '2021-01-15'),
(10, '강기획',   2,    3, '주임',   3800000,  '2021-03-10'),
(11, '임영업',   3,    4, '주임',   3500000,  '2022-01-05'),
(12, '조디자인', 4,    5, '주임',   3600000,  '2022-04-01'),
(13, '권QA',     5,    6, '주임',   3300000,  '2022-07-01'),
(14, '남신입',   1,    2, '신입',   3000000,  '2023-09-01'),
(15, '류인턴',   2,    3, '인턴',   2500000,  '2024-03-01');

INSERT INTO clients (id, name, industry, country, contract_since) VALUES
(1, '삼성전자',   'IT',   '한국', '2020-01-01'),
(2, '현대자동차', '제조', '한국', '2021-06-01'),
(3, '카카오',     'IT',   '한국', '2022-01-01'),
(4, 'LG화학',     '화학', '한국', '2020-09-01'),
(5, '네이버',     'IT',   '한국', '2023-01-01');

-- client_id NULL = 사내 프로젝트 (프로젝트 5·7)
-- 프로젝트 5·6·7·8 은 회의 없음 (meetings LEFT JOIN IS NULL 연습)
INSERT INTO projects (id, name, dept_id, client_id, status, start_date, end_date, budget) VALUES
(1, '삼성 포털 개발',        1, 1,    'DONE',        '2022-01-01', '2022-12-31', 200000000),
(2, '현대 ERP 구축',         1, 2,    'IN_PROGRESS',  '2023-06-01', NULL,        350000000),
(3, '카카오 분석 시스템',     2, 3,    'IN_PROGRESS',  '2023-09-01', NULL,        150000000),
(4, 'LG 물류 시스템',        3, 4,    'DONE',         '2022-06-01', '2023-03-31', 180000000),
(5, '사내 DevOps 환경 구축', 6, NULL, 'IN_PROGRESS',  '2024-01-01', NULL,         50000000),
(6, '네이버 커머스 플랫폼',  1, 5,    'PLANNING',     '2024-07-01', NULL,        400000000),
(7, '사내 디자인 시스템',    4, NULL, 'DONE',         '2023-01-01', '2023-06-30', 30000000),
(8, '카카오 모바일앱',       1, 3,    'PLANNING',     '2024-10-01', NULL,        250000000);

-- 직원 1(CEO)·6(한QA)·13·14·15 는 배정 없음
INSERT INTO project_members (id, project_id, employee_id, role, joined_at) VALUES
(1,  1, 2,  'PM',       '2022-01-01'),
(2,  1, 8,  'DEV',      '2022-01-01'),
(3,  1, 9,  'DEV',      '2022-01-15'),
(4,  1, 5,  'DESIGNER', '2022-02-01'),
(5,  2, 2,  'PM',       '2023-06-01'),
(6,  2, 8,  'DEV',      '2023-06-01'),
(7,  2, 9,  'DEV',      '2023-07-01'),
(8,  2, 10, 'ANALYST',  '2023-06-15'),
(9,  3, 3,  'PM',       '2023-09-01'),
(10, 3, 10, 'ANALYST',  '2023-09-01'),
(11, 3, 9,  'DEV',      '2023-10-01'),
(12, 4, 4,  'PM',       '2022-06-01'),
(13, 4, 11, 'ANALYST',  '2022-06-01'),
(14, 4, 8,  'DEV',      '2022-07-01'),
(15, 5, 7,  'PM',       '2024-01-01'),
(16, 6, 2,  'PM',       '2024-07-01'),
(17, 6, 9,  'DEV',      '2024-07-01'),
(18, 7, 5,  'PM',       '2023-01-01'),
(19, 7, 12, 'DESIGNER', '2023-01-01'),
(20, 8, 2,  'PM',       '2024-10-01'),
(21, 8, 8,  'DEV',      '2024-10-01');

-- 프로젝트 1·2·3·4 만 회의 있음 / 5·6·7·8 은 없음
INSERT INTO meetings (id, project_id, title, held_at) VALUES
(1, 1, '킥오프 미팅',        '2022-01-05 10:00:00'),
(2, 1, '중간 점검',          '2022-06-10 14:00:00'),
(3, 1, '최종 납품 리뷰',     '2022-12-15 10:00:00'),
(4, 2, '착수 회의',          '2023-06-05 09:00:00'),
(5, 2, '1차 중간 보고',      '2023-09-20 14:00:00'),
(6, 3, '요구사항 분석 회의', '2023-09-10 10:00:00'),
(7, 3, '아키텍처 리뷰',      '2023-11-15 14:00:00'),
(8, 4, '프로젝트 착수',      '2022-06-10 10:00:00'),
(9, 4, '완료 보고',          '2023-03-20 14:00:00');

-- attended=0 은 불참 (불참자 패턴 분석 연습)
INSERT INTO meeting_attendees (id, meeting_id, employee_id, attended) VALUES
(1,  1, 2,  1),
(2,  1, 8,  1),
(3,  1, 9,  1),
(4,  1, 5,  1),
(5,  2, 2,  1),
(6,  2, 8,  0),  -- 불참
(7,  2, 9,  1),
(8,  3, 2,  1),
(9,  3, 8,  1),
(10, 3, 9,  1),
(11, 3, 5,  0),  -- 불참
(12, 4, 2,  1),
(13, 4, 8,  1),
(14, 4, 9,  1),
(15, 4, 10, 1),
(16, 5, 2,  1),
(17, 5, 8,  0),  -- 불참
(18, 5, 10, 0),  -- 불참
(19, 6, 3,  1),
(20, 6, 10, 1),
(21, 6, 9,  1),
(22, 7, 3,  1),
(23, 7, 10, 1),
(24, 7, 9,  0),  -- 불참
(25, 8, 4,  1),
(26, 8, 11, 1),
(27, 8, 8,  1),
(28, 9, 4,  1),
(29, 9, 11, 1),
(30, 9, 8,  0);  -- 불참
