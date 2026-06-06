"use client";

import Link from "next/link";
import { Building2, LogOut, Shield } from "lucide-react";
import { logoutSuperadmin } from "../actions";

export default function SuperadminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#050510] text-white">
      <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-[#0a0a18]/80 backdrop-blur-sm">
        <div className="border-b border-white/10 px-5 py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7B2FFF] to-[#4F7CFF]">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide text-white">MINDORA</p>
              <p className="text-[10px] uppercase tracking-widest text-[#00D4FF]/70">
                Superadmin
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <Link
            href="/superadmin"
            className="flex items-center gap-2.5 rounded-lg bg-[#7B2FFF]/15 px-3 py-2.5 text-sm font-medium text-[#c4b5ff] ring-1 ring-[#7B2FFF]/25"
          >
            <Building2 className="h-4 w-4" />
            Müşteriler
          </Link>
        </nav>

        <div className="border-t border-white/10 p-3">
          <form action={logoutSuperadmin}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
