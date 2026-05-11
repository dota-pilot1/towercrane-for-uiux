-- @title 정산/환불/미수금 세트
-- @slug finance-reconciliation
-- @level advanced
-- @description 가맹점, 주문, 결제, 환불, 정산, 수수료, 미수금으로 운영 정산 검증 쿼리를 연습합니다.
-- @topics CTE, WINDOW, RECONCILIATION, SUM, DIFFERENCE
-- @tables merchants, orders, payments, refunds, settlements, fees, receivables
-- @recommendedQueries SELECT m.name, SUM(p.amount) AS paid_amount FROM merchants m JOIN orders o ON o.merchant_id = m.id JOIN payments p ON p.order_id = o.id WHERE p.status = 'APPROVED' GROUP BY m.id; | SELECT order_id, SUM(amount) AS refund_total FROM refunds GROUP BY order_id; | SELECT merchant_id, settlement_month, expected_amount, settled_amount, expected_amount - settled_amount AS diff FROM settlements;

PRAGMA foreign_keys = ON;

CREATE TABLE merchants (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  fee_rate REAL NOT NULL,
  settlement_day INTEGER NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  merchant_id INTEGER NOT NULL,
  order_no TEXT NOT NULL UNIQUE,
  order_amount INTEGER NOT NULL,
  ordered_at TEXT NOT NULL,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  approved_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE refunds (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  payment_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  refunded_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE TABLE settlements (
  id INTEGER PRIMARY KEY,
  merchant_id INTEGER NOT NULL,
  settlement_month TEXT NOT NULL,
  expected_amount INTEGER NOT NULL,
  settled_amount INTEGER NOT NULL,
  settled_at TEXT,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE TABLE fees (
  id INTEGER PRIMARY KEY,
  payment_id INTEGER NOT NULL,
  fee_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE TABLE receivables (
  id INTEGER PRIMARY KEY,
  merchant_id INTEGER NOT NULL,
  order_id INTEGER,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  due_date TEXT NOT NULL,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

INSERT INTO merchants (id, name, fee_rate, settlement_day) VALUES
(1, '다온마켓', 0.032, 10),
(2, '푸른문구', 0.028, 15),
(3, '케어푸드', 0.035, 10);

INSERT INTO orders (id, merchant_id, order_no, order_amount, ordered_at) VALUES
(1, 1, 'O-202609-001', 120000, '2026-09-01'),
(2, 1, 'O-202609-002', 80000, '2026-09-03'),
(3, 2, 'O-202609-003', 45000, '2026-09-04'),
(4, 3, 'O-202609-004', 210000, '2026-09-05');

INSERT INTO payments (id, order_id, amount, method, status, approved_at) VALUES
(1, 1, 120000, 'CARD', 'APPROVED', '2026-09-01 10:00'),
(2, 2, 80000, 'CARD', 'APPROVED', '2026-09-03 11:00'),
(3, 3, 45000, 'TRANSFER', 'APPROVED', '2026-09-04 12:00'),
(4, 4, 210000, 'CARD', 'APPROVED', '2026-09-05 13:00');

INSERT INTO refunds (id, order_id, payment_id, amount, reason, refunded_at) VALUES
(1, 2, 2, 30000, '부분 취소', '2026-09-06'),
(2, 4, 4, 10000, '배송 지연 보상', '2026-09-07');

INSERT INTO settlements (id, merchant_id, settlement_month, expected_amount, settled_amount, settled_at) VALUES
(1, 1, '2026-09', 164600, 160000, '2026-10-10'),
(2, 2, '2026-09', 43740, 43740, '2026-10-15'),
(3, 3, '2026-09', 192650, 190000, '2026-10-10');

INSERT INTO fees (id, payment_id, fee_type, amount) VALUES
(1, 1, 'CARD_FEE', 3840),
(2, 2, 'CARD_FEE', 2560),
(3, 3, 'TRANSFER_FEE', 1260),
(4, 4, 'CARD_FEE', 7350);

INSERT INTO receivables (id, merchant_id, order_id, amount, status, due_date) VALUES
(1, 1, 1, 4600, 'OPEN', '2026-10-20'),
(2, 3, 4, 2650, 'OPEN', '2026-10-20'),
(3, 2, NULL, 0, 'CLOSED', '2026-10-15');
