import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SUPERADMIN_SESSION_COOKIE,
  SUPERADMIN_SESSION_VALUE,
} from "@/lib/superadmin/constants";

function handleSuperadminRoute(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/superadmin")) {
    return null;
  }

  const session = request.cookies.get(SUPERADMIN_SESSION_COOKIE);
  const isAuthenticated = session?.value === SUPERADMIN_SESSION_VALUE;
  const isLoginPage = pathname === "/superadmin/login";

  if (isLoginPage) {
    if (isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/superadmin";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  if (!isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/superadmin/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export async function updateSession(request: NextRequest) {
  const superadminResponse = handleSuperadminRoute(request);
  if (superadminResponse) {
    return superadminResponse;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims(): JWT'yi yerel olarak dogrular — ag cagrisi YOK, token tuketmez.
  // getUser() yerine bu kullanilmali; cift network cagrisindan kaynaklanan
  // token-refresh cakismasini onler.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { pathname } = request.nextUrl;

  // Giris yapmamis kullanici /dashboard'a erismeye calisirsa → landing page
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
