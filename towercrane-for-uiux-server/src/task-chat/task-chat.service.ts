import { Injectable } from '@nestjs/common';
import type { ServerResponse } from 'http';
import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { TasksService, type TaskUser } from '../tasks/tasks.service';

// 실제 스키마와 동일한 enum (src/tasks/tasks.schemas.ts 기준)
const STATUS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'HOLD'] as const;
const PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

@Injectable()
export class TaskChatService {
  constructor(private readonly tasksService: TasksService) {}

  // 스트림 생성과 응답 파이핑을 한곳에서 처리해 StreamTextResult 타입 누수를 피한다.
  async streamChat(
    user: TaskUser,
    messages: UIMessage[],
    res: ServerResponse,
  ): Promise<void> {
    const result = streamText({
      model: openai('gpt-4o'),
      system: `
        당신은 "Towercrane" 시스템의 똑똑하고 친절한 업무 관리 전용 비서입니다.
        사용자는 워크스페이스/업무를 보통 "이름"으로 말합니다. ID를 모를 때는
        먼저 getWorkspaces 로 목록을 조회해 이름을 ID로 해소한 뒤 다른 도구를 호출하세요.
        조회·등록·상태변경을 수행한 뒤 결과를 한국어로 상냥하게 요약 보고하세요.
      `,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
        // [Tool 1] 전체 워크스페이스 목록 조회
        getWorkspaces: tool({
          description:
            '전체 업무 워크스페이스 목록과 각 워크스페이스의 업무 통계를 가져옵니다. 사용자가 이름으로 말한 워크스페이스의 ID를 찾을 때도 사용하세요.',
          inputSchema: z.object({}),
          execute: async () => {
            const list = await this.tasksService.listWorkspaces(user);
            return { success: true, count: list.length, data: list };
          },
        }),

        // [Tool 2] 특정 워크스페이스의 업무 목록 조회 (상태 필터 가능)
        getWorkspaceTasks: tool({
          description:
            '특정 워크스페이스 ID에 소속된 업무 목록을 가져옵니다. 상태(TODO, IN_PROGRESS, REVIEW, DONE, HOLD) 필터링이 가능합니다.',
          inputSchema: z.object({
            workspaceId: z.string().describe('조회 대상 워크스페이스 고유 ID'),
            status: z.enum(STATUS).optional().describe('필터링할 업무 상태'),
          }),
          execute: async ({ workspaceId, status }) => {
            const result = await this.tasksService.listWorkspaceTasks(
              user,
              workspaceId,
              status ? { status } : {},
            );
            return {
              success: true,
              count: result.items.length,
              data: result.items,
            };
          },
        }),

        // [Tool 3] 업무 신규 등록 (반드시 워크스페이스에 귀속)
        createTask: tool({
          description: '지정한 워크스페이스에 새 업무(카드)를 생성합니다.',
          inputSchema: z.object({
            workspaceId: z
              .string()
              .describe('업무를 추가할 워크스페이스 고유 ID'),
            title: z.string().describe('업무 제목 (1~120자)'),
            content: z.string().optional().describe('업무 세부 내용'),
            priority: z.enum(PRIORITY).default('MEDIUM').describe('우선순위'),
          }),
          execute: async ({ workspaceId, title, content, priority }) => {
            // 일반 createTask 는 workspaceId 를 붙이지 않으므로 createWorkspaceTask 사용.
            const created = await this.tasksService.createWorkspaceTask(
              user,
              workspaceId,
              { title, content, priority, status: 'TODO' },
            );
            return { success: true, createdId: created.id, title: created.title };
          },
        }),

        // [Tool 4] 업무 상태 변경
        updateTaskStatus: tool({
          description: '업무(카드)의 진행 상태를 변경합니다.',
          inputSchema: z.object({
            taskId: z.string().describe('상태를 변경할 업무 고유 ID'),
            status: z.enum(STATUS).describe('변경할 새 상태'),
          }),
          execute: async ({ taskId, status }) => {
            const updated = await this.tasksService.updateTaskStatus(
              user,
              taskId,
              { status },
            );
            return { success: true, taskId, newStatus: updated.status };
          },
        }),
      },
    });

    // v6: UI 메시지 스트림을 Node ServerResponse(Express Response)로 직접 파이핑.
    result.pipeUIMessageStreamToResponse(res);
  }
}
