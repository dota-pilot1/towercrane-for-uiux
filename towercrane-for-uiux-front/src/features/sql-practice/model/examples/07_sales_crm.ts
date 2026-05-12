import { defineExampleSet } from './shared'

export const salesCrmExamples = defineExampleSet('07_sales_crm.sql', {
  beginner: [
    {
      title: '거래처 지역별 수',
      description: '거래처(accounts)를 지역(region) 기준으로 묶어 각 지역에 거래처가 몇 곳 있는지 보여 주세요. 거래처가 많은 지역이 위로 오도록 정렬합니다.',
      hint: '지역별 집계',
      explanation: 'GROUP BY로 region별 그룹을 만들고 COUNT(*)로 거래처 수를 센 뒤 ORDER BY로 내림차순 정렬합니다. 가장 기본적인 집계 + 정렬 패턴입니다.',
      relatedTables: ['accounts'],
      sql: `SELECT region, COUNT(*) AS account_count
FROM accounts
GROUP BY region
ORDER BY account_count DESC;`,
    },
    {
      title: '거래처 산업별 수',
      description: '거래처(accounts)를 산업군(industry) 기준으로 묶어 산업별 거래처 수를 보여 주세요. 거래처가 많은 산업이 먼저 보이게 정렬합니다.',
      hint: '산업별 집계',
      explanation: 'GROUP BY industry로 그룹을 만들고 COUNT(*)로 거래처 수를 셉니다. 분류 컬럼만 바꿔 집계하는 전형적인 카테고리 그룹화입니다.',
      relatedTables: ['accounts'],
      sql: `SELECT industry, COUNT(*) AS account_count
FROM accounts
GROUP BY industry
ORDER BY account_count DESC;`,
    },
    {
      title: '영업 담당자 목록',
      description: '영업 담당자(sales_reps)의 식별자(id), 이름(name), 소속 팀(team)을 한 화면에서 확인할 수 있게 정리해 주세요. 팀 순서, 그 안에서 이름 순서로 정렬합니다.',
      hint: '단순 조회와 다중 정렬',
      explanation: 'ORDER BY에 두 개 컬럼을 콤마로 나열하면 첫 번째 컬럼이 우선, 같은 값이면 두 번째 컬럼으로 정렬됩니다.',
      relatedTables: ['sales_reps'],
      sql: `SELECT id, name, team
FROM sales_reps
ORDER BY team, name;`,
    },
    {
      title: '리드 상태별 수',
      description: '리드(leads)를 진행 상태(status, 예: NEW/QUALIFIED/CONVERTED) 기준으로 묶어 상태별 건수를 보여 주세요. 많은 상태가 먼저 보이게 정렬합니다.',
      hint: '상태별 카운트',
      explanation: 'GROUP BY status + COUNT(*) 조합으로 상태값별 개수를 산출합니다. 영업 파이프라인의 가장 단순한 단면입니다.',
      relatedTables: ['leads'],
      sql: `SELECT status, COUNT(*) AS lead_count
FROM leads
GROUP BY status
ORDER BY lead_count DESC;`,
    },
    {
      title: '리드 소스별 수',
      description: '리드(leads)가 어디에서 유입됐는지 소스(source, 예: WEB/REFERRAL/COLD_CALL)별로 건수를 보여 주세요. 유입이 많은 소스가 위로 오게 정렬합니다.',
      hint: '유입 채널별 집계',
      explanation: 'source 컬럼으로 GROUP BY 후 COUNT로 채널별 효과를 비교하는 마케팅 분석 기본 쿼리입니다.',
      relatedTables: ['leads'],
      sql: `SELECT source, COUNT(*) AS lead_count
FROM leads
GROUP BY source
ORDER BY lead_count DESC;`,
    },
    {
      title: '영업기회 단계별 파이프라인',
      description: '영업기회(opportunities)를 영업 단계(stage, 예: PROSPECT/PROPOSAL/NEGOTIATION/WON/LOST)별로 묶어 건수와 예상 금액(expected_amount) 합계를 보여 주세요. 파이프라인 금액이 큰 단계가 먼저 오게 정렬합니다.',
      hint: '단계별 합계 + 카운트',
      explanation: '한 그룹에서 COUNT와 SUM을 동시에 뽑아 단계별 현황을 한 줄로 요약하는 파이프라인 리포트 패턴입니다.',
      relatedTables: ['opportunities'],
      sql: `SELECT stage, COUNT(*) AS opportunity_count, SUM(expected_amount) AS pipeline
FROM opportunities
GROUP BY stage
ORDER BY pipeline DESC;`,
    },
    {
      title: '예상 금액 큰 영업기회',
      description: '예상 금액(expected_amount)이 큰 영업기회(opportunities)부터 차례로 이름, 단계(stage), 예상 금액을 보여 주세요.',
      hint: '단순 정렬',
      explanation: 'ORDER BY expected_amount DESC로 큰 금액 순으로 줄세우는 가장 단순한 랭킹 쿼리입니다.',
      relatedTables: ['opportunities'],
      sql: `SELECT name, stage, expected_amount
FROM opportunities
ORDER BY expected_amount DESC;`,
    },
    {
      title: '활동 유형별 수',
      description: '영업 활동(activities)을 활동 유형(activity_type, 예: CALL/EMAIL/MEETING)별로 묶어 활동 건수를 집계해 주세요. 많이 한 유형이 위로 오게 정렬합니다.',
      hint: '유형별 카운트',
      explanation: 'GROUP BY activity_type + COUNT(*)로 활동 분포를 확인합니다. 영업팀이 어떤 활동에 시간을 많이 쓰는지 한눈에 보이는 패턴입니다.',
      relatedTables: ['activities'],
      sql: `SELECT activity_type, COUNT(*) AS activity_count
FROM activities
GROUP BY activity_type
ORDER BY activity_count DESC;`,
    },
    {
      title: '계약 금액 큰 순서',
      description: '계약(contracts) 데이터를 계약 금액(contract_amount)이 큰 순서로 정리해 거래처 식별자(account_id), 금액, 체결일(signed_at), 상태(status)를 보여 주세요.',
      hint: '금액 내림차순',
      explanation: 'ORDER BY contract_amount DESC로 큰 계약부터 노출합니다. 추가 가공 없이 정렬만 적용하는 기본 패턴입니다.',
      relatedTables: ['contracts'],
      sql: `SELECT account_id, contract_amount, signed_at, status
FROM contracts
ORDER BY contract_amount DESC;`,
    },
    {
      title: '월별 신규 리드',
      description: '리드(leads)의 생성일(created_at)을 월 단위로 잘라 매월 새 리드가 몇 건씩 들어왔는지 보여 주세요. 시간 순서대로 정렬합니다.',
      hint: '월 단위 시계열 집계',
      explanation: 'substr(created_at, 1, 7)로 YYYY-MM 형태의 문자열을 만들어 월별로 GROUP BY 합니다. 시간 트렌드 분석에서 자주 쓰는 단순 시계열 그룹핑입니다.',
      relatedTables: ['leads'],
      sql: `SELECT substr(created_at, 1, 7) AS lead_month, COUNT(*) AS lead_count
FROM leads
GROUP BY substr(created_at, 1, 7)
ORDER BY lead_month;`,
    },
  ],
  intermediate: [
    {
      title: '거래처와 담당자',
      description: '거래처(accounts)와 그 거래처의 담당자(contacts)를 짝지어 거래처명, 담당자명, 직책(title), 이메일(email)을 한 줄에 보여 주세요. 거래처 이름 순서로 정렬합니다.',
      hint: '두 테이블 조인',
      explanation: 'contacts.account_id로 accounts.id와 연결해 두 테이블의 컬럼을 한 행에 모읍니다. 가장 기본적인 1:N 조인 패턴입니다.',
      relatedTables: ['accounts', 'contacts'],
      sql: `SELECT a.name AS account_name, c.name AS contact_name, c.title, c.email
FROM contacts c
JOIN accounts a ON a.id = c.account_id
ORDER BY a.name;`,
    },
    {
      title: '리드와 영업 담당자',
      description: '각 리드(leads)에 어떤 거래처와 어떤 영업 담당자가 매칭되어 있는지, 그리고 그 리드의 유입 소스(source)와 상태(status)를 함께 보여 주세요. 리드 생성일 순서로 정렬합니다.',
      hint: '3개 테이블 조인',
      explanation: 'leads를 중심으로 accounts, sales_reps를 각각 JOIN해 리드 한 건의 전체 맥락(누가/어디서/어떤 상태)을 한 행에 모읍니다.',
      relatedTables: ['leads', 'sales_reps', 'accounts'],
      sql: `SELECT a.name AS account_name, r.name AS rep_name, l.source, l.status
FROM leads l
JOIN accounts a ON a.id = l.account_id
JOIN sales_reps r ON r.id = l.sales_rep_id
ORDER BY l.created_at;`,
    },
    {
      title: '담당자별 리드 수',
      description: '영업 담당자(sales_reps)별로 본인이 보유한 리드 수를 보여 주세요. 리드가 아직 한 건도 없는 담당자도 0으로 포함되어야 합니다.',
      hint: 'LEFT JOIN + 그룹 카운트',
      explanation: 'sales_reps를 왼쪽 기준으로 LEFT JOIN하면 리드가 없는 담당자도 결과에 남고, COUNT(l.id)는 매칭이 없을 때 0이 됩니다.',
      relatedTables: ['sales_reps', 'leads'],
      sql: `SELECT r.name, COUNT(l.id) AS lead_count
FROM sales_reps r
LEFT JOIN leads l ON l.sales_rep_id = r.id
GROUP BY r.id, r.name
ORDER BY lead_count DESC;`,
    },
    {
      title: '담당자별 영업기회 수',
      description: '영업 담당자(sales_reps)별로 담당 중인 영업기회(opportunities) 수를 보여 주세요. 영업기회가 없는 담당자도 0으로 함께 보이게 합니다.',
      hint: 'LEFT JOIN + 카운트',
      explanation: '담당자 기준 LEFT JOIN으로 비어 있는 담당자까지 보존한 뒤 GROUP BY로 묶어 담당 건수를 세는 패턴입니다.',
      relatedTables: ['sales_reps', 'opportunities'],
      sql: `SELECT r.name, COUNT(o.id) AS opportunity_count
FROM sales_reps r
LEFT JOIN opportunities o ON o.sales_rep_id = r.id
GROUP BY r.id, r.name
ORDER BY opportunity_count DESC;`,
    },
    {
      title: '거래처별 파이프라인',
      description: '거래처(accounts)별로 영업기회(opportunities)의 예상 금액(expected_amount) 합계를 보여 주세요. 파이프라인이 큰 거래처가 먼저 오게 정렬합니다.',
      hint: '조인 후 합계',
      explanation: '거래처 단위로 영업기회를 JOIN한 뒤 SUM으로 합산해 거래처별 미래 매출 잠재력을 산출합니다.',
      relatedTables: ['accounts', 'opportunities'],
      sql: `SELECT a.name, SUM(o.expected_amount) AS pipeline
FROM accounts a
JOIN opportunities o ON o.account_id = a.id
GROUP BY a.id, a.name
ORDER BY pipeline DESC;`,
    },
    {
      title: '영업기회별 활동 수',
      description: '각 영업기회(opportunities)에 얼마나 많은 영업 활동(activities)이 쌓였는지 보여 주세요. 활동이 한 건도 없는 영업기회도 0으로 포함합니다.',
      hint: 'LEFT JOIN + 카운트',
      explanation: 'opportunities를 왼쪽으로 두고 activities를 LEFT JOIN하면 활동이 없는 영업기회도 결과에 남아 0건으로 집계됩니다.',
      relatedTables: ['opportunities', 'activities'],
      sql: `SELECT o.name, COUNT(a.id) AS activity_count
FROM opportunities o
LEFT JOIN activities a ON a.opportunity_id = o.id
GROUP BY o.id, o.name
ORDER BY activity_count DESC;`,
    },
    {
      title: '계약된 거래처',
      description: '계약(contracts)이 체결된 거래처들의 이름, 계약 금액(contract_amount), 체결일(signed_at), 계약 상태(status)를 보여 주세요. 금액이 큰 계약이 먼저 보이도록 정렬합니다.',
      hint: '계약 + 거래처 조인',
      explanation: 'contracts와 accounts를 account_id로 연결해 계약 행에 거래처 이름을 붙입니다. 계약 단건 리포트의 기본 형태입니다.',
      relatedTables: ['contracts', 'accounts'],
      sql: `SELECT a.name, c.contract_amount, c.signed_at, c.status
FROM contracts c
JOIN accounts a ON a.id = c.account_id
ORDER BY c.contract_amount DESC;`,
    },
    {
      title: '팀별 예상 매출',
      description: '영업 팀(team)별로 보유한 영업기회의 예상 금액(expected_amount) 합계를 보여 주세요. 합계가 큰 팀이 먼저 오게 정렬합니다.',
      hint: '팀 단위 합계',
      explanation: 'sales_reps와 opportunities를 조인한 뒤 sales_reps.team으로 GROUP BY해 팀 단위로 SUM합니다. 사람이 아닌 조직 단위 집계 패턴입니다.',
      relatedTables: ['sales_reps', 'opportunities'],
      sql: `SELECT r.team, SUM(o.expected_amount) AS pipeline
FROM sales_reps r
JOIN opportunities o ON o.sales_rep_id = r.id
GROUP BY r.team
ORDER BY pipeline DESC;`,
    },
    {
      title: 'WON 영업기회와 계약',
      description: '수주(WON) 단계의 영업기회와, 그 영업기회에 연결된 계약(contracts)의 금액과 체결일을 함께 보여 주세요. 아직 계약이 체결되지 않은 WON 건도 결과에 남아 있어야 합니다.',
      hint: '조건 필터 + LEFT JOIN',
      explanation: '먼저 stage = WON으로 필터한 뒤 contracts를 LEFT JOIN해 계약 정보가 없는 행은 NULL로 채웁니다. 진행 단계 기준 후속 추적 패턴입니다.',
      relatedTables: ['opportunities', 'contracts'],
      sql: `SELECT o.name, o.expected_amount, c.contract_amount, c.signed_at
FROM opportunities o
LEFT JOIN contracts c ON c.opportunity_id = o.id
WHERE o.stage = 'WON'
ORDER BY c.signed_at;`,
    },
    {
      title: '활동 담당자와 영업기회',
      description: '각 영업 활동(activities)에 대해 어떤 담당자가, 어떤 영업기회에서, 어떤 유형의 활동을 언제 수행했는지 한 줄로 보여 주세요. 발생 시각 순으로 정렬합니다.',
      hint: '3개 테이블 조인',
      explanation: 'activities를 중심으로 opportunities, sales_reps를 각각 연결해 활동 한 건의 전체 맥락을 한 행으로 펼치는 다중 조인 패턴입니다.',
      relatedTables: ['activities', 'opportunities', 'sales_reps'],
      sql: `SELECT r.name AS rep_name, o.name AS opportunity_name, a.activity_type, a.occurred_at
FROM activities a
JOIN opportunities o ON o.id = a.opportunity_id
JOIN sales_reps r ON r.id = a.sales_rep_id
ORDER BY a.occurred_at;`,
    },
  ],
  advanced: [
    {
      title: '리드에서 계약까지 전환',
      description: '리드 상태(status)별로, 그 리드가 영업기회로 얼마나 발전했고 또 계약까지 이어진 건수가 얼마나 되는지 한 줄에 보여 주세요. 깔때기(funnel) 단계별 전환을 한눈에 보고 싶습니다.',
      hint: '깔때기(Funnel) 분석',
      explanation: 'leads → opportunities → contracts로 LEFT JOIN을 연결한 뒤 COUNT(DISTINCT ...)로 각 단계의 고유 건수를 셉니다. NULL이 끼는 LEFT JOIN 체인에서 중복을 막기 위해 DISTINCT가 핵심입니다.',
      relatedTables: ['leads', 'opportunities', 'contracts'],
      sql: `SELECT
  l.status,
  COUNT(DISTINCT l.id) AS lead_count,
  COUNT(DISTINCT o.id) AS opportunity_count,
  COUNT(DISTINCT c.id) AS contract_count
FROM leads l
LEFT JOIN opportunities o ON o.lead_id = l.id
LEFT JOIN contracts c ON c.opportunity_id = o.id
GROUP BY l.status
ORDER BY lead_count DESC;`,
    },
    {
      title: '담당자별 계약 전환율',
      description: '영업 담당자별로 영업기회 수, 계약 수, 그리고 영업기회 대비 계약 비율(%)을 소수점 1자리로 보여 주세요. 비율이 높은 담당자가 먼저 보이게 합니다.',
      hint: '비율 계산 + 0 나눗셈 방어',
      explanation: 'COUNT(c.id) * 100.0 / COUNT(o.id)로 전환율을 구하되, 영업기회가 0인 담당자에서 발생하는 0 나눗셈을 NULLIF로 막고 ROUND로 자릿수를 정리합니다.',
      relatedTables: ['sales_reps', 'opportunities', 'contracts'],
      sql: `SELECT
  r.name,
  COUNT(o.id) AS opportunity_count,
  COUNT(c.id) AS contract_count,
  ROUND(COUNT(c.id) * 100.0 / NULLIF(COUNT(o.id), 0), 1) AS contract_rate
FROM sales_reps r
LEFT JOIN opportunities o ON o.sales_rep_id = r.id
LEFT JOIN contracts c ON c.opportunity_id = o.id
GROUP BY r.id, r.name
ORDER BY contract_rate DESC;`,
    },
    {
      title: '단계별 평균 예상 금액',
      description: '영업기회(opportunities)를 단계(stage)별로 묶어 예상 금액(expected_amount)의 평균을 정수로 반올림해 보여 주세요. 평균이 큰 단계가 위로 오게 정렬합니다.',
      hint: '그룹 평균 + 반올림',
      explanation: 'AVG로 단계별 평균을 구하고 ROUND(..., 0)로 소수점을 정리해 단계별 평균 딜 사이즈를 비교합니다.',
      relatedTables: ['opportunities'],
      sql: `SELECT stage, ROUND(AVG(expected_amount), 0) AS avg_amount
FROM opportunities
GROUP BY stage
ORDER BY avg_amount DESC;`,
    },
    {
      title: '활동 없는 영업기회',
      description: '아직 영업 활동(activities)이 한 건도 기록되지 않은 영업기회만 골라 id, 이름, 단계(stage)를 보여 주세요. 방치된 딜을 찾아내는 게 목적입니다.',
      hint: 'LEFT JOIN 후 NULL 필터(anti-join)',
      explanation: 'LEFT JOIN으로 활동을 붙인 뒤 WHERE a.id IS NULL로 매칭 실패 행만 남기는 anti-join 패턴입니다. 누락 탐지의 표준 기법입니다.',
      relatedTables: ['opportunities', 'activities'],
      sql: `SELECT o.id, o.name, o.stage
FROM opportunities o
LEFT JOIN activities a ON a.opportunity_id = o.id
WHERE a.id IS NULL
ORDER BY o.id;`,
    },
    {
      title: '담당자별 최신 활동',
      description: '영업 담당자별로 가장 최근에 수행한 활동 한 건만 골라 담당자명, 활동 유형, 발생 시각을 보여 주세요. 가장 최근 활동이 위에 오게 정렬합니다.',
      hint: '그룹별 최신 1건 (윈도우 함수)',
      explanation: 'ROW_NUMBER()를 담당자(sales_rep_id)로 PARTITION하고 발생 시각 내림차순으로 매긴 뒤 순번 1만 남기는, 그룹별 Top-N 패턴의 대표 사례입니다.',
      relatedTables: ['sales_reps', 'activities'],
      sql: `WITH ranked_activities AS (
  SELECT
    a.*,
    ROW_NUMBER() OVER (PARTITION BY a.sales_rep_id ORDER BY a.occurred_at DESC) AS rank_no
  FROM activities a
)
SELECT r.name, ra.activity_type, ra.occurred_at
FROM ranked_activities ra
JOIN sales_reps r ON r.id = ra.sales_rep_id
WHERE ra.rank_no = 1
ORDER BY ra.occurred_at DESC;`,
    },
    {
      title: '계약 금액과 예상 금액 차이',
      description: '체결된 계약마다 거래처명, 영업기회명, 처음 예상했던 금액, 실제 계약 금액, 그리고 둘의 차이(실제 − 예상)를 함께 보여 주세요. 차이가 큰 건이 먼저 보이게 정렬합니다.',
      hint: '컬럼 간 산술 + 정렬',
      explanation: 'SELECT 안에서 c.contract_amount - o.expected_amount로 차이를 계산해 별칭을 주고 ORDER BY로 정렬합니다. 예측과 실제의 차이를 비교하는 분석 패턴입니다.',
      relatedTables: ['opportunities', 'contracts', 'accounts'],
      sql: `SELECT a.name AS account_name, o.name AS opportunity_name, o.expected_amount, c.contract_amount,
  c.contract_amount - o.expected_amount AS diff
FROM contracts c
JOIN opportunities o ON o.id = c.opportunity_id
JOIN accounts a ON a.id = c.account_id
ORDER BY diff DESC;`,
    },
    {
      title: '지역별 계약 현황',
      description: '거래처(accounts) 지역(region)별로 체결된 계약 수와 계약 금액 합계를 보여 주세요. 계약이 한 건도 없는 지역도 0으로 함께 보여야 합니다.',
      hint: 'LEFT JOIN + NULL 합계 보정',
      explanation: 'accounts 기준 LEFT JOIN으로 계약 없는 지역까지 살리고, SUM이 NULL이 되는 경우를 COALESCE(..., 0)로 0으로 바꿔 깔끔하게 보여 줍니다.',
      relatedTables: ['accounts', 'contracts'],
      sql: `SELECT a.region, COUNT(c.id) AS contract_count, COALESCE(SUM(c.contract_amount), 0) AS contract_amount
FROM accounts a
LEFT JOIN contracts c ON c.account_id = a.id
GROUP BY a.region
ORDER BY contract_amount DESC;`,
    },
    {
      title: '리드 생성 후 예상 마감까지 일수',
      description: '각 영업기회에 대해 원래 리드가 생성된 날짜와 예상 마감일(expected_close_date) 사이가 며칠인지 계산해 보여 주세요. 기간이 긴 딜이 먼저 보이게 정렬합니다.',
      hint: '날짜 차이 계산',
      explanation: 'julianday(a) - julianday(b)로 두 날짜 사이의 일수를 정수로 얻습니다. 리드 발생 → 예상 클로징까지의 사이클 타임 분석 패턴입니다.',
      relatedTables: ['leads', 'opportunities'],
      sql: `SELECT
  o.name,
  l.created_at,
  o.expected_close_date,
  julianday(o.expected_close_date) - julianday(l.created_at) AS days_to_close
FROM opportunities o
JOIN leads l ON l.id = o.lead_id
ORDER BY days_to_close DESC;`,
    },
    {
      title: '파이프라인 누적 순위',
      description: '영업기회를 예상 금액이 큰 순서로 줄세우면서, 위에서부터 누적으로 합산된 파이프라인 금액도 함께 보여 주세요. "상위 몇 건이 파이프라인의 몇 %를 차지하는가"를 보고 싶을 때 쓰는 형태입니다.',
      hint: '누적 합계 윈도우 함수',
      explanation: 'SUM(...) OVER (ORDER BY ...)로 행이 진행될수록 합계가 누적되는 running total을 만듭니다. GROUP BY 없이도 행 단위 누적값을 붙일 수 있는 윈도우 함수의 대표 활용입니다.',
      relatedTables: ['opportunities'],
      sql: `SELECT
  name,
  stage,
  expected_amount,
  SUM(expected_amount) OVER (ORDER BY expected_amount DESC) AS running_pipeline
FROM opportunities
ORDER BY expected_amount DESC;`,
    },
    {
      title: '거래처 영업 종합 리포트',
      description: '거래처별로 담당자 수, 리드 수, 영업기회 수, 계약 수를 한 줄에 모아 종합 현황을 보여 주세요. 영업기회가 많은 거래처가 먼저 오게 정렬합니다.',
      hint: '다중 LEFT JOIN + DISTINCT 카운트',
      explanation: '여러 자식 테이블을 LEFT JOIN하면 카르테시안 곱으로 행이 부풀어 단순 COUNT가 왜곡됩니다. 그래서 COUNT(DISTINCT ...)로 각 자식의 고유 id만 세어 정확한 멀티 도메인 KPI를 만듭니다.',
      relatedTables: ['accounts', 'contacts', 'leads', 'opportunities', 'contracts'],
      sql: `SELECT
  a.name,
  COUNT(DISTINCT c.id) AS contact_count,
  COUNT(DISTINCT l.id) AS lead_count,
  COUNT(DISTINCT o.id) AS opportunity_count,
  COUNT(DISTINCT ct.id) AS contract_count
FROM accounts a
LEFT JOIN contacts c ON c.account_id = a.id
LEFT JOIN leads l ON l.account_id = a.id
LEFT JOIN opportunities o ON o.account_id = a.id
LEFT JOIN contracts ct ON ct.account_id = a.id
GROUP BY a.id, a.name
ORDER BY opportunity_count DESC;`,
    },
  ],
})
