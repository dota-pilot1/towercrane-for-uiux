import { defineExampleSet } from './shared'

export const boardBasicExamples = defineExampleSet('01_board_basic.sql', {
  beginner: [
    {
      title: '사용자 가입일순 목록',
      description:
        '전체 사용자 목록을 가입한 순서대로 오래된 사용자부터 보여주세요. 아이디(id), 이름(name), 이메일(email), 도시(city), 역할(role), 가입일(created_at) 컬럼을 출력합니다.',
      hint: '특정 컬럼을 기준으로 오름차순 정렬하는 기본 패턴을 사용하세요.',
      explanation:
        'ORDER BY created_at ASC는 날짜 컬럼을 작은 값(과거)부터 큰 값(현재) 순서로 정렬합니다. ASC는 기본값이라 생략해도 같은 결과가 나옵니다.',
      relatedTables: ['users'],
      sql: `SELECT id, name, email, city, role, created_at
FROM users
ORDER BY created_at ASC;`,
    },
    {
      title: '서울 사용자만 보기',
      description:
        '거주 도시가 "서울"인 사용자만 골라 이름(name), 이메일(email), 역할(role)을 이름 가나다순으로 보여주세요.',
      hint: '특정 컬럼 값이 조건과 일치하는 행만 거르는 패턴을 사용하세요.',
      explanation:
        'WHERE city = \'서울\' 조건으로 행을 필터링한 뒤 ORDER BY name으로 이름 순 정렬합니다. 문자열 비교는 작은따옴표로 감쌉니다.',
      relatedTables: ['users'],
      sql: `SELECT name, email, role
FROM users
WHERE city = '서울'
ORDER BY name;`,
    },
    {
      title: '활성 게시판 목록',
      description:
        '운영 중인(활성 상태인) 게시판만 골라 아이디(id), 이름(name), 카테고리(category)를 아이디 순으로 보여주세요.',
      hint: '불리언/플래그 컬럼이 특정 값인 행만 거르는 패턴을 사용하세요.',
      explanation:
        'is_active = 1 조건으로 활성 게시판만 추립니다. 0/1 같은 플래그 컬럼은 = 비교로 간단하게 필터링할 수 있습니다.',
      relatedTables: ['boards'],
      sql: `SELECT id, name, category
FROM boards
WHERE is_active = 1
ORDER BY id;`,
    },
    {
      title: '조회수 높은 게시글',
      description:
        '게시글 중 조회수가 가장 높은 5개를 찾으세요. 제목(title), 조회수(views), 작성일(created_at) 세 컬럼을 조회수 많은 순으로 정렬해 출력합니다.',
      hint: '특정 컬럼을 기준으로 내림차순 정렬한 뒤 상위 N건만 가져오는 패턴을 사용하세요.',
      explanation:
        'ORDER BY views DESC로 조회수가 큰 값부터 정렬하고 LIMIT 5로 상위 5건만 가져옵니다. LIMIT은 정렬과 함께 써야 의미가 있습니다.',
      relatedTables: ['posts'],
      sql: `SELECT title, views, created_at
FROM posts
ORDER BY views DESC
LIMIT 5;`,
    },
    {
      title: '고정 게시글 찾기',
      description:
        '상단에 고정된 게시글만 찾아 아이디(id), 제목(title), 작성일(created_at)을 최신 작성일부터 보여주세요.',
      hint: '플래그 컬럼으로 필터링하고 날짜 컬럼으로 내림차순 정렬하는 조합 패턴입니다.',
      explanation:
        'is_pinned = 1 조건으로 고정 글만 추리고 ORDER BY created_at DESC로 최신순 정렬합니다. WHERE와 ORDER BY는 함께 자주 쓰이는 조합입니다.',
      relatedTables: ['posts'],
      sql: `SELECT id, title, created_at
FROM posts
WHERE is_pinned = 1
ORDER BY created_at DESC;`,
    },
    {
      title: '최근 댓글 목록',
      description:
        '모든 댓글을 최신순으로 보여주세요. 아이디(id), 게시글 아이디(post_id), 작성자 아이디(user_id), 내용(content), 작성일(created_at) 컬럼을 포함합니다.',
      hint: '날짜 컬럼을 기준으로 내림차순 정렬하는 패턴을 사용하세요.',
      explanation:
        'ORDER BY created_at DESC는 가장 최근 행이 위로 오게 정렬합니다. 댓글, 알림 등 시간순 피드에서 가장 자주 쓰이는 정렬 방식입니다.',
      relatedTables: ['comments'],
      sql: `SELECT id, post_id, user_id, content, created_at
FROM comments
ORDER BY created_at DESC;`,
    },
    {
      title: '도시별 사용자 수',
      description:
        '도시(city)별로 사용자가 몇 명인지 집계해서 보여주세요. 사용자가 많은 도시부터, 같은 인원이면 도시 이름 가나다순으로 정렬합니다.',
      hint: '특정 컬럼을 기준으로 그룹별 개수를 집계하는 패턴을 사용하세요.',
      explanation:
        'GROUP BY city로 도시별 묶음을 만들고 COUNT(*)로 그룹별 행 수를 셉니다. 정렬 기준이 여러 개일 때는 ORDER BY에 콤마로 연결합니다.',
      relatedTables: ['users'],
      sql: `SELECT city, COUNT(*) AS user_count
FROM users
GROUP BY city
ORDER BY user_count DESC, city;`,
    },
    {
      title: '게시판별 게시글 수',
      description:
        '게시판별로 게시글이 몇 개 올라왔는지 집계해서 글이 많은 게시판부터 보여주세요. 게시판 아이디(board_id)와 게시글 수(post_count)를 출력합니다.',
      hint: '외래키 컬럼으로 그룹을 묶어 개수를 집계하는 패턴입니다.',
      explanation:
        'GROUP BY board_id로 같은 게시판의 글들을 묶고 COUNT(*)로 글 수를 셉니다. 다만 게시글이 한 건도 없는 게시판은 이 쿼리에 안 잡힌다는 한계가 있습니다.',
      relatedTables: ['posts'],
      sql: `SELECT board_id, COUNT(*) AS post_count
FROM posts
GROUP BY board_id
ORDER BY post_count DESC;`,
    },
    {
      title: '게시글별 댓글 수',
      description:
        '게시글별로 댓글이 몇 개 달렸는지 집계해서 댓글이 많은 게시글부터 보여주세요. 게시글 아이디(post_id)와 댓글 수(comment_count)를 출력합니다.',
      hint: '자식 테이블에서 부모 키로 그룹을 묶어 개수를 세는 패턴입니다.',
      explanation:
        'comments 테이블에서 post_id로 묶어 COUNT(*)를 집계합니다. 댓글이 0개인 게시글을 포함하려면 posts와 LEFT JOIN해야 합니다.',
      relatedTables: ['comments'],
      sql: `SELECT post_id, COUNT(*) AS comment_count
FROM comments
GROUP BY post_id
ORDER BY comment_count DESC;`,
    },
    {
      title: '게시글별 좋아요 수',
      description:
        '게시글별로 좋아요가 몇 개 눌렸는지 집계해서 좋아요가 많은 게시글부터 보여주세요. 게시글 아이디(post_id)와 좋아요 수(like_count)를 출력합니다.',
      hint: '관계 테이블에서 한쪽 키를 기준으로 그룹화해 개수를 세는 패턴입니다.',
      explanation:
        'likes 테이블을 post_id로 GROUP BY 하고 COUNT(*)로 좋아요 수를 셉니다. 좋아요가 한 번도 없는 게시글은 결과에 빠지므로 전체 게시글 기준으로 보려면 LEFT JOIN이 필요합니다.',
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
      description:
        '프로필 정보가 등록된 사용자만 골라 이름(name), 이메일(email), 회사(company), 소개(bio)를 이름 가나다순으로 보여주세요.',
      hint: '두 테이블을 공통 키로 연결하는 기본 조인 패턴을 사용하세요.',
      explanation:
        'INNER JOIN으로 users와 profiles를 user_id 기준으로 연결합니다. 프로필이 없는 사용자는 결과에 포함되지 않으며, 전부 포함하려면 LEFT JOIN을 사용해야 합니다.',
      relatedTables: ['users', 'profiles'],
      sql: `SELECT u.name, u.email, p.company, p.bio
FROM users u
JOIN profiles p ON p.user_id = u.id
ORDER BY u.name;`,
    },
    {
      title: '게시글 작성자 표시',
      description:
        '각 게시글의 제목(title), 작성자 이름(author), 조회수(views)를 조회수가 많은 순으로 보여주세요.',
      hint: '게시글의 외래키를 사용해 작성자 테이블과 연결하는 조인 패턴입니다.',
      explanation:
        'posts.user_id와 users.id를 조인 조건으로 묶어 작성자 이름을 가져옵니다. 별칭(AS author)으로 컬럼 의미를 분명하게 표기했습니다.',
      relatedTables: ['posts', 'users'],
      sql: `SELECT p.title, u.name AS author, p.views
FROM posts p
JOIN users u ON u.id = p.user_id
ORDER BY p.views DESC;`,
    },
    {
      title: '게시글과 게시판명',
      description:
        '게시글을 어느 게시판에 올라왔는지와 함께 보여주세요. 게시판 이름(board_name), 제목(title), 작성일(created_at)을 게시판 이름순, 같은 게시판이면 작성일순으로 정렬합니다.',
      hint: '게시글과 게시판을 외래키로 연결하고 두 컬럼으로 정렬하는 패턴입니다.',
      explanation:
        'posts와 boards를 board_id로 조인해 카테고리성 정보(게시판 이름)를 끌어옵니다. ORDER BY에 두 컬럼을 콤마로 나열하면 1차/2차 정렬 기준이 됩니다.',
      relatedTables: ['posts', 'boards'],
      sql: `SELECT b.name AS board_name, p.title, p.created_at
FROM posts p
JOIN boards b ON b.id = p.board_id
ORDER BY b.name, p.created_at;`,
    },
    {
      title: '댓글 작성자와 원문',
      description:
        '댓글을 작성 순서대로 보여주는데, 어느 게시글의 댓글인지 제목(title), 댓글 작성자 이름(commenter), 댓글 내용(content)이 함께 보여야 합니다.',
      hint: '세 테이블을 차례로 외래키로 이어붙이는 다중 조인 패턴입니다.',
      explanation:
        'comments를 중심으로 posts(원문)와 users(작성자)를 각각 조인합니다. 다중 조인에서는 별칭을 명확히 하고 ON 조건을 빠뜨리지 않는 것이 중요합니다.',
      relatedTables: ['comments', 'posts', 'users'],
      sql: `SELECT p.title, u.name AS commenter, c.content
FROM comments c
JOIN posts p ON p.id = c.post_id
JOIN users u ON u.id = c.user_id
ORDER BY c.created_at;`,
    },
    {
      title: '좋아요 누른 사용자',
      description:
        '누가 어떤 게시글에 좋아요를 눌렀는지 시간순으로 보여주세요. 게시글 제목(title), 좋아요 누른 사람 이름(liked_by), 좋아요 시각(created_at)을 출력합니다.',
      hint: '관계 테이블을 중앙에 두고 양쪽 엔티티 테이블과 각각 조인하는 패턴입니다.',
      explanation:
        'likes 테이블이 posts와 users를 연결하는 다대다 관계 테이블입니다. 두 테이블을 각각 조인해 사람이 읽을 수 있는 이름과 제목을 만들어 냅니다.',
      relatedTables: ['likes', 'posts', 'users'],
      sql: `SELECT p.title, u.name AS liked_by, l.created_at
FROM likes l
JOIN posts p ON p.id = l.post_id
JOIN users u ON u.id = l.user_id
ORDER BY l.created_at;`,
    },
    {
      title: '게시판별 게시글 수와 평균 조회수',
      description:
        '게시판별 운영 현황 리포트를 만들어 주세요. 게시판 이름(name), 게시글 수(post_count), 평균 조회수(avg_views, 소수 첫째 자리까지)를 게시글이 많은 게시판부터 보여줍니다. 글이 한 건도 없는 게시판도 포함합니다.',
      hint: '한쪽이 비어도 모두 표시하는 외부 조인 + 그룹별 집계 패턴입니다.',
      explanation:
        'LEFT JOIN으로 boards 기준 모든 게시판을 살린 채 posts를 붙입니다. 게시글이 없는 게시판은 COUNT가 0, AVG가 NULL이 됩니다. ROUND로 평균을 소수 첫째 자리까지 다듬습니다.',
      relatedTables: ['boards', 'posts'],
      sql: `SELECT b.name, COUNT(p.id) AS post_count, ROUND(AVG(p.views), 1) AS avg_views
FROM boards b
LEFT JOIN posts p ON p.board_id = b.id
GROUP BY b.id, b.name
ORDER BY post_count DESC;`,
    },
    {
      title: '사용자별 작성 글 수',
      description:
        '사용자별로 작성한 글이 몇 개인지 보여주세요. 글을 한 건도 쓰지 않은 사용자도 0으로 표시되어야 합니다. 이름(name)과 글 수(post_count)를 글이 많은 순, 같으면 이름 가나다순으로 정렬합니다.',
      hint: '왼쪽 테이블의 모든 행을 보존하는 외부 조인 + 그룹 집계 패턴입니다.',
      explanation:
        'LEFT JOIN을 써야 글을 안 쓴 사용자도 결과에 남습니다. COUNT(p.id)는 NULL을 세지 않으므로 글이 없는 사용자는 자동으로 0이 됩니다. COUNT(*)였다면 1이 되어 틀린 답이 나옵니다.',
      relatedTables: ['users', 'posts'],
      sql: `SELECT u.name, COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
GROUP BY u.id, u.name
ORDER BY post_count DESC, u.name;`,
    },
    {
      title: '게시글별 댓글 수 포함',
      description:
        '모든 게시글의 제목(title)과 그 글에 달린 댓글 수(comment_count)를 댓글이 많은 순으로 보여주세요. 댓글이 0개인 게시글도 포함해야 합니다.',
      hint: '게시글 전체를 보존한 채 자식 댓글을 외부 조인으로 붙이는 패턴입니다.',
      explanation:
        'posts를 LEFT JOIN comments로 붙이면 댓글이 없는 글도 결과에 남습니다. COUNT(c.id)는 NULL을 무시하므로 댓글이 없는 글은 자연스럽게 0이 됩니다.',
      relatedTables: ['posts', 'comments'],
      sql: `SELECT p.title, COUNT(c.id) AS comment_count
FROM posts p
LEFT JOIN comments c ON c.post_id = p.id
GROUP BY p.id, p.title
ORDER BY comment_count DESC;`,
    },
    {
      title: '게시글별 좋아요 수 포함',
      description:
        '모든 게시글의 제목(title)과 받은 좋아요 수(like_count)를 좋아요가 많은 순으로 보여주세요. 좋아요가 0인 글도 표시되어야 합니다.',
      hint: '게시글 전체를 외부 조인으로 좋아요와 연결한 뒤 그룹 집계하는 패턴입니다.',
      explanation:
        'posts LEFT JOIN likes로 좋아요가 한 번도 없는 글도 살립니다. COUNT(l.id)가 NULL을 세지 않는 성질을 이용해 좋아요 0인 글을 0으로 표시합니다.',
      relatedTables: ['posts', 'likes'],
      sql: `SELECT p.title, COUNT(l.id) AS like_count
FROM posts p
LEFT JOIN likes l ON l.post_id = p.id
GROUP BY p.id, p.title
ORDER BY like_count DESC;`,
    },
    {
      title: '작성자가 받은 댓글 수',
      description:
        '작성자별로 자기 글에 받은 댓글이 총 몇 개인지 집계해서 보여주세요. 이름(name)과 받은 댓글 수(received_comments)를 댓글이 많은 순으로 정렬합니다.',
      hint: '세 테이블을 거쳐 한 명의 사용자가 가진 글들의 자식 행을 모두 합산하는 패턴입니다.',
      explanation:
        'users → posts(작성한 글) → comments(그 글의 댓글) 순으로 조인합니다. 댓글이 없는 글까지 살리려고 comments는 LEFT JOIN, 글이 있어야만 의미가 있으니 posts는 INNER JOIN을 썼습니다.',
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
      description:
        '각 게시글의 참여도 점수를 계산해 보여주세요. 점수는 조회수에 댓글 수 × 10, 좋아요 수 × 20을 더한 값입니다. 제목(title), 조회수(views), 댓글 수(comment_count), 좋아요 수(like_count), 참여도 점수(engagement_score)를 점수가 높은 순으로 출력합니다.',
      hint: '여러 자식 집계를 미리 만들어 두고 본문과 합치는 CTE + 외부 조인 패턴입니다.',
      explanation:
        'WITH 절로 댓글·좋아요 집계를 미리 만든 뒤 posts에 LEFT JOIN으로 붙입니다. COALESCE로 NULL을 0으로 바꿔야 가중치 계산 시 NULL 전염을 피할 수 있습니다.',
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
      description:
        '회원 가입은 했지만 글을 한 건도 쓰지 않은 사용자를 찾아 아이디(id), 이름(name), 이메일(email)을 아이디 순으로 보여주세요.',
      hint: '한쪽에 매칭되는 행이 전혀 없는 경우를 골라내는 안티조인 패턴입니다.',
      explanation:
        'LEFT JOIN 후 WHERE p.id IS NULL 조건으로 매칭 행이 없는 사용자만 남깁니다. NOT EXISTS 서브쿼리로도 같은 결과를 만들 수 있으며, 데이터 양에 따라 성능 차이가 납니다.',
      relatedTables: ['users', 'posts'],
      sql: `SELECT u.id, u.name, u.email
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
WHERE p.id IS NULL
ORDER BY u.id;`,
    },
    {
      title: '댓글 없는 게시글',
      description:
        '아직 댓글이 한 개도 달리지 않은 게시글의 아이디(id)와 제목(title)을 아이디 순으로 보여주세요.',
      hint: '자식 행이 존재하지 않는 부모만 골라내는 안티조인 패턴입니다.',
      explanation:
        'posts LEFT JOIN comments 후 c.id IS NULL로 댓글이 없는 글만 남깁니다. "관련 자식이 없는 부모" 패턴은 미사용 자원, 미주문 고객 등 다양하게 응용됩니다.',
      relatedTables: ['posts', 'comments'],
      sql: `SELECT p.id, p.title
FROM posts p
LEFT JOIN comments c ON c.post_id = p.id
WHERE c.id IS NULL
ORDER BY p.id;`,
    },
    {
      title: '게시판별 조회수 1위 글',
      description:
        '각 게시판에서 조회수가 가장 높은 게시글 한 건씩만 뽑아 보여주세요. 게시판 이름(board_name), 제목(title), 조회수(views)를 조회수가 큰 순으로 정렬합니다.',
      hint: '그룹별 순위를 매긴 뒤 1등만 남기는 윈도우 함수 패턴입니다.',
      explanation:
        'ROW_NUMBER() OVER (PARTITION BY board_id ORDER BY views DESC)로 게시판마다 조회수 순위를 매기고, rank_no = 1인 행만 남깁니다. 동점을 모두 포함하려면 RANK()를 쓰면 됩니다.',
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
      description:
        '대댓글(다른 댓글에 달린 댓글)만 추려 어떤 원댓글에 달린 답글인지 보여주세요. 댓글 아이디(comment_id), 답글 내용(reply_content), 원댓글 내용(parent_content)을 아이디 순으로 출력합니다.',
      hint: '하나의 테이블을 자기 자신과 연결하는 셀프 조인 패턴입니다.',
      explanation:
        'comments 테이블을 child / parent 두 별칭으로 두고 child.parent_id = parent.id로 자기 자신과 조인합니다. 트리/계층 구조를 평면화할 때 자주 쓰는 기법입니다.',
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
      description:
        '활성 상태이지만 게시글이 한 건도 없는 빈 게시판을 찾아 아이디(id)와 이름(name)을 보여주세요.',
      hint: '그룹 집계 후 개수 조건으로 그룹 자체를 거르는 HAVING 패턴입니다.',
      explanation:
        'LEFT JOIN으로 모든 활성 게시판을 살린 뒤 HAVING COUNT(p.id) = 0으로 자식이 없는 그룹만 남깁니다. WHERE는 행 단위, HAVING은 그룹 단위 필터라는 차이를 기억해 두세요.',
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
      description:
        '날짜별로 게시글이 몇 건 작성됐고 그날 글들의 총 조회수가 얼마인지 보여주세요. 작성일(created_at), 글 수(post_count), 총 조회수(total_views)를 날짜순으로 출력합니다.',
      hint: '날짜 컬럼을 기준으로 그룹을 만들어 개수와 합계를 동시에 집계하는 패턴입니다.',
      explanation:
        'GROUP BY created_at으로 같은 날 작성된 글을 묶고 COUNT와 SUM을 함께 구합니다. 한 그룹 안에서 여러 집계 함수를 동시에 쓸 수 있다는 게 GROUP BY의 강력한 점입니다.',
      relatedTables: ['posts'],
      sql: `SELECT created_at, COUNT(*) AS post_count, SUM(views) AS total_views
FROM posts
GROUP BY created_at
ORDER BY created_at;`,
    },
    {
      title: '좋아요 대비 댓글 비율',
      description:
        '게시글마다 댓글 수와 좋아요 수, 그리고 좋아요 대비 댓글 비율(comment_per_like)을 소수 둘째 자리까지 보여주세요. 비율이 높은 순으로 정렬하고, 좋아요가 0이어서 0으로 나누는 경우는 NULL이 되어야 합니다.',
      hint: '여러 자식 테이블을 동시에 외부 조인할 때 중복을 막는 DISTINCT 집계 + 0 나누기 방어 패턴입니다.',
      explanation:
        'comments와 likes를 동시에 LEFT JOIN하면 카티시안 곱이 생기므로 COUNT(DISTINCT ...)로 중복을 제거합니다. NULLIF(x, 0)는 분모가 0일 때 NULL로 바꿔 0 나누기 오류를 막는 정석 기법입니다.',
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
      description:
        '도시(city)와 역할(role)을 동시에 묶어 각 조합에 몇 명이 있는지 집계해 보여주세요. 도시순, 같은 도시 안에서는 역할순으로 정렬합니다.',
      hint: '두 컬럼을 동시에 묶어 다차원으로 집계하는 패턴입니다.',
      explanation:
        'GROUP BY에 여러 컬럼을 나열하면 그 조합 단위로 묶입니다. 도시 × 역할 행렬을 만들 때 자주 쓰며, 시각화 도구의 피벗 테이블 입력으로 그대로 사용됩니다.',
      relatedTables: ['users'],
      sql: `SELECT city, role, COUNT(*) AS user_count
FROM users
GROUP BY city, role
ORDER BY city, role;`,
    },
    {
      title: '게시글 종합 리포트',
      description:
        '게시글 운영 리포트를 만들어 주세요. 게시판 이름(board_name), 제목(title), 작성자 이름(author), 조회수(views), 댓글 수(comment_count), 좋아요 수(like_count)를 조회수가 많은 순으로 보여줍니다.',
      hint: '여러 테이블을 INNER/OUTER 조인으로 한꺼번에 묶고 DISTINCT 집계로 중복을 제거하는 패턴입니다.',
      explanation:
        '게시판·작성자는 반드시 있어야 하니 INNER JOIN, 댓글·좋아요는 없어도 되니 LEFT JOIN으로 붙입니다. 두 자식 테이블을 동시에 조인하면 행이 곱해지므로 COUNT(DISTINCT)로 정확한 개수를 구합니다.',
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
