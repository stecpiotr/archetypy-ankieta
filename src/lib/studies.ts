// src/lib/studies.ts
import { supabase } from "../supabaseClient";

export type Gender = "M" | "F";

export interface StudyRow {
  slug: string;
  is_active: boolean;

  first_name_nom: string;
  first_name_gen: string;

  last_name_nom: string;
  last_name_gen: string;

  city_nom: string;
  city_loc: string;

  gender: Gender;
}

/**
 * Slug bierzemy z pathname: /golek, /kowalska itp.
 * Jeżeli ktoś używa starego ?s=... – nadal możemy to obsłużyć jako rezerwę.
 */
export function getSlugFromUrl(): string | null {
  try {
    const url = new URL(window.location.href);

    // 1) preferujemy ścieżkę (/golek)
    const seg = url.pathname.split("/").filter(Boolean)[0];
    if (seg) return decodeURIComponent(seg);

    // 2) rezerwa: ?s=legacy
    const qs = url.searchParams.get("s");
    return qs ? qs.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Ładujemy pojedynczy wiersz badania po slugu.
 * Zwracamy również kolumny z odmianami.
 */
export async function loadStudyBySlug(
  slug: string
): Promise<StudyRow | null> {
  const { data, error } = await supabase
    .from("studies")
    .select(
      [
        "slug",
        "is_active",
        "first_name_nom",
        "first_name_gen",
        "last_name_nom",
        "last_name_gen",
        "city_nom",
        "city_loc",
        "gender",
      ].join(",")
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("loadStudyBySlug error:", error);
    return null;
  }
  return (data as StudyRow) || null;
}
