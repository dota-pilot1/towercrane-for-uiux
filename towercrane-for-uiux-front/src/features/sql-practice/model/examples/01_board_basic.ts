import { defineExampleSet } from './shared'

export const boardBasicExamples = defineExampleSet('01_board_basic.sql', {
  beginner: [
    {
      title: '사용자 가입일순 목록',
      relatedTables: ['users'],
      sql: `SELECT id, name, email, city, role, created_at
FROM users
ORDER BY created_at ASC;`,
    },
    {
      title: '서울 사용자만 보기',
      relatedTables: ['users'],
      sql: `SELECT name, email, role
FROM users
WHERE city = '서울'
ORDER BY name;`,
    },
    {
      title: '활성 게시판 목록',
      relatedTables: ['boards'],
      sql: `SELECT id, name, category
FROM boards
WHERE is_active = 1
ORDER BY id;`,
    },
    {
      title: '조회수 높은 게시글',
      relatedTables: ['posts'],
      sql: `SELECT title, views, created_at
FROM posts
ORDER BY views DESC
LIMIT 5;`,
    },
    {
      title: '고정 게시글 찾기',
      relatedTables: ['posts'],
      sql: `SELECT id, title, created_at
FROM posts
WHERE is_pinned = 1
ORDER BY created_at DESC;`,
    },
    {
      title: '최근 댓글 목록',
      relatedTables: ['comments'],
      sql: `SELECT id, post_id, user_id, content, created_at
FROM comments
ORDER BY created_at DESC;`,
    },
    {
      title: '도시별 사용자 수',
      relatedTables: ['users'],
      sql: `SELECT city, COUNT(*) AS user_count
FROM users
GROUP BY city
ORDER BY user_count DESC, city;`,
    },
    {
      title: '게시판별 게시글 수',
      relatedTables: ['posts'],
      sql: `SELECT board_id, COUNT(*) AS post_count
FROM posts
GROUP BY board_id
ORDER BY post_count DESC;`,
    },
    {
      title: '게시글별 댓글 수',
      relatedTables: ['comments'],
      sql: `SELECT post_id, COUNT(*) AS comment_count
FROM comments
GROUP BY post_id
ORDER BY comment_count DESC;`,
    },
    {
      title: '게시글별 좋아요 수',
      relatedTables: ['likes'],
      sql: `SELECT post_id, COUNT(*) AS like_count
FROM likes
GROUP BY post_id
ORDER BY like_count DESC;`,
    },
  ],
  intermediate: [
    {
      title: '사용자 프로필 함께 보기',
      relatedTables: ['users', 'profiles'],
      sql: `SELECT u.name, u.email, p.company, p.bio
FROM users u
JOIN profiles p ON p.user_id = u.id
ORDER BY u.name;`,
    },
    {
      title: '게시글 작성자 표시',
      relatedTables: ['posts', 'users'],
      sql: `SELECT p.title, u.name AS author, p.views
FROM posts p
JOIN users u ON u.id = p.user_id
ORDER BY p.views DESC;`,
    },
    {
      title: '게시글과 게시판명',
      relatedTables: ['posts', 'boards'],
      sql: `SELECT b.name AS board_name, p.title, p.created_at
FROM posts p
JOIN boards b ON b.id = p.board_id
ORDER BY b.name, p.created_at;`,
    },
    {
      title: '댓글 작성자와 원문',
      relatedTables: ['comments', 'posts', 'users'],
      sql: `SELECT p.title, u.name AS commenter, c.content
FROM comments c
JOIN posts p ON p.id = c.post_id
JOIN users u ON u.id = c.user_id
ORDER BY c.created_at;`,
    },
    {
      title: '좋아요 누른 사용자',
      relatedTables: ['likes', 'posts', 'users'],
      sql: `SELECT p.title, u.name AS liked_by, l.created_at
FROM likes l
JOIN posts p ON p.id = l.post_id
JOIN users u ON u.id = l.user_id
ORDER BY l.created_at;`,
    },
    {
      title: '게시판별 게시글 수와 평균 조회수',
      relatedTables: ['boards', 'posts'],
      sql: `SELECT b.name, COUNT(p.id) AS post_count, ROUND(AVG(p.views), 1) AS avg_views
FROM boards b
LEFT JOIN posts p ON p.board_id = b.id
GROUP BY b.id, b.name
ORDER BY post_count DESC;`,
    },
    {
      title: '사용자별 작성 글 수',
      relatedTables: ['users', 'posts'],
      sql: `SELECT u.name, COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
GROUP BY u.id, u.name
ORDER BY post_count DESC, u.name;`,
    },
    {
      title: '게시글별 댓글 수 포함',
      relatedTables: ['posts', 'comments'],
      sql: `SELECT p.title, COUNT(c.id) AS comment_count
FROM posts p
LEFT JOIN comments c ON c.post_id = p.id
GROUP BY p.id, p.title
ORDER BY comment_count DESC;`,
    },
    {
      title: '게시글별 좋아요 수 포함',
      relatedTables: ['posts', 'likes'],
      sql: `SELECT p.title, COUNT(l.id) AS like_count
FROM posts p
LEFT JOIN likes l ON l.post_id = p.id
GROUP BY p.id, p.title
ORDER BY like_count DESC;`,
    },
    {
      title: '작성자가 받은 댓글 수',
      relatedTables: ['users', 'posts', 'comments'],
      sql: `SELECT u.name, COUNT(c.id) AS received_comments
FROM users u
JOIN posts p ON p.user_id = u.id
LEFT JOIN comments c ON c.post_id = p.id
GROUP BY u.id, u.name
ORDER BY received_comments DESC;`,
    },
  ],
  advanced: [
    {
      title: '게시글 참여도 집계',
      relatedTables: ['posts', 'comments', 'likes'],
      sql: `WITH comment_counts AS (
  SELECT post_id, COUNT(*) AS comment_count
  FROM comments
  GROUP BY post_id
),
like_counts AS (
  SELECT post_id, COUNT(*) AS like_count
  FROM likes
  GROUP BY post_id
)
SELECT
  p.title,
  p.views,
  COALESCE(c.comment_count, 0) AS comment_count,
  COALESCE(l.like_count, 0) AS like_count,
  p.views + COALESCE(c.comment_count, 0) * 10 + COALESCE(l.like_count, 0) * 20 AS engagement_score
FROM posts p
LEFT JOIN comment_counts c ON c.post_id = p.id
LEFT JOIN like_counts l ON l.post_id = p.id
ORDER BY engagement_score DESC;`,
    },
    {
      title: '글을 쓰지 않은 사용자',
      relatedTables: ['users', 'posts'],
      sql: `SELECT u.id, u.name, u.email
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
WHERE p.id IS NULL
ORDER BY u.id;`,
    },
    {
      title: '댓글 없는 게시글',
      relatedTables: ['posts', 'comments'],
      sql: `SELECT p.id, p.title
FROM posts p
LEFT JOIN comments c ON c.post_id = p.id
WHERE c.id IS NULL
ORDER BY p.id;`,
    },
    {
      title: '게시판별 조회수 1위 글',
      relatedTables: ['boards', 'posts'],
      sql: `WITH ranked_posts AS (
  SELECT
    p.*,
    ROW_NUMBER() OVER (PARTITION BY p.board_id ORDER BY p.views DESC) AS rank_no
  FROM posts p
)
SELECT b.name AS board_name, r.title, r.views
FROM ranked_posts r
JOIN boards b ON b.id = r.board_id
WHERE r.rank_no = 1
ORDER BY r.views DESC;`,
    },
    {
      title: '대댓글 구조 확인',
      relatedTables: ['comments'],
      sql: `SELECT
  child.id AS comment_id,
  child.content AS reply_content,
  parent.content AS parent_content
FROM comments child
JOIN comments parent ON parent.id = child.parent_id
ORDER BY child.id;`,
    },
    {
      title: '활성 게시판 중 글 없는 곳',
      relatedTables: ['boards', 'posts'],
      sql: `SELECT b.id, b.name
FROM boards b
LEFT JOIN posts p ON p.board_id = b.id
WHERE b.is_active = 1
GROUP BY b.id, b.name
HAVING COUNT(p.id) = 0;`,
    },
    {
      title: '일자별 게시글 작성량',
      relatedTables: ['posts'],
      sql: `SELECT created_at, COUNT(*) AS post_count, SUM(views) AS total_views
FROM posts
GROUP BY created_at
ORDER BY created_at;`,
    },
    {
      title: '좋아요 대비 댓글 비율',
      relatedTables: ['posts', 'comments', 'likes'],
      sql: `SELECT
  p.title,
  COUNT(DISTINCT c.id) AS comment_count,
  COUNT(DISTINCT l.id) AS like_count,
  ROUND(COUNT(DISTINCT c.id) * 1.0 / NULLIF(COUNT(DISTINCT l.id), 0), 2) AS comment_per_like
FROM posts p
LEFT JOIN comments c ON c.post_id = p.id
LEFT JOIN likes l ON l.post_id = p.id
GROUP BY p.id, p.title
ORDER BY comment_per_like DESC;`,
    },
    {
      title: '도시와 역할별 사용자 분포',
      relatedTables: ['users'],
      sql: `SELECT city, role, COUNT(*) AS user_count
FROM users
GROUP BY city, role
ORDER BY city, role;`,
    },
    {
      title: '게시글 종합 리포트',
      relatedTables: ['boards', 'posts', 'users', 'comments', 'likes'],
      sql: `SELECT
  b.name AS board_name,
  p.title,
  u.name AS author,
  p.views,
  COUNT(DISTINCT c.id) AS comment_count,
  COUNT(DISTINCT l.id) AS like_count
FROM posts p
JOIN boards b ON b.id = p.board_id
JOIN users u ON u.id = p.user_id
LEFT JOIN comments c ON c.post_id = p.id
LEFT JOIN likes l ON l.post_id = p.id
GROUP BY p.id, b.name, p.title, u.name, p.views
ORDER BY p.views DESC;`,
    },
  ],
})
