-- @title 게시판/댓글 기본 세트
-- @slug board-basic
-- @level beginner
-- @description 사용자, 게시판, 게시글, 댓글, 좋아요 테이블로 기본 조회와 JOIN을 연습합니다.
-- @topics SELECT, WHERE, JOIN, GROUP BY, COUNT
-- @tables users, profiles, boards, posts, comments, likes
-- @recommendedQueries SELECT * FROM posts ORDER BY views DESC LIMIT 5; | SELECT p.title, u.name FROM posts p JOIN users u ON u.id = p.user_id; | SELECT p.title, COUNT(c.id) AS comment_count FROM posts p LEFT JOIN comments c ON c.post_id = p.id GROUP BY p.id ORDER BY comment_count DESC;

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  city TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  created_at TEXT NOT NULL
);

CREATE TABLE profiles (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  company TEXT,
  bio TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE boards (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  board_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (board_id) REFERENCES boards(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  parent_id INTEGER,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES comments(id)
);

CREATE TABLE likes (
  id INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO users (id, name, email, city, role, created_at) VALUES
(1, '김민준', 'minjun@example.com', '서울', 'ADMIN', '2026-01-02'),
(2, '이서연', 'seoyeon@example.com', '부산', 'USER', '2026-01-03'),
(3, '박지훈', 'jihoon@example.com', '서울', 'USER', '2026-01-04'),
(4, '최수아', 'sua@example.com', '대구', 'USER', '2026-01-05'),
(5, '정하은', 'haeun@example.com', '인천', 'USER', '2026-01-06');

INSERT INTO profiles (id, user_id, company, bio) VALUES
(1, 1, '테크컴퍼니', '풀스택 개발자'),
(2, 2, '디자인스튜디오', 'UI 디자이너'),
(3, 3, '데이터랩', '백엔드 개발자 지망생'),
(4, 4, '클라우드컴퍼니', '데이터 분석가'),
(5, 5, NULL, '프리랜서 개발자');

INSERT INTO boards (id, name, category, is_active) VALUES
(1, '자유게시판', 'GENERAL', 1),
(2, '질문게시판', 'QNA', 1),
(3, '공지사항', 'NOTICE', 1),
(4, '프로젝트', 'PROJECT', 1),
(5, '채용게시판', 'JOB', 1);

INSERT INTO posts (id, board_id, user_id, title, content, views, is_pinned, created_at) VALUES
(1, 1, 1, '안녕하세요 처음 가입했습니다', '반갑습니다.', 120, 0, '2026-02-01'),
(2, 2, 3, 'JOIN이 헷갈립니다', 'INNER JOIN과 LEFT JOIN 차이가 궁금합니다.', 340, 0, '2026-02-02'),
(3, 3, 1, '서비스 점검 안내', '금요일 새벽 점검 예정입니다.', 510, 1, '2026-02-03'),
(4, 4, 5, 'SQL 연습 프로젝트 공유', '게시판 데이터셋을 만들었습니다.', 180, 0, '2026-02-04'),
(5, 1, 4, '개발 공부 루틴', '매일 한 문제씩 풀고 있습니다.', 230, 0, '2026-02-05');

INSERT INTO comments (id, post_id, user_id, parent_id, content, created_at) VALUES
(1, 1, 2, NULL, '환영합니다!', '2026-02-01'),
(2, 2, 1, NULL, 'LEFT JOIN은 매칭되지 않은 행도 남깁니다.', '2026-02-02'),
(3, 2, 3, 2, '설명 감사합니다.', '2026-02-02'),
(4, 4, 2, NULL, '좋은 자료네요.', '2026-02-04'),
(5, 5, 5, NULL, '저도 따라 해볼게요.', '2026-02-05');

INSERT INTO likes (id, post_id, user_id, created_at) VALUES
(1, 2, 1, '2026-02-02'),
(2, 2, 2, '2026-02-02'),
(3, 3, 2, '2026-02-03'),
(4, 4, 1, '2026-02-04'),
(5, 4, 3, '2026-02-04'),
(6, 5, 1, '2026-02-05');
