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
  channels?: KnowledgeChannel[]; // 지식 검색 전용 — 검색할 채널 범위
};

/**
 * prepareStream이 모드와 무관하게 만들어내는 것들.
 * conversation은 시스템 프롬프트가 빠진 상태 — 모드가 자기 것을 앞에 붙인다.
 */
export type StreamBase = {
  sessionId: string;
  user: ChatbotUser;
  sse: ReturnType<typeof createSse>;
  conversation: OpenAI.ChatCompletionMessageParam[];
  model: string;
};

/** 시스템 프롬프트까지 붙어 OpenAI를 부를 준비가 끝난 상태 */
export type StreamContext = StreamBase & {
  messages: OpenAI.ChatCompletionMessageParam[];
  knowledgeSources: KnowledgeSource[];
};

/** 스트림으로 조각조각 오는 tool_call을 조립하는 중간 상태 */
export type ToolCallDraft = { id: string; name: string; arguments: string };

/** 스트림을 끝까지 읽고 나서야 알 수 있는 것들 */
export type CollectedStream = {
  /** 툴을 안 썼을 때 흘려보낸 본문 (이미 전송됨 — DB 저장용) */
  text: string;
  /** 'tool_calls' 면 툴을 부른 것, 'stop' 이면 그냥 답한 것 */
  finishReason: string | null;
  usage: OpenAI.CompletionUsage | null;
  /** 조각을 다 이어붙인 tool_call. 툴을 안 썼으면 undefined */
  toolCall: ToolCallDraft | undefined;
};

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
