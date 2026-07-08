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
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#6b4dff]/30 via-[#4f7cff]/25 to-[#7aa2ff]/30 blur-2xl opacity-80" />

      <div className="relative rounded-3xl border border-[#d9def0] bg-white/95 p-8 shadow-2xl shadow-[#6b4dff]/10 backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6b4dff] to-[#4f7cff] shadow-lg shadow-[#6b4dff]/30">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#161a3a]">MINDORA Superadmin</h1>
          <p className="mt-2 text-sm text-[#5a628c]">
            SaaS müşteri yönetim paneline giriş
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-sm font-medium text-[#161a3a]"
            >
              Kullanıcı Adı
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b4dff]/70" />
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="sa-input pl-10"
                placeholder="Kullanıcı adınızı girin"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-[#161a3a]"
            >
              Şifre
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4f7cff]/70" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="sa-input pl-10"
                placeholder="Şifrenizi girin"
              />
            </div>
          </div>

          {state?.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-gradient-to-r from-[#6b4dff] to-[#4f7cff] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#6b4dff]/25 transition-all hover:shadow-[#6b4dff]/35 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
