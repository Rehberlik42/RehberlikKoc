import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isInvalidSessionError } from "@/lib/supabase/auth-session";

/**
 * Ayni HTTP istegi (request) icinde birden fazla server component
 * (layout.tsx + page.tsx gibi) auth kontrolu yapabilir. React'in
 * cache() fonksiyonu, ayni request icinde bu fonksiyona yapilan
 * tekrar cagrilari gercek bir network istegi atmadan, ilk sonucu
 * paylasarak cozer. Farkli request'lerde (farkli sayfa navigasyonlarinda)
 * yeniden calisir - guvenlik davranisi degismez, sadece ayni sayfa
 * icindeki tekrarlar elenir.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error && isInvalidSessionError(error)) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // ignore
      }
    }

    return { user, error, supabase };
  } catch (error) {
    if (isInvalidSessionError(error)) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // ignore
      }
    }

    return {
      user: null,
      error: error instanceof Error ? error : new Error(String(error)),
      supabase,
    };
  }
});
