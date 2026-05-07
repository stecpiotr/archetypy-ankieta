// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL!;
const apiKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  || "";

if (!url || !apiKey) {
  throw new Error("Brak konfiguracji Supabase: ustaw VITE_SUPABASE_URL oraz klucz API.");
}

// Jeden, wspólny klient dla całej aplikacji
export const supabase = createClient(url, apiKey, {
  auth: {
    persistSession: false,   // brak sesji w localStorage/cookies
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
