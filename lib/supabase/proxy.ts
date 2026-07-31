import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SUPERADMIN_SESSION_COOKIE,
  SUPERADMIN_SESSION_VALUE,
} from "@/lib/superadmin/constants";
import {
  SESSION_EXPIRED_HREF,
  isInvalidSessionError,
} from "@/lib/supabase/auth-session";

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

function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && name.includes("auth-token");
}

function clearAuthCookies(request: NextRequest, response: NextResponse) {
  for (const { name } of request.cookies.getAll()) {
    if (isSupabaseAuthCookie(name)) {
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
    }
  }
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

function redirectToLoginExpired(
  request: NextRequest,
  supabaseResponse: NextResponse
) {
  const url = new URL(SESSION_EXPIRED_HREF, request.nextUrl.origin);
  const redirectResponse = NextResponse.redirect(url);
  copyCookies(supabaseResponse, redirectResponse);
  clearAuthCookies(request, redirectResponse);
  return redirectResponse;
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

  const { pathname } = request.nextUrl;
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => isSupabaseAuthCookie(c.name));

  // getClaims → gerekirse getSession ile token yeniler.
  // JWT expired gibi AuthError olmayan throw'lar da burada yakalanır
  // (aksi halde proxy çöküp genel hata sayfası gösterir).
  let user: unknown = null;
  let claimsError: unknown = null;

  try {
    const { data, error } = await supabase.auth.getClaims();
    claimsError = error;
    user = data?.claims ?? null;
  } catch (error) {
    claimsError = error;
    user = null;
  }

  const sessionBroken =
    isInvalidSessionError(claimsError) ||
    (hasAuthCookie && !user && Boolean(claimsError));

  if (sessionBroken) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // cookie temizliği aşağıda yine yapılır
    }

    if (pathname.startsWith("/dashboard")) {
      return redirectToLoginExpired(request, supabaseResponse);
    }

    // Landing vs. diğer sayfalar: bozuk cookie'leri temizle, devam et
    clearAuthCookies(request, supabaseResponse);
    return supabaseResponse;
  }

  // Giriş yapmamış kullanıcı /dashboard'a erişmeye çalışırsa → landing
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  return supabaseResponse;
}
