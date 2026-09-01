"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface AccountResponse {
  ok?: boolean;
  message?: string;
}

type AccountMode = "login" | "register";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AccountMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function changeMode(nextMode: AccountMode) {
    if (isSubmitting || nextMode === mode) return;
    setMode(nextMode);
    setPassword("");
    setInvitationCode("");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/private/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          ...(mode === "register" ? { invitationCode } : {}),
        }),
      });
      const result = (await response.json()) as AccountResponse;

      if (!response.ok) {
        setMessage(result.message ?? "暂时无法进入私密空间，请稍后再试。");
        return;
      }

      setPassword("");
      setInvitationCode("");
      router.refresh();
    } catch {
      setMessage("暂时无法进入私密空间，请检查网络后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitLabel = isSubmitting
    ? mode === "register" ? "注册中…" : "登录中…"
    : mode === "register" ? "注册并登录" : "登录";

  return (
    <div className="mt-10">
      <div className="inline-flex border border-[#bcb4a9] p-1" aria-label="账号操作">
        {(["login", "register"] as const).map((item) => {
          const selected = mode === item;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={selected}
              onClick={() => changeMode(item)}
              disabled={isSubmitting}
              className={`min-h-10 px-5 text-xs font-semibold tracking-[0.12em] transition-colors disabled:opacity-50 ${selected ? "bg-[#302d29] text-[#f3eee6]" : "text-[#625b53] hover:bg-[#e9e1d6]"}`}
            >
              {item === "login" ? "登录" : "注册"}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5" aria-describedby="account-message">
        <label className="block">
          <span className="eyebrow block text-[#777067]">账号</span>
          <input
            name="username"
            type="text"
            autoComplete="username"
            required
            minLength={2}
            maxLength={32}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={isSubmitting}
            className="mt-2 min-h-12 w-full border border-[#bcb4a9] bg-transparent px-4 text-base focus:border-[#6d6257] disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="eyebrow block text-[#777067]">密码</span>
          <input
            name="password"
            type="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            required
            minLength={mode === "register" ? 8 : undefined}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            className="mt-2 min-h-12 w-full border border-[#bcb4a9] bg-transparent px-4 text-base focus:border-[#6d6257] disabled:opacity-60"
          />
          {mode === "register" ? (
            <span className="mt-2 block text-xs leading-5 text-[#777067]">至少 8 个字符，最多 72 字节。</span>
          ) : null}
        </label>

        {mode === "register" ? (
          <label className="block">
            <span className="eyebrow block text-[#777067]">邀请码</span>
            <input
              name="invitationCode"
              type="text"
              autoComplete="off"
              required
              minLength={16}
              maxLength={128}
              value={invitationCode}
              onChange={(event) => setInvitationCode(event.target.value)}
              disabled={isSubmitting}
              className="mt-2 min-h-12 w-full border border-[#bcb4a9] bg-transparent px-4 font-mono text-sm focus:border-[#6d6257] disabled:opacity-60"
            />
          </label>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="account-message" aria-live="polite" className="min-h-5 text-sm text-[#9c3f2c]">
            {message}
          </p>
          <button
            type="submit"
            disabled={isSubmitting || username.length === 0 || password.length === 0 || (mode === "register" && invitationCode.length === 0)}
            className="min-h-12 shrink-0 border border-[#302d29] bg-[#302d29] px-7 text-xs font-semibold tracking-[0.12em] text-[#f3eee6] transition-colors hover:bg-transparent hover:text-[#302d29] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
