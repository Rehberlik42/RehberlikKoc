"use client";

import { useEffect } from "react";
import {
  SESSION_EXPIRED_HREF,
  isInvalidSessionError,
} from "@/lib/supabase/auth-session";

/**
 * Beklenmeyen hatalarda: oturum/refresh hatasıysa girişe yönlendir;
 * aksi halde sade bir kurtarma ekranı göster.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isInvalidSessionError(error)) {
      window.location.replace(SESSION_EXPIRED_HREF);
    }
  }, [error]);

  if (isInvalidSessionError(error)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg,#141432)] text-sm text-white/70">
        Oturum kontrol ediliyor…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg,#141432)] px-6 text-center">
      <p className="text-lg font-bold text-white">Bir şeyler ters gitti</p>
      <p className="max-w-md text-sm text-white/60">
        Sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilirsin.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] px-5 py-2.5 text-sm font-bold text-white"
      >
        Tekrar dene
      </button>
    </div>
  );
}
