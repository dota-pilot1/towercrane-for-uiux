import { ApiError, apiRequest, getToken, setToken } from "../../shared/api/client";

export type User = {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string | null;
  role: "admin" | "user";
  aiAccess: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LoginResult = {
  token: string;
  user: User;
  expiresAt: string;
};

export { getToken, setToken };

export async function login(email: string, password: string): Promise<LoginResult> {
  let result: LoginResult;
  try {
    result = await apiRequest<LoginResult>("/auth/login", {
      method: "POST",
      body: { email, password },
      errorMessage: "로그인에 실패했습니다.",
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    throw err;
  }
  setToken(result.token);
  return result;
}

export async function me(token: string): Promise<User> {
  return apiRequest<User>("/auth/me", {
    token,
    errorMessage: "세션이 만료되었습니다.",
  });
}

export async function logout(token: string): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST", token });
  } catch {
    // 네트워크 실패해도 로컬 토큰은 비운다
  }
  setToken(null);
}
