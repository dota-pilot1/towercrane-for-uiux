-- SQL practice seed data
-- This database is separate from the Towercrane application database.

PRAGMA foreign_keys = ON;

CREATE TABLE users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    UNIQUE NOT NULL,
    age        INTEGER,
    city       TEXT,
    role       TEXT    DEFAULT 'USER',
    created_at TEXT    DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT    DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE profiles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL UNIQUE,
    bio         TEXT,
    website     TEXT,
    company     TEXT,
    updated_at  TEXT    DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE boards (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT,
    category    TEXT    NOT NULL,
    is_active   INTEGER DEFAULT 1
);

CREATE TABLE posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id   INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    title      TEXT    NOT NULL,
    content    TEXT,
    views      INTEGER DEFAULT 0,
    is_pinned  INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT    DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT    DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (board_id) REFERENCES boards(id),
    FOREIGN KEY (user_id)  REFERENCES users(id)
);

CREATE TABLE comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    parent_id  INTEGER,
    content    TEXT    NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT    DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT    DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (post_id)  REFERENCES posts(id),
    FOREIGN KEY (user_id)  REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES comments(id)
);

CREATE TABLE likes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    created_at TEXT    DEFAULT (datetime('now', 'localtime')),
    UNIQUE(post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO users (id, name, email, age, city, role) VALUES
(1,  '김민준', 'minjun@example.com',  28, '서울', 'ADMIN'),
(2,  '이서연', 'seoyeon@example.com', 32, '부산', 'USER'),
(3,  '박지훈', 'jihoon@example.com',  25, '서울', 'USER'),
(4,  '최수아', 'sua@example.com',     30, '대구', 'USER'),
(5,  '정하은', 'haeun@example.com',   27, '서울', 'USER'),
(6,  '강태양', 'taeyang@example.com', 35, '인천', 'USER'),
(7,  '윤채원', 'chaewon@example.com', 24, '서울', 'USER'),
(8,  '임도현', 'dohyeon@example.com', 29, '광주', 'USER'),
(9,  '한소희', 'sohee@example.com',   31, '서울', 'USER'),
(10, '오준서', 'junseo@example.com',  26, '대전', 'USER');

INSERT INTO profiles (id, user_id, bio, website, company) VALUES
(1,  1,  '풀스택 개발자입니다.',          'https://minjun.dev',    '(주)테크컴퍼니'),
(2,  2,  'UI/UX 디자이너',               'https://seoyeon.me',    '디자인 스튜디오'),
(3,  3,  '백엔드 개발자 지망생',          NULL,                    NULL),
(4,  4,  '데이터 분석가',                 'https://sua-data.io',   '데이터랩'),
(5,  5,  '프리랜서 개발자',               'https://haeun.dev',     NULL),
(6,  6,  '15년차 시니어 개발자',          'https://taeyang.io',    '(주)스타트업'),
(7,  7,  '대학교 4학년, 취준중',          NULL,                    NULL),
(8,  8,  '모바일 앱 개발자',              'https://dohyeon.kr',    '앱스튜디오'),
(9,  9,  'DevOps 엔지니어',              'https://sohee.dev',     '클라우드컴퍼니'),
(10, 10, '신입 개발자',                   NULL,                    NULL);

INSERT INTO boards (id, name, description, category, is_active) VALUES
(1, '자유게시판',   '자유롭게 이야기해요',          'GENERAL', 1),
(2, '질문게시판',   '개발 관련 질문을 올려요',       'QNA',     1),
(3, '공지사항',     '중요 공지사항입니다',           'NOTICE',  1),
(4, '취업/이직',    '취업과 이직 정보를 공유해요',   'CAREER',  1),
(5, '프로젝트',     '사이드 프로젝트를 공유해요',    'PROJECT', 1),
(6, '구인구직',     '팀원을 구해요 (운영 종료)',     'RECRUIT', 0);

INSERT INTO posts (id, board_id, user_id, title, content, views, is_pinned, is_deleted) VALUES
(1,  1, 1,  '안녕하세요 처음 가입했습니다',        '반갑습니다 잘 부탁드려요',                    120, 0, 0),
(2,  2, 3,  'Spring Boot JPA N+1 문제 질문',       'N+1 문제가 뭔지 이해가 안 돼요',              340, 0, 0),
(3,  1, 2,  '오늘 날씨 너무 좋네요',               '산책하고 싶다',                               89,  0, 0),
(4,  4, 6,  '이직 준비 팁 공유합니다',             '3번 이직한 경험을 공유합니다',                892, 0, 0),
(5,  2, 7,  'React hooks 질문있어요',              'useEffect 의존성 배열 헷갈려요',              256, 0, 0),
(6,  3, 1,  '서버 점검 안내',                      '2024-05-01 새벽 2시 점검 예정',               445, 1, 0),
(7,  5, 5,  '토이프로젝트 팀원 구합니다',          'React + Spring Boot 프로젝트 같이해요',       678, 0, 0),
(8,  4, 9,  '신입 포트폴리오 피드백 요청',         '제 포트폴리오 봐주실 분 계신가요?',           312, 0, 0),
(9,  1, 4,  '개발자 번아웃 극복 방법',             '요즘 너무 힘드네요',                          534, 0, 0),
(10, 2, 8,  'Docker 처음 써보는데 도움말 주세요',  'Docker 기초부터 배우고 싶어요',               198, 0, 0),
(11, 5, 3,  'SQL 연습 프로젝트 공유',              'SQL 공부하면서 만든 프로젝트예요',            145, 0, 0),
(12, 4, 10, '개발 공부 어떻게 시작했나요?',        '독학으로 개발 시작한 분들 이야기 듣고 싶어요', 423, 0, 0),
(13, 3, 1,  '이용 규칙 안내',                      '커뮤니티 이용 규칙을 확인해주세요',           890, 1, 0),
(14, 1, 7,  '삭제된 게시글 테스트',                '이 글은 삭제 처리된 글입니다',                12,  0, 1),
(15, 2, 5,  'Git rebase vs merge 차이가 뭔가요?', 'rebase 쓰면 이력이 깔끔하다던데',             178, 0, 0);

INSERT INTO comments (id, post_id, user_id, parent_id, content, is_deleted) VALUES
(1,  1,  2,  NULL, '환영합니다!',                                        0),
(2,  1,  3,  NULL, '반갑습니다~ 잘 부탁드려요',                          0),
(3,  1,  5,  1,    '저도 환영해요! (1번 댓글의 대댓글)',                  0),
(4,  2,  1,  NULL, 'fetch join을 사용해보세요',                          0),
(5,  2,  6,  NULL, 'EntityGraph 어노테이션도 좋아요',                    0),
(6,  2,  9,  NULL, '배치 사이즈 설정도 방법 중 하나입니다',              0),
(7,  2,  3,  4,    '감사합니다! fetch join 써봤는데 해결됐어요',          0),
(8,  2,  1,  7,    '다행이네요 :)',                                       0),
(9,  4,  3,  NULL, '정말 도움됩니다 감사해요',                           0),
(10, 4,  7,  NULL, '저도 이직 준비 중인데 많은 도움이 됐어요',           0),
(11, 4,  10, NULL, '공유 감사합니다!',                                   0),
(12, 4,  2,  9,    '저도 비슷한 고민이었어요',                           0),
(13, 5,  1,  NULL, '의존성 배열에 사용하는 값을 모두 넣어야 해요',       0),
(14, 5,  4,  NULL, 'eslint-plugin-react-hooks 설치하면 자동으로 알려줘요', 0),
(15, 5,  7,  13,   '오 그런 방법이 있었군요 감사합니다',                 0),
(16, 7,  2,  NULL, '저 참여하고 싶어요!',                                0),
(17, 7,  8,  NULL, '백엔드 포지션으로 참여 가능할까요?',                 0),
(18, 7,  5,  16,   'DM 드릴게요!',                                       0),
(19, 9,  5,  NULL, '저도 비슷한 경험이 있어요. 짧은 휴식이 도움됐어요', 0),
(20, 9,  2,  NULL, '운동이 최고예요',                                    0),
(21, 9,  6,  NULL, '삭제된 댓글 테스트',                                 1),
(22, 10, 6,  NULL, 'Docker 공식 문서부터 시작하세요',                    0),
(23, 10, 9,  22,   '공식 문서 + 강의 추천드려요',                        0),
(24, 11, 1,  NULL, '좋은 프로젝트네요!',                                 0),
(25, 12, 5,  NULL, '온라인 강의 추천드려요',                             0),
(26, 12, 6,  NULL, '유튜브 무료 강의도 많아요',                          0),
(27, 12, 10, 25,   '어떤 강의 들으셨어요?',                              0),
(28, 12, 5,  27,   '스프링 입문 강의 들었어요',                          0);

INSERT INTO likes (id, post_id, user_id) VALUES
(1,  4,  1),
(2,  4,  2),
(3,  4,  3),
(4,  4,  7),
(5,  4,  10),
(6,  7,  1),
(7,  7,  4),
(8,  7,  6),
(9,  9,  2),
(10, 9,  5),
(11, 6,  3),
(12, 6,  7),
(13, 2,  3),
(14, 2,  8),
(15, 12, 4),
(16, 12, 9),
(17, 1,  5),
(18, 11, 2),
(19, 11, 9),
(20, 8,  1),
(21, 13, 2),
(22, 13, 4),
(23, 13, 6),
(24, 15, 3),
(25, 15, 7);
