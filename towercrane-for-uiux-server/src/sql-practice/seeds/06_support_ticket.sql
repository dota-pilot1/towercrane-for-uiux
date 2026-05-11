-- @title 고객 문의/처리 이력 세트
-- @slug support-ticket
-- @level basic
-- @description 고객, 상담원, 티켓, 메시지, 상태 변경 로그, 태그로 고객지원 운영 쿼리를 연습합니다.
-- @topics JOIN, LATEST STATUS, GROUP BY, AVG, FILTER
-- @tables customers, agents, tickets, ticket_messages, ticket_status_logs, ticket_tags
-- @recommendedQueries SELECT status, COUNT(*) AS ticket_count FROM tickets GROUP BY status; | SELECT a.name, COUNT(t.id) AS assigned_count FROM agents a LEFT JOIN tickets t ON t.agent_id = a.id GROUP BY a.id; | SELECT t.id, t.subject, MAX(l.changed_at) AS last_changed_at FROM tickets t JOIN ticket_status_logs l ON l.ticket_id = t.id GROUP BY t.id;

PRAGMA foreign_keys = ON;

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL
);

CREATE TABLE agents (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  team TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE tickets (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  agent_id INTEGER,
  subject TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE ticket_messages (
  id INTEGER PRIMARY KEY,
  ticket_id INTEGER NOT NULL,
  sender_type TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE ticket_status_logs (
  id INTEGER PRIMARY KEY,
  ticket_id INTEGER NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE ticket_tags (
  id INTEGER PRIMARY KEY,
  ticket_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

INSERT INTO customers (id, name, email, plan) VALUES
(1, '에이콘스터디', 'help@acorn.example', 'PRO'),
(2, '블루상사', 'contact@blue.example', 'BASIC'),
(3, '다온마켓', 'cs@daon.example', 'ENTERPRISE'),
(4, '하늘공방', 'hello@skyshop.example', 'BASIC');

INSERT INTO agents (id, name, team, is_active) VALUES
(1, '김상담', 'TECH', 1),
(2, '이해결', 'BILLING', 1),
(3, '박지원', 'TECH', 1);

INSERT INTO tickets (id, customer_id, agent_id, subject, priority, status, created_at, resolved_at) VALUES
(1, 1, 1, '로그인이 되지 않습니다', 'HIGH', 'RESOLVED', '2026-06-01 09:10', '2026-06-01 11:00'),
(2, 2, 2, '결제 영수증 요청', 'LOW', 'OPEN', '2026-06-02 10:00', NULL),
(3, 3, 1, 'API 응답 지연', 'HIGH', 'IN_PROGRESS', '2026-06-02 13:20', NULL),
(4, 4, NULL, '요금제 변경 문의', 'MEDIUM', 'OPEN', '2026-06-03 08:40', NULL),
(5, 1, 3, '비밀번호 초기화 메일 미수신', 'MEDIUM', 'RESOLVED', '2026-06-03 14:10', '2026-06-03 15:00');

INSERT INTO ticket_messages (id, ticket_id, sender_type, body, created_at) VALUES
(1, 1, 'CUSTOMER', '로그인하면 500 오류가 납니다.', '2026-06-01 09:10'),
(2, 1, 'AGENT', '세션을 초기화했습니다.', '2026-06-01 10:30'),
(3, 2, 'CUSTOMER', '지난달 결제 영수증이 필요합니다.', '2026-06-02 10:00'),
(4, 3, 'CUSTOMER', '주문 조회 API가 느립니다.', '2026-06-02 13:20'),
(5, 3, 'AGENT', '로그 확인 중입니다.', '2026-06-02 13:45');

INSERT INTO ticket_status_logs (id, ticket_id, from_status, to_status, changed_at) VALUES
(1, 1, NULL, 'OPEN', '2026-06-01 09:10'),
(2, 1, 'OPEN', 'RESOLVED', '2026-06-01 11:00'),
(3, 3, NULL, 'OPEN', '2026-06-02 13:20'),
(4, 3, 'OPEN', 'IN_PROGRESS', '2026-06-02 13:40'),
(5, 5, NULL, 'OPEN', '2026-06-03 14:10'),
(6, 5, 'OPEN', 'RESOLVED', '2026-06-03 15:00');

INSERT INTO ticket_tags (id, ticket_id, tag) VALUES
(1, 1, 'login'),
(2, 1, 'bug'),
(3, 2, 'billing'),
(4, 3, 'api'),
(5, 3, 'performance'),
(6, 4, 'plan'),
(7, 5, 'email');
