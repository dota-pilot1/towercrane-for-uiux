-- @title 예약/일정/리소스 세트
-- @slug reservation-schedule
-- @level basic
-- @description 리소스, 고객, 예약, 예약 항목, 차단 기간, 점검 일정으로 예약 가능성과 기간 조건을 연습합니다.
-- @topics DATE RANGE, JOIN, COUNT, CASE, LEFT JOIN
-- @tables resources, customers, reservations, reservation_items, blackout_periods, resource_maintenance
-- @recommendedQueries SELECT * FROM reservations WHERE status = 'CONFIRMED'; | SELECT r.name, COUNT(ri.id) AS booking_count FROM resources r LEFT JOIN reservation_items ri ON ri.resource_id = r.id GROUP BY r.id; | SELECT resource_id, starts_at, ends_at FROM blackout_periods WHERE starts_at <= '2026-05-10 10:00' AND ends_at >= '2026-05-10 09:00';

PRAGMA foreign_keys = ON;

CREATE TABLE resources (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  memo TEXT
);

CREATE TABLE reservations (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE reservation_items (
  id INTEGER PRIMARY KEY,
  reservation_id INTEGER NOT NULL,
  resource_id INTEGER NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  price INTEGER NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

CREATE TABLE blackout_periods (
  id INTEGER PRIMARY KEY,
  resource_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

CREATE TABLE resource_maintenance (
  id INTEGER PRIMARY KEY,
  resource_id INTEGER NOT NULL,
  manager_name TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

INSERT INTO resources (id, name, resource_type, capacity, is_active) VALUES
(1, 'A 회의실', 'ROOM', 8, 1),
(2, 'B 세미나실', 'ROOM', 24, 1),
(3, '촬영 스튜디오', 'STUDIO', 6, 1),
(4, '프로젝터 1호', 'EQUIPMENT', 1, 1),
(5, '구형 노트북', 'EQUIPMENT', 1, 0),
(6, '이동식 모니터', 'EQUIPMENT', 1, 1);

INSERT INTO customers (id, name, phone, memo) VALUES
(1, '김나래', '010-1111-2222', '정기 이용 고객'),
(2, '이준호', '010-2222-3333', NULL),
(3, '박서윤', '010-3333-4444', '세금계산서 요청'),
(4, '최민석', '010-4444-5555', NULL);

INSERT INTO reservations (id, customer_id, status, requested_at) VALUES
(1, 1, 'CONFIRMED', '2026-05-01 09:00'),
(2, 2, 'CONFIRMED', '2026-05-02 10:00'),
(3, 3, 'CANCELLED', '2026-05-03 11:00'),
(4, 4, 'PENDING', '2026-05-04 12:00');

INSERT INTO reservation_items (id, reservation_id, resource_id, starts_at, ends_at, price) VALUES
(1, 1, 1, '2026-05-10 09:00', '2026-05-10 11:00', 40000),
(2, 1, 4, '2026-05-10 09:00', '2026-05-10 11:00', 10000),
(3, 2, 2, '2026-05-11 14:00', '2026-05-11 17:00', 90000),
(4, 3, 3, '2026-05-12 13:00', '2026-05-12 15:00', 120000),
(5, 4, 1, '2026-05-13 10:00', '2026-05-13 12:00', 40000);

INSERT INTO blackout_periods (id, resource_id, reason, starts_at, ends_at) VALUES
(1, 1, '내부 교육', '2026-05-09 09:00', '2026-05-09 18:00'),
(2, 3, '장비 교체', '2026-05-12 09:00', '2026-05-12 18:00'),
(3, 4, '대여 불가', '2026-05-15 00:00', '2026-05-16 23:59');

INSERT INTO resource_maintenance (id, resource_id, manager_name, checked_at, status) VALUES
(1, 1, '시설팀 김대리', '2026-05-01', 'OK'),
(2, 2, '시설팀 김대리', '2026-05-01', 'OK'),
(3, 3, '영상팀 이대리', '2026-05-02', 'NEEDS_REPAIR'),
(4, 4, 'IT팀 박과장', '2026-05-03', 'OK');
