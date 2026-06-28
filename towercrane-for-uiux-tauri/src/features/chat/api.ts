import { API_BASE, apiRequest } from "../../shared/api/client";

export type MeetingRoom = {
  id: string;
  name: string;
  roomType: string;
  description: string | null;
  orderIdx: number;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  dmCounterpart: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user";
  } | null;
};

export type MeetingMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: string | null;
  content: string;
  messageType: string;
  payload: unknown;
  createdAt: string;
};

export async function getRooms(token: string): Promise<MeetingRoom[]> {
  return apiRequest<MeetingRoom[]>("/meeting/rooms", {
    token,
    errorMessage: "대화 목록을 불러오지 못했습니다.",
  });
}

export async function startDm(token: string, otherUserId: string): Promise<MeetingRoom> {
  return apiRequest<MeetingRoom>("/meeting/dms", {
    method: "POST",
    body: { otherUserId },
    token,
    errorMessage: "대화를 시작하지 못했습니다.",
  });
}

export async function getRoomMessages(
  token: string,
  roomId: string,
  limit = 100,
): Promise<MeetingMessage[]> {
  return apiRequest<MeetingMessage[]>(
    `/meeting/rooms/${roomId}/messages?limit=${limit}`,
    { token, errorMessage: "메시지를 불러오지 못했습니다." },
  );
}

export async function sendMeetingMessage(
  token: string,
  roomId: string,
  content: string,
): Promise<MeetingMessage> {
  return apiRequest<MeetingMessage>(`/meeting/rooms/${roomId}/messages`, {
    method: "POST",
    body: { content },
    token,
    errorMessage: "메시지 전송에 실패했습니다.",
  });
}

// WebSocket(실시간 수신)용 URL. http(s)://host/api → ws(s)://host/ws/meeting
export function meetingSocketUrl(token: string): string {
  const wsBase = API_BASE.replace(/^http/, "ws").replace(/\/api$/, "");
  return `${wsBase}/ws/meeting?token=${encodeURIComponent(token)}`;
}
