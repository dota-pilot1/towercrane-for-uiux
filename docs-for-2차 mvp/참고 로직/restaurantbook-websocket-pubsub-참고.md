# RestaurantBook WebSocket pub/sub 참고 정리

참고 경로:

- `/Users/terecal/RestaurantBook/restaurant-book-server/src/main/java/com/cj/restaurantbook/websocket/AppWebSocketHandler.java`
- `/Users/terecal/RestaurantBook/restaurant-book-server/src/main/java/com/cj/restaurantbook/websocket/WebSocketConfig.java`
- `/Users/terecal/RestaurantBook/restaurant-book-server/src/main/java/com/cj/restaurantbook/websocket/WsMessage.java`
- `/Users/terecal/RestaurantBook/restaurant-book-server/src/main/java/com/cj/restaurantbook/websocket/JwtHandshakeInterceptor.java`
- `/Users/terecal/RestaurantBook/restaurant-book-server/src/main/java/com/cj/restaurantbook/order/application/OrderBroadcaster.java`
- `/Users/terecal/RestaurantBook/restaurant-book-server/src/main/java/com/cj/restaurantbook/order/application/OrderService.java`
- `/Users/terecal/RestaurantBook/restaurant-book-server/src/main/java/com/cj/restaurantbook/order/application/KitchenOrderService.java`

## 결론

SQL 연습장 푸터바 실시간 기능에 참고할 만하다. 특히 아래 패턴은 그대로 가져올 가치가 있다.

- topic 단위 구독
- 공통 message envelope
- service 레이어에서 상태 변경 후 broadcaster 호출
- DB 변경 commit 이후에 broadcast
- 클라이언트는 `SUBSCRIBE`, `UNSUBSCRIBE`, `PING` 메시지를 보냄
- 서버는 특정 topic 구독자에게만 event broadcast

다만 RestaurantBook은 Spring 서버 코드이고, Towercrane은 NestJS + `ws` 기반이다. 구현은 RestaurantBook 파일을 복사하는 게 아니라, Towercrane에 이미 있는 `MeetingGateway` 스타일을 확장하는 게 맞다.

Towercrane 참고 경로:

- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/meeting/meeting.gateway.ts`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/main.ts`

## RestaurantBook 구조 요약

### 1. WebSocket endpoint

`WebSocketConfig.java`

- `/ws/app` 경로로 WebSocket handler를 등록한다.
- `JwtHandshakeInterceptor`를 붙인다.
- CORS allowed origin을 설정에서 읽어 `setAllowedOriginPatterns`에 넘긴다.

Towercrane 적용:

- SQL 연습장은 `/ws/sql-practice` 같은 별도 endpoint가 적당하다.
- 현재 Towercrane `MeetingGateway`는 `/ws/meeting`을 `app.getHttpServer()`의 `upgrade` 이벤트에 직접 붙인다.
- 같은 방식으로 `SqlPracticeGateway.attach(httpServer)`를 추가하면 된다.

### 2. 공통 message envelope

`WsMessage.java`

```java
public class WsMessage {
    private String type;
    private String topic;
    private Object data;
}
```

의미:

- `type`: 이벤트 종류
- `topic`: 구독/발행 대상
- `data`: 실제 payload

Towercrane 적용:

```ts
type SqlPracticeWsEnvelope = {
  type?: string
  topic?: string
  data?: unknown
}
```

추천 event type:

- `SUBSCRIBE`
- `UNSUBSCRIBE`
- `PING`
- `PONG`
- `ERROR`
- `SQL_SUBMISSION_CREATED`
- `SQL_RANKING_CHANGED`

### 3. topic/session pub-sub

`AppWebSocketHandler.java`

핵심 필드:

```java
private final ConcurrentHashMap<String, CopyOnWriteArrayList<WebSocketSession>> topicSessions =
        new ConcurrentHashMap<>();
```

역할:

- topic별 WebSocket session 목록을 보관한다.
- `SUBSCRIBE` 수신 시 topic에 session을 추가한다.
- `UNSUBSCRIBE` 또는 disconnect 시 session을 제거한다.
- broadcast 시 해당 topic의 session에게만 메시지를 보낸다.

Towercrane 적용:

현재 `MeetingGateway`가 이미 같은 구조다.

```ts
private readonly topicSockets = new Map<string, Set<WebSocket>>();
private readonly socketTopic = new WeakMap<WebSocket, string>();
```

SQL 연습장도 이 구조를 거의 그대로 쓰면 된다.

단, SQL 연습장은 한 socket이 여러 seed topic을 구독할 가능성이 작다. 1차 구현은 `socketTopic` 1개만 허용해도 충분하다. 나중에 전체 seed + 특정 seed를 동시에 구독해야 하면 `WeakMap<WebSocket, Set<string>>`로 확장한다.

### 4. handshake topic 자동 구독

`AppWebSocketHandler.java`

- 연결 URL query의 `topic` 값을 읽는다.
- handshake 직후 해당 topic에 자동 subscribe한다.

예:

```text
/ws/app?topic=orders:operations
/ws/app?topic=customer:orders/12
```

Towercrane 적용:

SQL 연습장에서는 아래 형태가 적당하다.

```text
/ws/sql-practice?token=...&topic=sql-practice/seed/01_board_basic.sql
```

또는 seed 파일명을 URL-safe하게 slug/hash로 바꿔도 된다.

추천 topic:

```text
sql-practice/seed/{encodedSeedFile}
```

예:

```text
sql-practice/seed/01_board_basic.sql
```

### 5. 권한 검사

`JwtHandshakeInterceptor.java`

- `token` query parameter 또는 `Authorization: Bearer ...`에서 token을 읽는다.
- access token이 아니면 reject한다.
- 성공하면 `userId`, `username`, `role`을 session attributes에 넣는다.
- token이 없으면 anonymous 연결도 허용한다.

RestaurantBook 주문 topic은 customer topic과 operations topic 권한이 다르다.

Towercrane 적용:

- SQL 연습장 제출 로그와 랭킹은 로그인 화면의 기능이므로 anonymous는 허용하지 않는 편이 낫다.
- Towercrane `MeetingGateway`처럼 query token을 받아 `AuthService.getSessionUser(token)`로 검증한다.
- seed topic 구독은 로그인 사용자라면 허용한다.
- admin 전용 topic은 지금 필요 없다.

### 6. broadcast는 service에서 직접 하지 않고 broadcaster로 분리

`OrderBroadcaster.java`

역할:

- 이벤트 topic과 event type을 한 곳에서 관리한다.
- service는 `orderBroadcaster.broadcastOrderChangedAfterCommit(...)`만 호출한다.
- payload를 구성한다.
- operations topic과 customer topic을 동시에 broadcast한다.

Towercrane 적용:

신규 파일 후보:

- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/sql-practice/sql-practice.gateway.ts`
- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/sql-practice/sql-practice.broadcaster.ts`

`SqlPracticeBroadcaster` 역할:

- `broadcastSubmissionCreated(seedFile, activityItem)`
- `broadcastRankingChanged(seedFile, summaryPayload)`
- topic 문자열 생성
- gateway broadcast 호출

이렇게 분리하면 `SqlPracticeService`가 WebSocket session 관리 세부사항을 몰라도 된다.

### 7. commit 이후 broadcast

`OrderBroadcaster.java`

```java
TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
    @Override
    public void afterCommit() {
        broadcast.run();
    }
});
```

중요한 이유:

- DB 저장이 실패했는데 WebSocket 이벤트만 먼저 나가는 문제를 막는다.
- 클라이언트가 이벤트 수신 후 HTTP refetch를 했을 때 DB에 아직 반영되지 않은 상태를 보는 문제를 줄인다.

Towercrane 적용:

- 현재 Towercrane은 better-sqlite3 + Drizzle 사용이라 Spring transaction hook은 없다.
- `sqlPracticeSubmissionsTable` insert가 성공한 직후에 broadcaster를 호출하면 된다.
- 만약 명시적 transaction을 쓰게 되면 transaction block이 끝난 뒤 호출한다.

SQL 제출 저장 위치:

- `/Users/terecal/towercrane-for-uiux/towercrane-for-uiux-server/src/sql-practice/sql-practice.service.ts`
- `gradeAndSaveSubmission(...)`

적용 지점:

1. Gemini 채점
2. submission row 구성
3. DB insert
4. activity item 조회 또는 구성
5. `SqlPracticeBroadcaster.broadcastSubmissionCreated(...)`
6. `SqlPracticeBroadcaster.broadcastRankingChanged(...)`
7. HTTP response 반환

## SQL 연습장에 맞춘 추천 설계

### Topic

```text
sql-practice/seed/{seedFile}
```

예:

```text
sql-practice/seed/01_board_basic.sql
```

필요하면 encode:

```ts
const topic = `sql-practice/seed/${encodeURIComponent(seedFile)}`
```

### Client -> Server

구독:

```json
{
  "type": "SUBSCRIBE",
  "topic": "sql-practice/seed/01_board_basic.sql"
}
```

구독 해제:

```json
{
  "type": "UNSUBSCRIBE",
  "topic": "sql-practice/seed/01_board_basic.sql"
}
```

ping:

```json
{
  "type": "PING"
}
```

### Server -> Client

신규 제출 로그:

```json
{
  "type": "SQL_SUBMISSION_CREATED",
  "topic": "sql-practice/seed/01_board_basic.sql",
  "data": {
    "id": "submission-id",
    "userId": "user-id",
    "userName": "오현석",
    "seedFile": "01_board_basic.sql",
    "exampleId": "01_board_basic-beginner-01",
    "exampleTitle": "사용자 가입일순 목록",
    "exampleLevel": "beginner",
    "exampleOrder": 1,
    "isCorrect": true,
    "score": 1,
    "maxScore": 1,
    "createdAt": "2026-05-14T01:16:00.000Z"
  }
}
```

랭킹 변경 알림:

```json
{
  "type": "SQL_RANKING_CHANGED",
  "topic": "sql-practice/seed/01_board_basic.sql",
  "data": {
    "seedFile": "01_board_basic.sql",
    "reason": "SUBMISSION_CREATED"
  }
}
```

랭킹은 전체 배열을 WebSocket으로 계속 밀지 않는 것을 추천한다. `SQL_RANKING_CHANGED`를 받으면 프론트에서 기존 HTTP ranking query를 invalidate/refetch한다. 이렇게 하면 동점 처리와 재접속 복구가 단순해진다.

## Towercrane 구현 대응표

| RestaurantBook | Towercrane 적용 |
|---|---|
| `WebSocketConfig.java` | `SqlPracticeGateway.attach(httpServer)`를 `main.ts`에서 호출 |
| `JwtHandshakeInterceptor.java` | `AuthService.getSessionUser(token)` 사용 |
| `WsMessage.java` | `SqlPracticeWsEnvelope` 타입 |
| `AppWebSocketHandler.topicSessions` | `Map<string, Set<WebSocket>>` |
| `handleSubscribe` | `SUBSCRIBE` 메시지 처리 |
| `broadcastOrderListChanged` | `broadcastSubmissionCreated` |
| `OrderBroadcaster` | `SqlPracticeBroadcaster` |
| `OrderService.createCustomerOrder` 이후 broadcast | `SqlPracticeService.gradeAndSaveSubmission` insert 이후 broadcast |

## Towercrane 신규 파일 후보

백엔드:

- `towercrane-for-uiux-server/src/sql-practice/sql-practice.gateway.ts`
- `towercrane-for-uiux-server/src/sql-practice/sql-practice.broadcaster.ts`

수정:

- `towercrane-for-uiux-server/src/main.ts`
- `towercrane-for-uiux-server/src/sql-practice/sql-practice.module.ts`
- `towercrane-for-uiux-server/src/sql-practice/sql-practice.service.ts`
- `towercrane-for-uiux-server/src/sql-practice/sql-practice.types.ts`
- `towercrane-for-uiux-server/src/sql-practice/sql-practice.controller.ts`

프론트:

- `towercrane-for-uiux-front/src/features/sql-practice/model/use-sql-practice-live.ts`
- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-practice-footer-drawer.tsx`
- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-activity-feed.tsx`
- `towercrane-for-uiux-front/src/features/sql-practice/ui/sql-ranking-table.tsx`

수정:

- `towercrane-for-uiux-front/src/pages/sql-practice/ui/sql-practice-page.tsx`
- `towercrane-for-uiux-front/src/features/sql-practice/model/use-sql-practice-queries.ts`
- `towercrane-for-uiux-front/src/entities/sql-practice/api/sql-practice-api.ts`
- `towercrane-for-uiux-front/src/entities/sql-practice/model/types.ts`

## 구현 시 주의점

### 1. 초기 데이터는 HTTP로 로드

WebSocket은 연결 이후 이벤트만 보장한다. 푸터바를 처음 열었을 때는 아래 HTTP API가 필요하다.

- `GET /api/sql/submissions/ranking?seedFile=...`
- `GET /api/sql/submissions/activity?seedFile=...`

WebSocket은 이후 변화만 반영한다.

### 2. 누락 이벤트 대비

브라우저가 잠깐 끊기면 이벤트를 놓칠 수 있다.

대응:

- reconnect 시 ranking/activity HTTP refetch
- `SQL_RANKING_CHANGED` 수신 시 ranking refetch
- `SQL_SUBMISSION_CREATED` 수신 시 activity list 앞에 append하되, 중복 id는 제거

### 3. 랭킹은 push payload보다 invalidation 추천

최근 로그는 append-only라 WebSocket payload를 그대로 UI에 추가해도 된다.

랭킹은 집계/정렬/동점 처리 때문에 서버가 매번 전체 배열을 push할 수도 있지만, 1차 구현에서는 `SQL_RANKING_CHANGED` 이벤트만 보내고 HTTP refetch가 더 안전하다.

### 4. 서버 scale-out 전제

RestaurantBook과 Towercrane의 현재 방식은 서버 인스턴스 1개 기준 in-memory pub/sub다.

서버가 여러 대로 늘어나면 같은 topic 구독자가 서로 다른 인스턴스에 붙을 수 있다. 그때는 Redis pub/sub나 message broker가 필요하다.

현재 Towercrane 운영 규모에서는 in-memory 방식으로 충분하다.

### 5. topic 권한

SQL 연습장 seed topic은 민감 데이터가 크지 않지만, 사용자명과 풀이 상태가 노출된다. 로그인 사용자만 구독하게 하는 게 맞다.

anonymous WebSocket은 허용하지 않는다.

## 추천 최종 방향

RestaurantBook 방식과 비슷하게 구현하면 된다. 다만 Towercrane에서는 아래처럼 가져간다.

1. `MeetingGateway`와 같은 raw `ws` 기반 gateway를 SQL 연습장 전용으로 만든다.
2. topic은 `sql-practice/seed/{seedFile}`로 둔다.
3. `SqlPracticeService.gradeAndSaveSubmission`에서 DB insert 성공 후 broadcaster를 호출한다.
4. WebSocket으로는 `SQL_SUBMISSION_CREATED`와 `SQL_RANKING_CHANGED`를 보낸다.
5. 프론트는 최근 로그는 즉시 append하고, 랭킹은 React Query invalidate/refetch한다.

이 정도면 WebSocket을 쓰는 이유가 분명하고, 구현 복잡도도 RestaurantBook 주문 상태 변경 수준 안에 머문다.
