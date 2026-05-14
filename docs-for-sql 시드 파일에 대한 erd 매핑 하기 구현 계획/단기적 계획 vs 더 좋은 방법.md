방식 A — 수동 mermaid 파일

각 .sql 옆에 .mmd 파일 생성 (11개)
백엔드 API 1개 추가 (GET /sql-practice/seeds/:fileName/erd)
프론트에서 mermaid.js로 렌더링
장점: 빠름, 안정적, API 비용 없음
단점: 새 시드 추가할 때 .mmd도 직접 만들어야 함

방식 B — AI 연동 자동 생성

SQL 파일 내용을 Claude/GPT API에 던져서 Mermaid ERD 코드 생성
생성된 코드를 캐시(파일 or DB)에 저장
프론트에서 렌더링
장점: 새 시드 추가해도 자동, 항상 최신
단점: API 키/비용, 첫 로딩 지연 (캐시 없을 때)
