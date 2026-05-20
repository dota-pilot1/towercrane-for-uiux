# 1차 — DB 스키마 + 백엔드 API

## 테이블 설계 (SQLite · Drizzle ORM)

### evaluatees (평가 대상자)
```
id            TEXT PRIMARY KEY
name          TEXT NOT NULL
role          TEXT             -- 직책/역할 (예: 풀스택, 프론트엔드)
description   TEXT             -- 한줄 소개
created_at    TEXT NOT NULL
updated_at    TEXT NOT NULL
```

### eval_categories (평가 카테고리 — 시드 데이터)
```
id            TEXT PRIMARY KEY
name          TEXT NOT NULL    -- '기술 역량' | '협업 역량' | '업무 생산성'
display_order INTEGER NOT NULL
```

### eval_items (평가 항목 — 유저가 직접 추가)
```
id            TEXT PRIMARY KEY
category_id   TEXT NOT NULL REFERENCES eval_categories(id)
evaluatee_id  TEXT NOT NULL REFERENCES evaluatees(id)
title         TEXT NOT NULL    -- 항목명 (예: '아키텍처 설계 능력')
description   TEXT             -- 세부 설명
display_order INTEGER NOT NULL
created_at    TEXT NOT NULL
```

### eval_scores (점수 — 항목당 0~10)
```
id            TEXT PRIMARY KEY
item_id       TEXT NOT NULL REFERENCES eval_items(id)
score         INTEGER NOT NULL DEFAULT 0   -- 0~10
note          TEXT                          -- 자기 평가 메모
updated_at    TEXT NOT NULL
```

---

## API 엔드포인트

### 평가 대상자
| Method | Path | 설명 |
|---|---|---|
| GET | /api/evaluatees | 목록 조회 |
| POST | /api/evaluatees | 등록 |
| DELETE | /api/evaluatees/:id | 삭제 |

### 평가 항목
| Method | Path | 설명 |
|---|---|---|
| GET | /api/evaluatees/:id/items | 대상자의 전체 항목 조회 (카테고리별 그룹) |
| POST | /api/evaluatees/:id/items | 항목 추가 |
| DELETE | /api/eval-items/:itemId | 항목 삭제 |

### 점수
| Method | Path | 설명 |
|---|---|---|
| PUT | /api/eval-items/:itemId/score | 점수 저장 (upsert) |

### 집계
| Method | Path | 설명 |
|---|---|---|
| GET | /api/evaluatees/:id/summary | 카테고리별 합산 + 총점 반환 |

---

## 시드 데이터 (eval_categories)

서버 부팅 시 database.service.ts의 ensureXxx 패턴으로 upsert.

```
{ id: 'cat_tech',  name: '기술 역량',   display_order: 0 }
{ id: 'cat_collab',name: '협업 역량',   display_order: 1 }
{ id: 'cat_prod',  name: '업무 생산성', display_order: 2 }
```

---

## 파일 위치

```
towercrane-for-uiux-server/src/
  evaluatees/
    evaluatees.module.ts
    evaluatees.controller.ts
    evaluatees.service.ts
  eval-items/
    eval-items.module.ts
    eval-items.controller.ts
    eval-items.service.ts
  database/
    schema/eval-schema.ts   ← Drizzle 테이블 정의 추가
    database.service.ts     ← eval_categories 시드 추가
```
