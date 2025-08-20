// src/lib/studies.ts
import { supabase } from "../supabaseClient";

export type Gender = "M" | "F";

export interface StudyRow {
  slug: string;
  is_active: boolean;

  // imię/nazwisko – formy bazowe + gen
  first_name_nom: string;
  first_name_gen: string;
  last_name_nom: string;
  last_name_gen: string;

  // (opcjonalnie w bazie – ale używamy, jeśli są)
  first_name_ins?: string | null;
  last_name_ins?: string | null;
  first_name_loc?: string | null;
  last_name_loc?: string | null;

  // miasto – nie jest krytyczne dla ankiety, ale zostawiamy
  city_nom?: string | null;
  city_loc?: string | null;

  gender: Gender;
}

/** Slug bierzemy ze ścieżki /<slug>.  Zostawiamy rezerwę ?s=... */
export function getSlugFromUrl(): string | null {
  try {
    const url = new URL(window.location.href);

    // 1) /stec → "stec"
    const seg = url.pathname.split("/").filter(Boolean)[0];
    if (seg) return decodeURIComponent(seg);

    // 2) ?s=legacy
    const qs = url.searchParams.get("s");
    return qs ? qs.trim() : null;
  } catch {
    return null;
  }
}

/** Pobiera rekord z `public.studies` po slugu. Zwraca null, jeśli nie ma aktywnego. */
export async function loadStudyBySlug(slug: string): Promise<StudyRow | null> {
  // 🔎 tymczasowy debug — zobaczysz wszystko w konsoli przeglądarki
  console.log("[studies] slug →", slug);

  const columns = [
    "slug",
    "is_active",
    "first_name_nom",
    "first_name_gen",
    "last_name_nom",
    "last_name_gen",
    "first_name_ins",
    "last_name_ins",
    "first_name_loc",
    "last_name_loc",
    "city_nom",
    "city_loc",
    "gender",
  ].join(",");

  const { data, error } = await supabase
    .from("studies")
    .select(columns)
    .eq("slug", slug)          // dokładne dopasowanie
    .eq("is_active", true)     // tylko aktywne
    .single();                 // oczekujemy dokładnie 1 rekordu

  if (error) {
    // 406 (No Rows) = brak dopasowania — to *nie jest* błąd sieciowy
    console.warn("[studies] loadStudyBySlug error:", error);
    return null;
  }

  console.log("[studies] row →", data);
  return (data as StudyRow) || null;
}
