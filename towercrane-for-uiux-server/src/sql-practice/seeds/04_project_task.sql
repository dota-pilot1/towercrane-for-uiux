-- @title SI 프로젝트/업무 세트
-- @slug project-task
-- @level basic
-- @description 고객사, 프로젝트, 멤버, 업무, 댓글, 상태 로그로 프로젝트 관리 쿼리를 연습합니다.
-- @topics MULTI JOIN, GROUP BY, HAVING, CASE, DATE FILTER
-- @tables clients, projects, members, project_members, tasks, task_comments, task_logs
-- @recommendedQueries SELECT p.name, COUNT(t.id) AS task_count FROM projects p LEFT JOIN tasks t ON t.project_id = p.id GROUP BY p.id; | SELECT m.name, COUNT(t.id) AS assigned_tasks FROM members m LEFT JOIN tasks t ON t.assignee_id = m.id GROUP BY m.id; | SELECT title, due_date FROM tasks WHERE status != 'DONE' AND due_date < '2026-04-15';

PRAGMA foreign_keys = ON;

CREATE TABLE clients (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  contact_name TEXT NOT NULL
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE members (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE project_members (
  project_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  duty TEXT NOT NULL,
  PRIMARY KEY (project_id, member_id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  assignee_id INTEGER,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  due_date TEXT,
  estimate_hours INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (assignee_id) REFERENCES members(id)
);

CREATE TABLE task_comments (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE task_logs (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

INSERT INTO clients (id, name, industry, contact_name) VALUES
(1, '한빛물류', '물류', '김부장'),
(2, '그린병원', '의료', '박팀장'),
(3, '서울교육재단', '교육', '이과장');

INSERT INTO projects (id, client_id, name, status, started_at, ended_at) VALUES
(1, 1, 'WMS 고도화', 'ACTIVE', '2026-01-10', NULL),
(2, 2, '예약 시스템 구축', 'ACTIVE', '2026-02-01', NULL),
(3, 3, '학습 포털 리뉴얼', 'DONE', '2025-10-01', '2026-01-31');

INSERT INTO members (id, name, role, email) VALUES
(1, '조현수', 'PM', 'pm@example.com'),
(2, '문서연', 'BACKEND', 'backend@example.com'),
(3, '안지호', 'FRONTEND', 'frontend@example.com'),
(4, '백유리', 'QA', 'qa@example.com'),
(5, '김라온', 'DEVOPS', 'devops@example.com');

INSERT INTO project_members (project_id, member_id, duty) VALUES
(1, 1, '관리'),
(1, 2, 'API'),
(1, 3, '화면'),
(2, 1, '관리'),
(2, 2, '배치'),
(2, 4, '검수');

INSERT INTO tasks (id, project_id, assignee_id, title, status, priority, due_date, estimate_hours) VALUES
(1, 1, 2, '입고 API 개발', 'IN_PROGRESS', 'HIGH', '2026-04-10', 16),
(2, 1, 3, '재고 현황 화면', 'TODO', 'MEDIUM', '2026-04-18', 20),
(3, 1, 4, '출고 회귀 테스트', 'TODO', 'LOW', '2026-04-20', 8),
(4, 2, 2, '예약 알림 배치', 'IN_REVIEW', 'HIGH', '2026-04-12', 12),
(5, 2, 4, '권한 테스트 케이스 작성', 'DONE', 'MEDIUM', '2026-04-05', 6),
(6, 3, 3, '메인 페이지 반응형 수정', 'DONE', 'LOW', '2026-01-20', 10),
(7, 2, NULL, '운영 대시보드 요구사항 정리', 'TODO', 'MEDIUM', '2026-04-16', 6);

INSERT INTO task_comments (id, task_id, member_id, content, created_at) VALUES
(1, 1, 1, '고객사 검수 일정 앞당겨졌습니다.', '2026-04-01'),
(2, 1, 2, '입고 취소 케이스 추가하겠습니다.', '2026-04-02'),
(3, 4, 4, '알림 중복 발송 케이스 확인 필요합니다.', '2026-04-03');

INSERT INTO task_logs (id, task_id, from_status, to_status, changed_at) VALUES
(1, 1, 'TODO', 'IN_PROGRESS', '2026-04-01'),
(2, 4, 'TODO', 'IN_PROGRESS', '2026-04-02'),
(3, 4, 'IN_PROGRESS', 'IN_REVIEW', '2026-04-06'),
(4, 5, 'IN_REVIEW', 'DONE', '2026-04-05');
