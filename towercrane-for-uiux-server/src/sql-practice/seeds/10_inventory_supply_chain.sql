-- @title 재고/입출고/발주 세트
-- @slug inventory-supply-chain
-- @level advanced
-- @description 창고, 공급사, 상품, 입출고, 발주, 발주 품목, 재고 스냅샷으로 재고 운영 쿼리를 연습합니다.
-- @topics WINDOW, CTE, INVENTORY, SUM, LEAD TIME
-- @tables warehouses, suppliers, products, stock_movements, purchase_orders, purchase_order_items, stock_snapshots
-- @recommendedQueries SELECT p.name, SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE -sm.quantity END) AS net_qty FROM products p JOIN stock_movements sm ON sm.product_id = p.id GROUP BY p.id; | SELECT p.name, s.on_hand_qty, p.safety_stock FROM stock_snapshots s JOIN products p ON p.id = s.product_id WHERE s.on_hand_qty < p.safety_stock; | SELECT po.id, julianday(po.received_at) - julianday(po.ordered_at) AS lead_days FROM purchase_orders po WHERE po.received_at IS NOT NULL;

PRAGMA foreign_keys = ON;

CREATE TABLE warehouses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  lead_time_days INTEGER NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  supplier_id INTEGER NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  safety_stock INTEGER NOT NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE stock_movements (
  id INTEGER PRIMARY KEY,
  warehouse_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  moved_at TEXT NOT NULL,
  reference_no TEXT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE purchase_orders (
  id INTEGER PRIMARY KEY,
  supplier_id INTEGER NOT NULL,
  warehouse_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  ordered_at TEXT NOT NULL,
  received_at TEXT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE purchase_order_items (
  id INTEGER PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  ordered_qty INTEGER NOT NULL,
  received_qty INTEGER NOT NULL DEFAULT 0,
  unit_cost INTEGER NOT NULL,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE stock_snapshots (
  id INTEGER PRIMARY KEY,
  warehouse_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  snapshot_date TEXT NOT NULL,
  on_hand_qty INTEGER NOT NULL,
  reserved_qty INTEGER NOT NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT INTO warehouses (id, name, region, is_active) VALUES
(1, '수도권 물류센터', '경기', 1),
(2, '부산 허브', '부산', 1),
(3, '제주 창고', '제주', 1);

INSERT INTO suppliers (id, name, country, lead_time_days) VALUES
(1, '코리아부품', 'KR', 5),
(2, '아시아트레이딩', 'VN', 14),
(3, '글로벌팩토리', 'CN', 10);

INSERT INTO products (id, supplier_id, sku, name, safety_stock) VALUES
(1, 1, 'KB-100', '베어링 세트', 30),
(2, 2, 'AT-200', '알루미늄 프레임', 20),
(3, 3, 'GF-300', '전원 모듈', 25),
(4, 1, 'KB-400', '고정 브라켓', 40);

INSERT INTO stock_movements (id, warehouse_id, product_id, movement_type, quantity, moved_at, reference_no) VALUES
(1, 1, 1, 'IN', 80, '2026-10-01', 'PO-1'),
(2, 1, 1, 'OUT', 55, '2026-10-03', 'SO-10'),
(3, 1, 2, 'IN', 40, '2026-10-04', 'PO-2'),
(4, 2, 3, 'IN', 60, '2026-10-05', 'PO-3'),
(5, 2, 3, 'OUT', 30, '2026-10-06', 'SO-11'),
(6, 3, 4, 'IN', 35, '2026-10-07', 'PO-4');

INSERT INTO purchase_orders (id, supplier_id, warehouse_id, status, ordered_at, received_at) VALUES
(1, 1, 1, 'RECEIVED', '2026-09-25', '2026-10-01'),
(2, 2, 1, 'RECEIVED', '2026-09-20', '2026-10-04'),
(3, 3, 2, 'RECEIVED', '2026-09-24', '2026-10-05'),
(4, 1, 3, 'PARTIAL', '2026-10-01', '2026-10-07'),
(5, 2, 1, 'ORDERED', '2026-10-08', NULL);

INSERT INTO purchase_order_items (id, purchase_order_id, product_id, ordered_qty, received_qty, unit_cost) VALUES
(1, 1, 1, 80, 80, 12000),
(2, 2, 2, 40, 40, 33000),
(3, 3, 3, 60, 60, 27000),
(4, 4, 4, 50, 35, 8000),
(5, 5, 2, 30, 0, 33000);

INSERT INTO stock_snapshots (id, warehouse_id, product_id, snapshot_date, on_hand_qty, reserved_qty) VALUES
(1, 1, 1, '2026-10-08', 25, 5),
(2, 1, 2, '2026-10-08', 40, 8),
(3, 2, 3, '2026-10-08', 30, 12),
(4, 3, 4, '2026-10-08', 35, 3);
