# 미니 포스트맨 팀별 계층화 구현 계획

## 결론

현재 `/api-doc`는 "컬렉션 -> API 항목 -> 요청 상세" 구조다. 실제 업무에서 여러 팀이 쓰려면 이 구조보다 "팀 워크스페이스 -> 컬렉션 -> 폴더/시나리오 -> 요청" 구조가 더 실용적이다.

권장 구현은 한 번에 대규모 리팩토링하지 않고, 현재 `api_doc_categories`를 컬렉션으로 유지한 채 상위에 팀 워크스페이스를 먼저 붙이는 방식이다. 첫 화면은 팀 워크스페이스 카드 그리드로 만들고, 사용자가 카드를 선택하면 해당 팀의 Postman Lite 화면으로 진입한다. 이후 폴더, 권한, 팀별 환경 변수, 팀별 import/export를 단계적으로 추가한다.

## 목표 구조

```text
Workspace Home
  Team Workspace Card
    Postman Lite
      Collection
        Folder or Scenario
          Request
            Request Spec
              Params
              Headers
              Body
              Auth
              Response
```

예시:

```text
AI 서비스 포털 팀
  Auth
    로그인/세션
      POST /auth/login
      GET /auth/me
  Chatbot
    세션 관리
      GET /chatbot/sessions
      POST /chatbot/sessions

운영 Admin 팀
  메뉴 관리
  게시판 관리
  사용자 관리
```

## 문서 구성

- [00. 현재 구조와 문제 정의](./00-현재-구조와-문제-정의.md)
- [01. 목표 정보 구조](./01-목표-정보-구조.md)
- [02. DB/API 확장 계획](./02-DB-API-확장-계획.md)
- [03. 프론트 UI 확장 계획](./03-프론트-UI-확장-계획.md)
- [04. 단계별 구현 계획](./04-단계별-구현-계획.md)
- [05. 검증 체크리스트](./05-검증-체크리스트.md)

## 구현 원칙

- `/api-doc` 첫 화면은 워크스페이스 카드 목록이다.
- 워크스페이스 카드를 선택하면 `/api-doc?team=...` 또는 내부 state로 해당 팀 Postman 화면을 연다.
- 기존 Postman Lite 화면은 유지하면서 상위 구조만 먼저 추가한다.
- 기존 JSON import/export 파일은 계속 읽을 수 있게 한다.
- 팀별 권한은 처음부터 DB 모델에 넣되, 1차 UI에서는 관리자 중심으로 단순하게 연다.
- raw Tailwind 팔레트는 사용하지 않고 `text-text-primary`, `bg-surface-muted`, `border-surface-border-soft`, `ui-panel` 같은 semantic token과 유틸만 사용한다.
- 같은 목록/트리/빈 상태 UI가 3번 이상 반복되면 `shared/ui/`로 올린다.
