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
    <div className="flex min-h-screen bg-[#f3f5fc] text-[#161a3a]">
      <aside className="flex w-60 shrink-0 flex-col border-r border-[#d9def0] bg-white shadow-[1px_0_0_rgba(22,26,58,0.02)]">
        <div className="border-b border-[#d9def0] px-5 py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6b4dff] to-[#4f7cff] shadow-md shadow-[#6b4dff]/25">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide text-[#161a3a]">MINDORA</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6b4dff]">
                Superadmin
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <Link
            href="/superadmin"
            className="flex items-center gap-2.5 rounded-xl bg-[#6b4dff]/10 px-3 py-2.5 text-sm font-semibold text-[#6b4dff] ring-1 ring-[#6b4dff]/15"
          >
            <Building2 className="h-4 w-4" />
            Müşteriler
          </Link>
        </nav>

        <div className="border-t border-[#d9def0] p-3">
          <form action={logoutSuperadmin}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-[#5a628c] transition-colors hover:bg-[#fef2f2] hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </button>
          </form>
        </div>
      </aside>

      <main className="relative flex-1 overflow-auto">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(107,77,255,0.08),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
