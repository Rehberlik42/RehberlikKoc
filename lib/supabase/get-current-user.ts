import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { user, error, supabase };
});
