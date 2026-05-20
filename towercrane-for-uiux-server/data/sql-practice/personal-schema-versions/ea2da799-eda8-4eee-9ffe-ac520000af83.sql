-- 도서관 샘플 DB
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS book_authors;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS members;

CREATE TABLE authors (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  nationality TEXT
);

CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  published_year INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE book_authors (
  book_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  PRIMARY KEY (book_id, author_id),
  FOREIGN KEY (book_id) REFERENCES books(id),
  FOREIGN KEY (author_id) REFERENCES authors(id)
);

CREATE TABLE members (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL DEFAULT 'REGULAR',
  joined_at TEXT NOT NULL
);

CREATE TABLE loans (
  id INTEGER PRIMARY KEY,
  member_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  loaned_at TEXT NOT NULL,
  returned_at TEXT,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (book_id) REFERENCES books(id)
);

INSERT INTO authors (id, name, nationality) VALUES
  (1, '김영하', 'KR'),
  (2, '한강', 'KR'),
  (3, 'Haruki Murakami', 'JP'),
  (4, 'Yuval Harari', 'IL'),
  (5, 'Robert C. Martin', 'US');

INSERT INTO books (id, title, category, published_year, stock) VALUES
  (1, '검은 꽃', '소설', 2003, 3),
  (2, '채식주의자', '소설', 2007, 2),
  (3, 'IQ84', '소설', 2009, 4),
  (4, 'Sapiens', '인문', 2014, 5),
  (5, 'Clean Code', 'IT', 2008, 6),
  (6, 'Clean Architecture', 'IT', 2017, 4),
  (7, '소년이 온다', '소설', 2014, 1);

INSERT INTO book_authors (book_id, author_id) VALUES
  (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 5), (7, 2);

INSERT INTO members (id, name, grade, joined_at) VALUES
  (1, '오현석', 'VIP', '2024-01-15'),
  (2, '이지은', 'REGULAR', '2024-05-20'),
  (3, '박서준', 'VIP', '2025-02-10'),
  (4, '김민지', 'REGULAR', '2025-08-01'),
  (5, '최우식', 'REGULAR', '2026-01-12');

INSERT INTO loans (id, member_id, book_id, loaned_at, returned_at) VALUES
  (1, 1, 5, '2026-03-01', '2026-03-15'),
  (2, 1, 6, '2026-04-02', NULL),
  (3, 2, 2, '2026-03-10', '2026-03-25'),
  (4, 3, 4, '2026-04-15', NULL),
  (5, 4, 1, '2026-02-20', '2026-03-05'),
  (6, 2, 7, '2026-05-01', NULL),
  (7, 5, 3, '2026-04-22', '2026-05-10'),
  (8, 3, 5, '2026-05-05', NULL);
