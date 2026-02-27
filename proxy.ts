import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // VAŽNO: getSession (ne getUser)
  const { data: { session } } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // =====================
  // KICKOFF GATE (1x per session)
  // =====================
  // Next.js v16 uses proxy.ts instead of middleware.ts.
  // We gate only the home route and only if the session cookie isn't set.
  if (pathname === "/") {
    const seenKickoff = req.cookies.get("seenKickoff")?.value;
    if (seenKickoff !== "1") {
      const url = req.nextUrl.clone();
      url.pathname = "/kickoff";
      return NextResponse.redirect(url);
    }
  }

  // pusti login
  if (pathname.startsWith("/admin/login")) return res;

  // zaštiti admin
  if (pathname.startsWith("/admin")) {
    if (!session?.user) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  // Run on home (for KickoffGate) and on admin routes (for auth).
  matcher: ["/", "/admin/:path*"],
};
