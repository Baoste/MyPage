"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface LoginResponse {
  ok?: boolean;
  message?: string;
}

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/private/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as LoginResponse;

      if (!response.ok) {
        setMessage(result.message ?? "Unable to enter the private space.");
        return;
      }

      setPassword("");
      router.refresh();
    } catch {
      setMessage("Unable to enter the private space right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10" aria-describedby="login-message">
      <label htmlFor="private-password" className="eyebrow block text-[#777067]">
        Password
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="private-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          className="min-h-12 min-w-0 flex-1 border border-[#bcb4a9] bg-transparent px-4 text-base outline-none focus:border-[#6d6257] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSubmitting || password.length === 0}
          className="min-h-12 border border-[#302d29] bg-[#302d29] px-7 text-xs font-semibold uppercase tracking-[0.12em] text-[#f3eee6] transition-colors hover:bg-transparent hover:text-[#302d29] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isSubmitting ? "Entering…" : "Enter"}
        </button>
      </div>
      <p id="login-message" aria-live="polite" className="mt-3 min-h-5 text-sm text-[#9c3f2c]">
        {message}
      </p>
    </form>
  );
}
