import type { Response } from 'express';
import type { KnowledgeSource } from '../chatbot.types';

/**
 * SSE 프레임 쓰기. 'data: …\n\n' 규약을 이 파일 안에만 가둔다.
 *
 * res는 요청마다 다르므로 요청 시점에 한 번 묶어 쓴다:
 *   const sse = createSse(res)
 *   sse.send({ type: 'text', text: '안' })  → res.write('data: {"type":"text",…}\n\n')
 *   sse.finish(assistantMessage)            → done + [DONE] + res.end()
 *
 * 모든 프레임은 type을 갖는다 — 프론트가 switch 하나로 분기하게 하려는 것이다.
 * 하나라도 type이 빠지면 소비자 전원이 'type' in parsed 같은 방어를 달게 된다.
 */
export function createSse(res: Response) {
  return {
    /** 프레임 하나 전송. 연결은 열어둔다 — 몇 번이든 부를 수 있다. */
    send: (payload: unknown) =>
      res.write(`data: ${JSON.stringify(payload)}\n\n`),

    /**
     * 스트림 종료 3종 세트 — 한 번만 부를 수 있다.
     * 셋 중 하나라도 빠지면 조용히 망가지므로 묶어둔다:
     *   done       프론트가 임시 id를 진짜 DB id로 교체
     *   [DONE]     프론트가 수신 루프를 return
     *   res.end()  연결 닫기 — 없으면 브라우저가 영원히 대기
     */
    finish: (
      assistantMessage: unknown,
      knowledgeSources: KnowledgeSource[] = [],
    ) => {
      res.write(
        `data: ${JSON.stringify({ type: 'done', assistantMessage, knowledgeSources })}\n\n`,
      );
      res.write('data: [DONE]\n\n');
      res.end();
    },
  };
}
