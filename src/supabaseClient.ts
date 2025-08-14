// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// Jeden, wspólny klient dla całej aplikacji
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: false,   // brak sesji w localStorage/cookies
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
