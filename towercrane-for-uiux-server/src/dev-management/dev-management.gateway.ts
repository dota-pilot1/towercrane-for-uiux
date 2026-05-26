import { Injectable, Logger } from '@nestjs/common';
import type { Server as HttpServer, IncomingMessage } from 'node:http';
import { parse } from 'node:url';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import { AuthService } from '../auth/auth.service';

type WsEnvelope = {
  type?: string;
  topic?: string;
  data?: unknown;
};

type PresenceMember = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  online: boolean;
  currentRoomId: string | null;
};

function readRawMessage(raw: RawData) {
  if (typeof raw === 'string') return raw;
  if (raw instanceof Buffer) return raw.toString('utf8');
  if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
  return Buffer.from(new Uint8Array(raw)).toString('utf8');
}

@Injectable()
export class DevManagementGateway {
  private static readonly PRESENCE_TTL_MS = 30_000;
  private readonly logger = new Logger(DevManagementGateway.name);
  private server?: WebSocketServer;
  private readonly sockets = new Set<WebSocket>();
  private readonly topicSockets = new Map<string, Set<WebSocket>>();
  private readonly socketTopic = new WeakMap<WebSocket, string>();
  private readonly socketUser = new WeakMap<WebSocket, PresenceMember>();
  private readonly socketSeenAt = new WeakMap<WebSocket, number>();

  constructor(private readonly authService: AuthService) {}

  attach(httpServer: HttpServer) {
    if (this.server) return;

    this.server = new WebSocketServer({ noServer: true });
    this.server.on('connection', (socket, request) =>
      this.handleConnection(socket, request),
    );

    httpServer.on('upgrade', (request, socket, head) => {
      const { pathname, query } = parse(request.url ?? '', true);
      if (pathname !== '/ws/dev-management') return;

      const token = typeof query.token === 'string' ? query.token : '';
      try {
        const user = this.authService.getSessionUser(token);
        this.server?.handleUpgrade(request, socket, head, (ws) => {
          this.socketUser.set(ws, {
            ...user,
            online: true,
            currentRoomId: null,
          });
          this.server?.emit('connection', ws, request);
        });
      } catch {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      }
    });
  }

  broadcastMessage(roomId: string, payload: unknown) {
    this.broadcast(`dev-management/${roomId}`, {
      type: 'DEV_MANAGEMENT_MESSAGE',
      topic: `dev-management/${roomId}`,
      data: payload,
    });
  }

  broadcastBotSettings(roomId: string, payload: unknown) {
    this.broadcast(`dev-management/${roomId}`, {
      type: 'DEV_MANAGEMENT_BOT_SETTINGS',
      topic: `dev-management/${roomId}`,
      data: payload,
    });
  }

  broadcastMessagesCleared(roomId: string, payload: unknown) {
    this.broadcast(`dev-management/${roomId}`, {
      type: 'DEV_MANAGEMENT_MESSAGES_CLEARED',
      topic: `dev-management/${roomId}`,
      data: payload,
    });
  }

  getPresenceMembers(roomId?: string) {
    const deduped = new Map<string, PresenceMember>();
    const expectedTopic = roomId ? `dev-management/${roomId}` : null;
    const now = Date.now();

    for (const socket of this.sockets) {
      if (socket.readyState !== WebSocket.OPEN) {
        this.removeSocket(socket);
        continue;
      }

      const seenAt = this.socketSeenAt.get(socket) ?? 0;
      if (now - seenAt > DevManagementGateway.PRESENCE_TTL_MS) {
        this.removeSocket(socket);
        continue;
      }

      const user = this.socketUser.get(socket);
      if (!user) continue;

      const topic = this.socketTopic.get(socket);
      if (expectedTopic && topic !== expectedTopic) continue;

      const currentRoomId = topic?.replace('dev-management/', '') ?? null;
      const existing = deduped.get(user.id);
      if (existing?.currentRoomId && !currentRoomId) continue;

      deduped.set(user.id, {
        ...user,
        online: true,
        currentRoomId,
      });
    }

    return Array.from(deduped.values());
  }

  private handleConnection(socket: WebSocket, request: IncomingMessage) {
    const user = this.socketUser.get(socket);
    this.sockets.add(socket);
    this.socketSeenAt.set(socket, Date.now());
    this.logger.log(
      `dev-management ws connected: ${user?.id ?? 'unknown'} ${
        request.url ?? ''
      }`,
    );

    socket.on('message', (raw: RawData) => {
      try {
        const message = JSON.parse(readRawMessage(raw)) as WsEnvelope;
        this.handleMessage(socket, message);
      } catch {
        this.send(socket, { type: 'ERROR', data: { message: 'INVALID_JSON' } });
      }
    });

    socket.on('close', () => {
      const topic = this.unsubscribeCurrent(socket, false);
      this.sockets.delete(socket);
      this.socketUser.delete(socket);
      this.socketSeenAt.delete(socket);
      if (topic) this.broadcastAllPresence();
    });
  }

  private handleMessage(socket: WebSocket, message: WsEnvelope) {
    this.socketSeenAt.set(socket, Date.now());

    if (message.type === 'PING') {
      this.send(socket, { type: 'PONG', topic: message.topic, data: null });
      return;
    }

    if (
      message.type === 'SUBSCRIBE' &&
      message.topic?.startsWith('dev-management/')
    ) {
      this.subscribe(socket, message.topic);
      return;
    }

    if (message.type === 'UNSUBSCRIBE') {
      this.unsubscribeCurrent(socket);
      return;
    }

    this.send(socket, {
      type: 'ERROR',
      topic: message.topic,
      data: { message: 'UNSUPPORTED_MESSAGE' },
    });
  }

  private subscribe(socket: WebSocket, topic: string) {
    this.unsubscribeCurrent(socket, false);
    this.socketSeenAt.set(socket, Date.now());

    const sockets = this.topicSockets.get(topic) ?? new Set<WebSocket>();
    sockets.add(socket);
    this.topicSockets.set(topic, sockets);
    this.socketTopic.set(socket, topic);

    this.broadcastAllPresence();
  }

  private unsubscribeCurrent(socket: WebSocket, shouldBroadcast = true) {
    const topic = this.socketTopic.get(socket);
    if (!topic) return null;

    const sockets = this.topicSockets.get(topic);
    sockets?.delete(socket);
    if (sockets?.size === 0) this.topicSockets.delete(topic);
    this.socketTopic.delete(socket);
    if (shouldBroadcast) this.broadcastAllPresence();
    return topic;
  }

  private removeSocket(socket: WebSocket) {
    const topic = this.unsubscribeCurrent(socket, false);
    this.sockets.delete(socket);
    this.socketUser.delete(socket);
    this.socketSeenAt.delete(socket);
    if (socket.readyState === WebSocket.OPEN) {
      socket.close();
    } else if (
      socket.readyState === WebSocket.CONNECTING ||
      socket.readyState === WebSocket.CLOSING
    ) {
      socket.terminate();
    }
    return topic;
  }

  private broadcastAllPresence() {
    for (const topic of this.topicSockets.keys()) {
      this.broadcastPresence(topic);
    }
  }

  private broadcastPresence(topic: string) {
    const roomId = topic.replace('dev-management/', '');
    this.broadcast(topic, {
      type: 'DEV_MANAGEMENT_PRESENCE',
      topic,
      data: { members: this.getPresenceMembers(roomId) },
    });
  }

  private broadcast(topic: string, envelope: WsEnvelope) {
    const sockets = this.topicSockets.get(topic);
    if (!sockets || sockets.size === 0) return;

    for (const socket of sockets) {
      this.send(socket, envelope);
    }
  }

  private send(socket: WebSocket, envelope: WsEnvelope) {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(envelope));
  }
}
