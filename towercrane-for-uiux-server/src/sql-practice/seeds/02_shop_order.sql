-- @title 쇼핑몰 주문/결제 세트
-- @slug shop-order
-- @level beginner
-- @description 고객, 상품, 주문, 결제, 배송 테이블로 주문 상세와 매출 집계를 연습합니다.
-- @topics JOIN, GROUP BY, SUM, CASE, HAVING
-- @tables customers, products, orders, order_items, payments, shipments
-- @recommendedQueries SELECT * FROM orders ORDER BY ordered_at DESC; | SELECT o.id, c.name, SUM(oi.quantity * oi.unit_price) AS order_total FROM orders o JOIN customers c ON c.id = o.customer_id JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id; | SELECT p.name, SUM(oi.quantity) AS sold_qty FROM products p JOIN order_items oi ON oi.product_id = p.id GROUP BY p.id ORDER BY sold_qty DESC;

PRAGMA foreign_keys = ON;

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grade TEXT NOT NULL,
  joined_at TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock_qty INTEGER NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  ordered_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE,
  method TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  paid_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE shipments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE,
  carrier TEXT NOT NULL,
  status TEXT NOT NULL,
  shipped_at TEXT,
  delivered_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

INSERT INTO customers (id, name, email, grade, joined_at) VALUES
(1, '김하늘', 'sky@example.com', 'VIP', '2025-11-01'),
(2, '문도윤', 'doyoon@example.com', 'BASIC', '2025-12-10'),
(3, '서지아', 'jia@example.com', 'GOLD', '2026-01-04'),
(4, '오현우', 'hyunwoo@example.com', 'BASIC', '2026-01-20');

INSERT INTO products (id, name, category, price, stock_qty) VALUES
(1, '기계식 키보드', 'DIGITAL', 89000, 20),
(2, '무선 마우스', 'DIGITAL', 42000, 35),
(3, '스탠딩 책상', 'FURNITURE', 240000, 8),
(4, '모니터 암', 'FURNITURE', 69000, 15),
(5, 'SQL 입문서', 'BOOK', 28000, 50);

INSERT INTO orders (id, customer_id, status, ordered_at) VALUES
(1, 1, 'PAID', '2026-02-01 10:10:00'),
(2, 2, 'PAID', '2026-02-03 14:20:00'),
(3, 3, 'CANCELLED', '2026-02-05 09:00:00'),
(4, 1, 'SHIPPING', '2026-02-07 16:35:00'),
(5, 4, 'PAID', '2026-02-08 11:15:00');

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 1, 89000),
(2, 1, 2, 1, 42000),
(3, 2, 5, 2, 28000),
(4, 3, 3, 1, 240000),
(5, 4, 4, 2, 69000),
(6, 5, 2, 1, 42000),
(7, 5, 5, 1, 28000);

INSERT INTO payments (id, order_id, method, amount, status, paid_at) VALUES
(1, 1, 'CARD', 131000, 'APPROVED', '2026-02-01 10:12:00'),
(2, 2, 'TRANSFER', 56000, 'APPROVED', '2026-02-03 14:25:00'),
(3, 3, 'CARD', 240000, 'CANCELLED', NULL),
(4, 4, 'CARD', 138000, 'APPROVED', '2026-02-07 16:37:00'),
(5, 5, 'POINT_CARD', 69000, 'APPROVED', '2026-02-08 11:17:00');

INSERT INTO shipments (id, order_id, carrier, status, shipped_at, delivered_at) VALUES
(1, 1, 'CJ대한통운', 'DELIVERED', '2026-02-01 18:00:00', '2026-02-03 12:00:00'),
(2, 2, '우체국택배', 'DELIVERED', '2026-02-04 09:00:00', '2026-02-05 15:00:00'),
(3, 3, 'CJ대한통운', 'CANCELLED', NULL, NULL),
(4, 4, '한진택배', 'IN_TRANSIT', '2026-02-08 08:00:00', NULL),
(5, 5, '우체국택배', 'READY', NULL, NULL);
