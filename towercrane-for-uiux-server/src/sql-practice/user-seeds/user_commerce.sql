-- @title 유저 커머스 운영 DB
-- @slug user-commerce
-- @level basic
-- @description 유저가 직접 SQL 문제를 출제하고 풀기 위한 공용 커머스 운영 데이터베이스입니다.
-- @topics customers, products, orders, payments, shipments, inventory, reviews, coupons
-- @tables customers,categories,products,orders,order_items,payments,shipments,inventory,reviews,coupons,coupon_redemptions
-- @recommendedQueries SELECT * FROM orders ORDER BY ordered_at DESC;|SELECT status, COUNT(*) AS order_count FROM orders GROUP BY status;|SELECT p.name, SUM(oi.quantity) AS sold_quantity FROM order_items oi JOIN products p ON p.id = oi.product_id GROUP BY p.id, p.name ORDER BY sold_quantity DESC;

DROP TABLE IF EXISTS coupon_redemptions;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS shipments;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS customers;

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grade TEXT NOT NULL,
  city TEXT NOT NULL,
  joined_at TEXT NOT NULL
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL,
  launched_at TEXT NOT NULL,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  ordered_at TEXT NOT NULL,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  method TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  paid_at TEXT,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE TABLE shipments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  carrier TEXT NOT NULL,
  status TEXT NOT NULL,
  shipped_at TEXT,
  delivered_at TEXT,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE TABLE inventory (
  product_id INTEGER PRIMARY KEY,
  stock_quantity INTEGER NOT NULL,
  safety_stock INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE reviews (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(customer_id) REFERENCES customers(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE coupons (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL,
  discount_value INTEGER NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE coupon_redemptions (
  id INTEGER PRIMARY KEY,
  coupon_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL,
  redeemed_at TEXT NOT NULL,
  FOREIGN KEY(coupon_id) REFERENCES coupons(id),
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

INSERT INTO customers (id, name, email, grade, city, joined_at) VALUES
  (1, '김민준', 'minjun@example.com', 'VIP', 'Seoul', '2024-01-12'),
  (2, '이서연', 'seoyeon@example.com', 'GOLD', 'Busan', '2024-02-08'),
  (3, '박도윤', 'doyun@example.com', 'SILVER', 'Daegu', '2024-03-03'),
  (4, '최하린', 'harin@example.com', 'BASIC', 'Incheon', '2024-03-28'),
  (5, '정지우', 'jiwoo@example.com', 'VIP', 'Seoul', '2024-04-15'),
  (6, '강서준', 'seojun@example.com', 'GOLD', 'Daejeon', '2024-05-20');

INSERT INTO categories (id, name) VALUES
  (1, 'Electronics'),
  (2, 'Home'),
  (3, 'Beauty'),
  (4, 'Sports');

INSERT INTO products (id, category_id, name, price, status, launched_at) VALUES
  (1, 1, 'Wireless Keyboard', 59000, 'ACTIVE', '2024-01-20'),
  (2, 1, 'USB-C Hub', 42000, 'ACTIVE', '2024-02-14'),
  (3, 2, 'Desk Lamp', 35000, 'ACTIVE', '2024-03-02'),
  (4, 2, 'Storage Box', 18000, 'ACTIVE', '2024-03-15'),
  (5, 3, 'Hand Cream', 12000, 'ACTIVE', '2024-04-01'),
  (6, 3, 'Sunscreen', 22000, 'ACTIVE', '2024-04-18'),
  (7, 4, 'Yoga Mat', 31000, 'ACTIVE', '2024-05-03'),
  (8, 4, 'Running Socks', 9000, 'DISCONTINUED', '2024-05-22');

INSERT INTO orders (id, customer_id, status, ordered_at) VALUES
  (1, 1, 'DELIVERED', '2025-01-05 10:20:00'),
  (2, 2, 'DELIVERED', '2025-01-18 14:05:00'),
  (3, 1, 'PAID', '2025-02-03 09:40:00'),
  (4, 3, 'SHIPPING', '2025-02-16 18:30:00'),
  (5, 4, 'CANCELED', '2025-03-01 12:12:00'),
  (6, 5, 'DELIVERED', '2025-03-12 16:45:00'),
  (7, 6, 'PAID', '2025-03-23 11:05:00'),
  (8, 5, 'DELIVERED', '2025-04-04 20:10:00');

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 1, 1, 59000),
  (2, 1, 3, 1, 35000),
  (3, 2, 5, 3, 12000),
  (4, 3, 2, 1, 42000),
  (5, 3, 6, 2, 22000),
  (6, 4, 7, 1, 31000),
  (7, 5, 4, 2, 18000),
  (8, 6, 1, 1, 59000),
  (9, 6, 2, 1, 42000),
  (10, 7, 6, 1, 22000),
  (11, 8, 3, 2, 35000),
  (12, 8, 5, 1, 12000);

INSERT INTO payments (id, order_id, method, amount, status, paid_at) VALUES
  (1, 1, 'CARD', 94000, 'PAID', '2025-01-05 10:22:00'),
  (2, 2, 'KAKAO_PAY', 36000, 'PAID', '2025-01-18 14:06:00'),
  (3, 3, 'CARD', 86000, 'PAID', '2025-02-03 09:42:00'),
  (4, 4, 'BANK_TRANSFER', 31000, 'PAID', '2025-02-16 18:35:00'),
  (5, 5, 'CARD', 36000, 'REFUNDED', '2025-03-01 12:13:00'),
  (6, 6, 'CARD', 101000, 'PAID', '2025-03-12 16:47:00'),
  (7, 7, 'NAVER_PAY', 22000, 'PAID', '2025-03-23 11:07:00'),
  (8, 8, 'KAKAO_PAY', 82000, 'PAID', '2025-04-04 20:12:00');

INSERT INTO shipments (id, order_id, carrier, status, shipped_at, delivered_at) VALUES
  (1, 1, 'CJ', 'DELIVERED', '2025-01-06 09:00:00', '2025-01-07 15:20:00'),
  (2, 2, 'POST', 'DELIVERED', '2025-01-19 10:30:00', '2025-01-21 13:10:00'),
  (3, 3, 'CJ', 'READY', NULL, NULL),
  (4, 4, 'LOTTE', 'SHIPPING', '2025-02-17 08:50:00', NULL),
  (5, 6, 'CJ', 'DELIVERED', '2025-03-13 09:10:00', '2025-03-14 18:00:00'),
  (6, 7, 'POST', 'READY', NULL, NULL),
  (7, 8, 'LOTTE', 'DELIVERED', '2025-04-05 09:20:00', '2025-04-08 12:40:00');

INSERT INTO inventory (product_id, stock_quantity, safety_stock, updated_at) VALUES
  (1, 12, 5, '2025-04-10'),
  (2, 4, 5, '2025-04-10'),
  (3, 18, 6, '2025-04-10'),
  (4, 0, 4, '2025-04-10'),
  (5, 31, 10, '2025-04-10'),
  (6, 7, 8, '2025-04-10'),
  (7, 9, 3, '2025-04-10'),
  (8, 2, 3, '2025-04-10');

INSERT INTO reviews (id, customer_id, product_id, rating, content, created_at) VALUES
  (1, 1, 1, 5, '키감이 좋고 연결이 안정적입니다.', '2025-01-12'),
  (2, 2, 5, 4, '향이 은은해서 만족합니다.', '2025-01-25'),
  (3, 5, 2, 5, '포트 구성이 실용적입니다.', '2025-03-20'),
  (4, 5, 3, 3, '밝기는 좋은데 무게가 조금 있습니다.', '2025-04-12'),
  (5, 3, 7, 4, '두께감이 적당합니다.', '2025-02-23');

INSERT INTO coupons (id, code, discount_type, discount_value, starts_at, ends_at, active) VALUES
  (1, 'WELCOME10', 'PERCENT', 10, '2025-01-01', '2025-12-31', 1),
  (2, 'SPRING5000', 'AMOUNT', 5000, '2025-03-01', '2025-04-30', 1),
  (3, 'VIP15000', 'AMOUNT', 15000, '2025-01-01', '2025-12-31', 1);

INSERT INTO coupon_redemptions (id, coupon_id, order_id, discount_amount, redeemed_at) VALUES
  (1, 1, 2, 3600, '2025-01-18 14:06:00'),
  (2, 3, 6, 15000, '2025-03-12 16:47:00'),
  (3, 2, 8, 5000, '2025-04-04 20:12:00');
