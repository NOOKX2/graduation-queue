import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    "https://itihdyxxrhjbxxsnphtc.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0aWhkeXh4cmhqYnh4c25waHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NDQxNzAsImV4cCI6MjEwNjQyMDE3MH0.AWHZYXVgDBPZfgVR2yeoz1ESJdMFzi9ViSJ7-v_EHsM",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Safe to ignore in Server Components.
          }
        }
      }
    }
  );
}
