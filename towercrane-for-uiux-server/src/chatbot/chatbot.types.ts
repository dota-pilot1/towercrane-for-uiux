import type OpenAI from 'openai';
import type { KnowledgeChannel } from '../database/schema';
import type { createSse } from './lib/sse';

export type ChatbotUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

export type KnowledgeSource = {
  chunkId: string;
  documentId: string;
  channel: KnowledgeChannel;
  channelLabel: string;
  chunkIndex: number;
  headingPath: string | null;
  chunkText: string;
  title: string;
  summary: string | null;
  tags: string[];
  updatedAt: string;
  score: number;
  snippet: string;
  documentUrl: string;
};

export type StreamOptions = {
  fileUrls?: string[];
  // 화면 메뉴와 1:1 — 지식 검색 / 도구 호출 / 그 외(기본 채팅·스트리밍·파일 첨부)
  mode?: 'general' | 'knowledge' | 'tools';
  channels?: KnowledgeChannel[];
};

/** prepareStream이 모아서 모드별 서비스에 넘기는 꾸러미 */
export type StreamContext = {
  sessionId: string;
  user: ChatbotUser;
  sse: ReturnType<typeof createSse>;
  messages: OpenAI.ChatCompletionMessageParam[];
  knowledgeSources: KnowledgeSource[];
  model: string;
};

/** 스트림으로 조각조각 오는 tool_call을 조립하는 중간 상태 */
export type ToolCallDraft = { id: string; name: string; arguments: string };

export type RealtimeSessionRequest = {
  model?: string;
  voice?: string;
  language?: string;
  turnMode?: 'server_vad' | 'push_to_talk';
  responseMode?: 'text_audio' | 'text_only' | 'audio_only';
  instructions?: string;
  enabledTools?: string[];
};

export type RealtimeToolExecuteRequest = {
  callId?: string;
  name: string;
  source?: 'realtime' | 'manual_test';
  arguments?: Record<string, unknown>;
};

export type RealtimeToolDefinition = {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
};
