import { useState } from "react";
import Login from "./Login";
import Signup from "./Signup";
import type { User } from "../../entities/user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/ui/card";

type Props = {
  onSuccess: (user: User) => void;
};

type Mode = "login" | "signup";

function AuthScreen({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--primary) 85%, #0891b2) 0%, var(--primary) 100%)",
      }}
    >
      <Card className="w-[360px] max-w-full">
        <CardHeader className="items-center text-center">
          <span className="mb-1 flex size-13 items-center justify-center rounded-2xl border border-brand-border bg-brand-glass text-2xl">
            💬
          </span>
          <CardTitle>Towercrane Messenger</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "업무용 메신저에 로그인하세요"
              : "새 계정을 만들어 시작하세요"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <Login
              onSuccess={onSuccess}
              onSwitchToSignup={() => setMode("signup")}
            />
          ) : (
            <Signup
              onSuccess={onSuccess}
              onSwitchToLogin={() => setMode("login")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AuthScreen;
