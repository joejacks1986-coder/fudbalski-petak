import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Next tipovi nisu konzistentni oko getAll, zato ručno pravimo listu
        getAll: () => {
          const all: { name: string; value: string }[] = [];

          // cookieStore je iterable u runtime-u (radi i kad TS ne zna)
          // @ts-expect-error — Next cookies typing nije uvek iterable u TS, ali runtime jeste
          for (const c of cookieStore) {
            all.push({ name: c.name, value: c.value });
          }

          return all;
        },

        setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            // @ts-expect-error — Next cookies typing je readonly, ali runtime dozvoljava
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
