// src/lib/studies.ts
import { supabase } from "../supabaseClient";

export type Study = {
  id: string;
  slug: string;
  person_first_name: string | null;
  person_last_name: string | null;
  city_name: string | null;
  gender: "M" | "K" | null;
};

/**
 * Zwraca slug badania z URL.
 * Obsługuje zarówno /slug jak i ?s=slug.
 */
export function getSlugFromUrl(): string | null {
  const url = new URL(window.location.href);

  // Priorytet: query param ?s=...
  const s = url.searchParams.get("s");
  if (s && s.trim()) return s.trim();

  // Druga opcja: ścieżka /slug
  const path = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  return path ? decodeURIComponent(path) : null;
}

/**
 * Ładuje rekord badania po slugu z tabeli public.studies.
 */
export async function loadStudyBySlug(slug: string): Promise<Study | null> {
  const { data, error } = await supabase
    .from("studies")
    .select("id, slug, person_first_name, person_last_name, city_name, gender")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("loadStudyBySlug error:", error);
    return null;
  }
  return (data as Study) ?? null;
}
