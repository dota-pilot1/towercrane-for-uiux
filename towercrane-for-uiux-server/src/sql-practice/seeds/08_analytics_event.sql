-- @title 로그/이벤트 분석 세트
-- @slug analytics-event
-- @level intermediate
-- @description 사용자, 세션, 페이지, 캠페인, 디바이스, 이벤트로 방문과 전환 분석 쿼리를 연습합니다.
-- @topics EVENT ANALYTICS, GROUP BY, DISTINCT, FUNNEL, DATE
-- @tables users, sessions, events, pages, campaigns, devices
-- @recommendedQueries SELECT date(started_at) AS visit_date, COUNT(DISTINCT user_id) AS users FROM sessions GROUP BY date(started_at); | SELECT event_name, COUNT(*) AS event_count FROM events GROUP BY event_name ORDER BY event_count DESC; | SELECT c.name, COUNT(s.id) AS sessions FROM campaigns c LEFT JOIN sessions s ON s.campaign_id = c.id GROUP BY c.id;

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  signed_up_at TEXT NOT NULL,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE campaigns (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  started_at TEXT NOT NULL
);

CREATE TABLE devices (
  id INTEGER PRIMARY KEY,
  device_type TEXT NOT NULL,
  os TEXT NOT NULL,
  browser TEXT NOT NULL
);

CREATE TABLE pages (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  page_group TEXT NOT NULL
);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  campaign_id INTEGER,
  device_id INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL,
  page_id INTEGER NOT NULL,
  event_name TEXT NOT NULL,
  event_value INTEGER,
  occurred_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (page_id) REFERENCES pages(id)
);

INSERT INTO users (id, email, signed_up_at, marketing_opt_in) VALUES
(1, 'alpha@example.com', '2026-08-01', 1),
(2, 'bravo@example.com', '2026-08-02', 0),
(3, 'charlie@example.com', '2026-08-04', 1);

INSERT INTO campaigns (id, name, channel, started_at) VALUES
(1, '여름 할인', 'PAID_SEARCH', '2026-08-01'),
(2, '뉴스레터 8월', 'EMAIL', '2026-08-05'),
(3, 'SNS 리타겟팅', 'SOCIAL', '2026-08-07');

INSERT INTO devices (id, device_type, os, browser) VALUES
(1, 'MOBILE', 'iOS', 'Safari'),
(2, 'DESKTOP', 'Windows', 'Chrome'),
(3, 'MOBILE', 'Android', 'Chrome');

INSERT INTO pages (id, path, page_group) VALUES
(1, '/', 'HOME'),
(2, '/pricing', 'PRICING'),
(3, '/signup', 'AUTH'),
(4, '/checkout', 'ORDER');

INSERT INTO sessions (id, user_id, campaign_id, device_id, started_at, ended_at) VALUES
(1, 1, 1, 1, '2026-08-10 09:00', '2026-08-10 09:08'),
(2, 2, 2, 2, '2026-08-10 10:00', '2026-08-10 10:05'),
(3, NULL, 1, 3, '2026-08-11 11:00', '2026-08-11 11:02'),
(4, 3, 3, 2, '2026-08-11 13:30', '2026-08-11 13:45'),
(5, 1, NULL, 1, '2026-08-12 08:40', '2026-08-12 08:50');

INSERT INTO events (id, session_id, page_id, event_name, event_value, occurred_at) VALUES
(1, 1, 1, 'page_view', NULL, '2026-08-10 09:00'),
(2, 1, 2, 'page_view', NULL, '2026-08-10 09:02'),
(3, 1, 3, 'signup_submit', 1, '2026-08-10 09:06'),
(4, 2, 1, 'page_view', NULL, '2026-08-10 10:00'),
(5, 2, 2, 'pricing_click', 1, '2026-08-10 10:03'),
(6, 3, 1, 'page_view', NULL, '2026-08-11 11:00'),
(7, 4, 4, 'purchase', 79000, '2026-08-11 13:42'),
(8, 5, 2, 'page_view', NULL, '2026-08-12 08:43');
