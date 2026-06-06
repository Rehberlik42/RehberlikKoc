"use client";

import { useActionState } from "react";
import { Shield, Lock, User } from "lucide-react";
import { loginSuperadmin } from "../actions";

const initialState = { error: "" };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await loginSuperadmin(formData);
      return result ?? initialState;
    },
    initialState
  );

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#7B2FFF]/40 via-[#4F7CFF]/30 to-[#00D4FF]/40 blur-xl opacity-70" />

      <div className="relative rounded-2xl border border-white/10 bg-[#0a0a18]/95 p-8 shadow-2xl shadow-[#7B2FFF]/10 backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#7B2FFF] to-[#4F7CFF] shadow-lg shadow-[#7B2FFF]/30">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">MINDORA Superadmin</h1>
          <p className="mt-2 text-sm text-white/40">
            SaaS müşteri yönetim paneline giriş
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-medium text-white/70"
            >
              Kullanıcı Adı
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B2FFF]/70" />
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-white placeholder:text-white/25 focus:border-[#7B2FFF]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2FFF]/30"
                placeholder="Kullanıcı adınızı girin"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-white/70"
            >
              Şifre
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4F7CFF]/70" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-white placeholder:text-white/25 focus:border-[#4F7CFF]/50 focus:outline-none focus:ring-1 focus:ring-[#4F7CFF]/30"
                placeholder="Şifrenizi girin"
              />
            </div>
          </div>

          {state?.error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-400">
              {state.error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7B2FFF]/25 transition-all hover:shadow-[#7B2FFF]/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
