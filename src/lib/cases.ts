import { supabase } from "../supabaseClient";

export type Gender = "M" | "F";

export interface StudyRow {
  slug: string;
  is_active: boolean;
  gender: Gender;

  first_name_nom: string;
  first_name_gen: string;
  first_name_dat: string | null;
  first_name_acc: string | null;
  first_name_ins: string | null;
  first_name_loc: string | null;
  first_name_voc: string | null;

  last_name_nom: string;
  last_name_gen: string;
  last_name_dat: string | null;
  last_name_acc: string | null;
  last_name_ins: string | null;
  last_name_loc: string | null;
  last_name_voc: string | null;

  city_nom: string | null;
  city_loc: string | null;
}

export function getSlugFromUrl(): string | null {
  try {
    const url = new URL(window.location.href);
    const seg = url.pathname.split("/").filter(Boolean)[0];
    if (seg) return decodeURIComponent(seg);
    const qs = url.searchParams.get("s");
    return qs ? qs.trim() : null;
  } catch {
    return null;
  }
}

export async function loadStudyBySlug(slug: string): Promise<StudyRow | null> {
  const { data, error } = await supabase
    .from("studies")
    .select(
      [
        "slug","is_active","gender",
        "first_name_nom","first_name_gen","first_name_dat","first_name_acc","first_name_ins","first_name_loc","first_name_voc",
        "last_name_nom","last_name_gen","last_name_dat","last_name_acc","last_name_ins","last_name_loc","last_name_voc",
        "city_nom","city_loc"
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
  return (data as unknown as StudyRow) || null;
}
