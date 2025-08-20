// src/lib/studies.ts
import { supabase } from "../supabaseClient";

/** Płeć w bazie */
export type Gender = "M" | "F";

/** Minimalny rekord z tabeli `studies`, którego potrzebuje ankieta */
export interface StudyRow {
  slug: string;
  is_active: boolean;

  // mianownik
  first_name_nom: string | null;
  last_name_nom: string | null;

  // dopełniacz
  first_name_gen: string | null;
  last_name_gen: string | null;

  // miejscownik
  first_name_loc: string | null;
  last_name_loc: string | null;

  // narzędnik
  first_name_ins: string | null;
  last_name_ins: string | null;

  // nazwa JST (opcjonalnie)
  city_nom?: string | null;
  city_loc?: string | null;

  gender: Gender;
}

/** Pobierz slug z URL-a: preferuj /slug, awaryjnie ?s=... */
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

/** Wczytaj rekord badania po slugu (tylko aktywne). */
export async function loadStudyBySlug(slug: string): Promise<StudyRow | null> {
  const { data, error } = await supabase
    .from("studies")
    .select(
      [
        "slug",
        "is_active",
        "gender",

        "first_name",
        "last_name",
        "city",

        "first_name_nom",
        "last_name_nom",

        "first_name_gen",
        "last_name_gen",

        "first_name_loc",
        "last_name_loc",

        "first_name_ins",
        "last_name_ins",
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
  // Typy z Supabase bywają luźne – zwracamy jako StudyRow
  return (data as unknown) as StudyRow;
}

/* ────────────────────────────────────────────────────────────────────────────
   HEURYSTYKI – tylko gdy w bazie brakuje danej odmiany
   (są celowo bardzo proste i bezpieczne).
──────────────────────────────────────────────────────────────────────────── */

function accFirst(nameNom: string, g: Gender): string {
  const n = nameNom || "";
  if (!n) return n;

  if (g === "M") {
    // Kuba → Kubę, Emil → Emila, Marcin → Marcina, Marek → Marka
    if (n.endsWith("ek")) return n.slice(0, -2) + "ka";
    if (n.endsWith("a")) return n.slice(0, -1) + "ę";
    return n + "a";
  } else {
    // Anna → Annę
    if (n.endsWith("a")) return n.slice(0, -1) + "ę";
    return n;
  }
}

function accLast(surNom: string, g: Gender): string {
  const s = surNom || "";
  if (!s) return s;

  if (g === "M") {
    // Gołek → Gołka, Stec → Steca, Kowalski → Kowalskiego (tu ostrożnie: dajemy -a jako bezpieczny wariant)
    if (s.endsWith("ek")) return s.slice(0, -2) + "ka";
    // większość męskich nazwisk zakończonych spółgłoską dostaje -a
    if (/[bcćdfghjklłmnńprsśtwzźż]$/i.test(s)) return s + "a";
    return s;
  } else {
    // Kowalska → Kowalską, Nowacka → Nowacką, Kuźbicka → Kuźbicką
    if (s.endsWith("ska")) return s.slice(0, -3) + "ską";
    if (s.endsWith("cka")) return s.slice(0, -3) + "cką";
    if (s.endsWith("dzka")) return s.slice(0, -4) + "dzką";
    if (s.endsWith("zka")) return s.slice(0, -3) + "zką";
    if (s.endsWith("ka")) return s.slice(0, -1) + "ą";
    if (s.endsWith("a")) return s.slice(0, -1) + "ą";
    return s;
  }
}

function insFirst(nameNom: string, g: Gender): string {
  const n = nameNom || "";
  if (!n) return n;

  if (g === "M") {
    // Marek → Markiem, Emil → Emilem, Marcin → Marcinem
    if (n.endsWith("ek")) return n.slice(0, -2) + "kiem";
    if (n.endsWith("a")) return n.slice(0, -1) + "ą";
    return n + "em";
  } else {
    // Anna → Anną
    if (n.endsWith("a")) return n.slice(0, -1) + "ą";
    return n;
  }
}

function insLast(surNom: string, g: Gender): string {
  const s = surNom || "";
  if (!s) return s;

  if (g === "M") {
    // Gołek → Gołkiem, Stec → Stecem/Stecem (bezpiecznie +em)
    if (s.endsWith("ek")) return s.slice(0, -2) + "kiem";
    if (s.endsWith("a")) return s.slice(0, -1) + "ą";
    return s + "em";
  } else {
    if (s.endsWith("ska")) return s.slice(0, -3) + "ską";
    if (s.endsWith("cka")) return s.slice(0, -3) + "cką";
    if (s.endsWith("dzka")) return s.slice(0, -4) + "dzką";
    if (s.endsWith("zka")) return s.slice(0, -3) + "zką";
    if (s.endsWith("ka")) return s.slice(0, -1) + "ą";
    if (s.endsWith("a")) return s.slice(0, -1) + "ą";
    return s;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   ZBUDUJ WYŚWIETLANE FRAZY
   (Mianownik, Dopełniacz, Biernik, Narzędnik, Miejscownik)
──────────────────────────────────────────────────────────────────────────── */

export interface BuiltDisplay {
  gender: Gender;
  surNom: string;       // nazwisko w mianowniku
  fullNom: string;      // „Emil Stec”
  fullGen: string;      // „Emila Steca”
  fullAcc: string;      // „Emila Steca” (biernik; w męskich zwykle = dopełniacz)
  fullIns: string;      // „Emilem Stecem” / „Anną Kowalską”
  fullLoc: string;      // „o Emilu Stecu” / „o Annie Kowalskiej”
}

/** Główna funkcja do używania w UI. Czyta z bazy, a braki uzupełnia heurystyką. */
export function buildDisplayFromStudy(study: StudyRow): BuiltDisplay {
  const g: Gender = study.gender || "M";

  // Mianownik (preferuj *_nom, a jak brak – first_name/last_name)
  const firstNom = (study.first_name_nom ?? (study as any).first_name ?? "").trim();
  const lastNom  = (study.last_name_nom  ?? (study as any).last_name  ?? "").trim();

  const fullNom = `${firstNom} ${lastNom}`.trim();

  // Dopełniacz – najpierw spróbuj z bazy, w razie braku użyj prostych reguł
  const firstGen = (study.first_name_gen ?? "").trim() || (g === "M" ? firstNom + "a" : (firstNom.endsWith("a") ? firstNom.slice(0, -1) + "y" : firstNom));
  const lastGen  = (study.last_name_gen  ?? "").trim() || (g === "M" ? (lastNom.endsWith("ek") ? lastNom.slice(0, -2) + "ka" : lastNom + "a") : lastNom);
  const fullGen  = `${firstGen} ${lastGen}`.trim();

  // Biernik – w męskich osobowych zwykle = dopełniacz; dla K → końcówki „ę/ą”
  const firstAcc = accFirst(firstNom, g);
  const lastAcc  = accLast(lastNom, g);
  const fullAcc  = `${firstAcc} ${lastAcc}`.trim();

  // Narzędnik – z bazy lub heurystyka
  const firstIns = (study.first_name_ins ?? "").trim() || insFirst(firstNom, g);
  const lastIns  = (study.last_name_ins  ?? "").trim() || insLast(lastNom, g);
  const fullIns  = `${firstIns} ${lastIns}`.trim();

  // Miejscownik – tylko jeśli obie części są w bazie; w przeciwnym razie bezpiecznie „o {Nom}”
  const locFirst = (study.first_name_loc ?? "").trim();
  const locLast  = (study.last_name_loc  ?? "").trim();
  const fullLoc  = (locFirst && locLast) ? `${locFirst} ${locLast}` : `o ${fullNom}`;

  return {
    gender: g,
    surNom: lastNom,
    fullNom,
    fullGen,
    fullAcc,
    fullIns,
    fullLoc,
  };
}
