-- @title 영업/CRM 세트
-- @slug sales-crm
-- @level intermediate
-- @description 거래처, 담당자, 리드, 영업기회, 활동, 계약으로 영업 퍼널과 전환율을 연습합니다.
-- @topics FUNNEL, SUBQUERY, GROUP BY, CONVERSION, DATE
-- @tables accounts, contacts, sales_reps, leads, opportunities, activities, contracts
-- @recommendedQueries SELECT stage, COUNT(*) AS opportunity_count, SUM(expected_amount) AS pipeline FROM opportunities GROUP BY stage; | SELECT r.name, COUNT(o.id) AS opportunity_count FROM sales_reps r LEFT JOIN opportunities o ON o.sales_rep_id = r.id GROUP BY r.id; | SELECT a.name, c.signed_at, c.contract_amount FROM contracts c JOIN accounts a ON a.id = c.account_id ORDER BY c.contract_amount DESC;

PRAGMA foreign_keys = ON;

CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  region TEXT NOT NULL
);

CREATE TABLE contacts (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE sales_reps (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  team TEXT NOT NULL
);

CREATE TABLE leads (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL,
  sales_rep_id INTEGER NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (sales_rep_id) REFERENCES sales_reps(id)
);

CREATE TABLE opportunities (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL,
  sales_rep_id INTEGER NOT NULL,
  lead_id INTEGER,
  name TEXT NOT NULL,
  stage TEXT NOT NULL,
  expected_amount INTEGER NOT NULL,
  expected_close_date TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (sales_rep_id) REFERENCES sales_reps(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE activities (
  id INTEGER PRIMARY KEY,
  opportunity_id INTEGER NOT NULL,
  sales_rep_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL,
  memo TEXT,
  occurred_at TEXT NOT NULL,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
  FOREIGN KEY (sales_rep_id) REFERENCES sales_reps(id)
);

CREATE TABLE contracts (
  id INTEGER PRIMARY KEY,
  opportunity_id INTEGER NOT NULL UNIQUE,
  account_id INTEGER NOT NULL,
  contract_amount INTEGER NOT NULL,
  signed_at TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

INSERT INTO accounts (id, name, industry, region) VALUES
(1, '넥스트제조', '제조', '경기'),
(2, '마루커머스', '유통', '서울'),
(3, '비전교육', '교육', '대전'),
(4, '케어헬스', '의료', '부산');

INSERT INTO contacts (id, account_id, name, title, email) VALUES
(1, 1, '정공장', 'IT팀장', 'factory@example.com'),
(2, 2, '한MD', '서비스기획', 'md@example.com'),
(3, 3, '오교수', '센터장', 'edu@example.com'),
(4, 4, '문원장', '대표', 'care@example.com');

INSERT INTO sales_reps (id, name, team) VALUES
(1, '김세일', 'A팀'),
(2, '이영업', 'A팀'),
(3, '박성장', 'B팀');

INSERT INTO leads (id, account_id, sales_rep_id, source, status, created_at) VALUES
(1, 1, 1, '전시회', 'QUALIFIED', '2026-07-01'),
(2, 2, 2, '웹문의', 'QUALIFIED', '2026-07-02'),
(3, 3, 3, '소개', 'NEW', '2026-07-03'),
(4, 4, 1, '광고', 'CONVERTED', '2026-07-04');

INSERT INTO opportunities (id, account_id, sales_rep_id, lead_id, name, stage, expected_amount, expected_close_date) VALUES
(1, 1, 1, 1, 'MES 리포트 구축', 'PROPOSAL', 45000000, '2026-08-15'),
(2, 2, 2, 2, '주문 통합 CRM', 'NEGOTIATION', 32000000, '2026-08-30'),
(3, 3, 3, 3, '학습 상담 자동화', 'DISCOVERY', 18000000, '2026-09-10'),
(4, 4, 1, 4, '예약 관리 시스템', 'WON', 55000000, '2026-07-25');

INSERT INTO activities (id, opportunity_id, sales_rep_id, activity_type, memo, occurred_at) VALUES
(1, 1, 1, 'CALL', '요구사항 1차 확인', '2026-07-05'),
(2, 1, 1, 'MEETING', '현장 미팅', '2026-07-10'),
(3, 2, 2, 'EMAIL', '견적서 발송', '2026-07-08'),
(4, 4, 1, 'MEETING', '계약 조건 확정', '2026-07-20');

INSERT INTO contracts (id, opportunity_id, account_id, contract_amount, signed_at, status) VALUES
(1, 4, 4, 55000000, '2026-07-25', 'ACTIVE');
