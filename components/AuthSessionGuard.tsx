"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  SESSION_EXPIRED_HREF,
  consumeIntentionalSignOut,
} from "@/lib/supabase/auth-session";

/**
 * Tarayıcıda arka plan token yenilemesi başarısız olunca (SIGNED_OUT)
 * kullanıcıyı giriş sayfasına yönlendirir. Bilinçli çıkışta mesaj göstermez.
 */
export default function AuthSessionGuard() {
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT") return;

      if (consumeIntentionalSignOut()) return;

      const path = window.location.pathname;
      if (!path.startsWith("/dashboard")) return;

      window.location.replace(SESSION_EXPIRED_HREF);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
