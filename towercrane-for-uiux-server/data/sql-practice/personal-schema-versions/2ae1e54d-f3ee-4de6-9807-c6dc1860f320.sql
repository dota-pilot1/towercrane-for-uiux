-- HR/인사 샘플 DB
DROP TABLE IF EXISTS salaries;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;

CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  position TEXT NOT NULL,
  hired_at TEXT NOT NULL,
  manager_id INTEGER,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (manager_id) REFERENCES employees(id)
);

CREATE TABLE salaries (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  effective_from TEXT NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

INSERT INTO departments (id, name, location) VALUES
  (1, 'Engineering', 'Seoul'),
  (2, 'Design', 'Seoul'),
  (3, 'Sales', 'Busan'),
  (4, 'HR', 'Seoul'),
  (5, 'Finance', 'Seoul');

INSERT INTO employees (id, name, department_id, position, hired_at, manager_id) VALUES
  (1, '김대표', 1, 'CEO', '2020-01-01', NULL),
  (2, '이팀장', 1, 'Engineering Manager', '2020-03-15', 1),
  (3, '박개발', 1, 'Senior Engineer', '2021-06-20', 2),
  (4, '최주니어', 1, 'Junior Engineer', '2024-09-01', 2),
  (5, '정디자인', 2, 'Design Lead', '2021-08-10', 1),
  (6, '강UI', 2, 'UI Designer', '2023-04-22', 5),
  (7, '윤영업', 3, 'Sales Manager', '2022-02-14', 1),
  (8, '한세일', 3, 'Sales', '2024-01-05', 7),
  (9, '서인사', 4, 'HR Manager', '2021-11-08', 1),
  (10, '오재무', 5, 'CFO', '2020-05-25', 1);

INSERT INTO salaries (id, employee_id, amount, effective_from) VALUES
  (1, 1, 150000000, '2025-01-01'),
  (2, 2, 95000000, '2025-01-01'),
  (3, 3, 75000000, '2025-01-01'),
  (4, 4, 45000000, '2025-01-01'),
  (5, 5, 85000000, '2025-01-01'),
  (6, 6, 52000000, '2025-01-01'),
  (7, 7, 80000000, '2025-01-01'),
  (8, 8, 48000000, '2025-01-01'),
  (9, 9, 70000000, '2025-01-01'),
  (10, 10, 120000000, '2025-01-01'),
  (11, 3, 82000000, '2026-01-01'),
  (12, 4, 52000000, '2026-01-01'),
  (13, 6, 58000000, '2026-01-01');
