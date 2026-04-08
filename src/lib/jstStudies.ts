import { supabase } from "../supabaseClient";

export interface JstStudyRow {
  id: string;
  slug: string;
  jst_type: "miasto" | "gmina";
  jst_name: string;
  jst_name_nom?: string | null;
  jst_name_gen?: string | null;
  jst_name_dat?: string | null;
  jst_name_acc?: string | null;
  jst_name_ins?: string | null;
  jst_name_loc?: string | null;
  jst_name_voc?: string | null;
  jst_full_nom?: string | null;
  jst_full_gen?: string | null;
  jst_full_dat?: string | null;
  jst_full_acc?: string | null;
  jst_full_ins?: string | null;
  jst_full_loc?: string | null;
  jst_full_voc?: string | null;
  is_active?: boolean;
}

export interface JstTextCtx {
  type: "miasto" | "gmina";
  typeCap: "Miasto" | "Gmina";
  typeGen: "miasta" | "gminy";
  typeLoc: "mieście" | "gminie";
  verbShould: "powinno działać" | "powinna działać";
  fullNom: string;
  fullGen: string;
  fullDat: string;
  fullAcc: string;
  fullIns: string;
  fullLoc: string;
  nameNom: string;
  nameGen: string;
  nameIns: string;
}

function t(v?: string | null): string {
  return (v ?? "").trim();
}

export async function loadJstStudyBySlug(slug: string): Promise<JstStudyRow | null> {
  const clean = (slug || "").trim();
  if (!clean) return null;

  const { data, error } = await supabase.rpc("get_jst_study_public", { p_slug: clean });
  if (error) {
    console.warn("get_jst_study_public error:", error);
    return null;
  }
  if (!data || typeof data !== "object") return null;
  return data as JstStudyRow;
}

export function buildJstTextContext(study: JstStudyRow): JstTextCtx {
  const type = (study.jst_type === "gmina" ? "gmina" : "miasto") as "miasto" | "gmina";
  const typeCap = (type === "miasto" ? "Miasto" : "Gmina") as "Miasto" | "Gmina";
  const typeGen = (type === "miasto" ? "miasta" : "gminy") as "miasta" | "gminy";
  const typeLoc = (type === "miasto" ? "mieście" : "gminie") as "mieście" | "gminie";
  const verbShould = (type === "miasto" ? "powinno działać" : "powinna działać") as
    | "powinno działać"
    | "powinna działać";

  const nameNom = t(study.jst_name_nom) || t(study.jst_name) || "JST";
  const nameGen = t(study.jst_name_gen) || nameNom;
  const nameIns = t(study.jst_name_ins) || nameNom;

  const fullNom = t(study.jst_full_nom) || `${typeCap} ${nameNom}`.trim();
  const fullGen = t(study.jst_full_gen) || `${type === "miasto" ? "Miasta" : "Gminy"} ${nameGen}`.trim();
  const fullDat = t(study.jst_full_dat) || fullNom;
  const fullAcc = t(study.jst_full_acc) || fullNom;
  const fullIns = t(study.jst_full_ins) || fullNom;
  const fullLoc = t(study.jst_full_loc) || fullNom;

  return {
    type,
    typeCap,
    typeGen,
    typeLoc,
    verbShould,
    fullNom,
    fullGen,
    fullDat,
    fullAcc,
    fullIns,
    fullLoc,
    nameNom,
    nameGen,
    nameIns,
  };
}

export function renderJstTemplate(text: string, ctx: JstTextCtx): string {
  const out = (text || "")
    .replaceAll("{nazwa JST w dopełniaczu}", ctx.fullGen)
    .replaceAll("{nazwa JST w mianowniku}", ctx.fullNom)
    .replaceAll("{nazwa miasta w mianowniku}", ctx.fullNom)
    .replaceAll("{nazwa gminy w mianowniku}", ctx.fullNom)
    .replaceAll("{narzędnik JST}", ctx.nameIns)
    .replaceAll("{miasto/gmina}", ctx.type)
    .replaceAll("{Miasto/Gmina}", ctx.typeCap)
    .replaceAll("{miasta}/{gminy}", ctx.typeGen)
    .replaceAll("{mieście/gminie}", ctx.typeLoc)
    .replaceAll("{miastu/gminie}", ctx.type === "miasto" ? "miastu" : "gminie")
    .replaceAll("{naszym mieście}/{naszej gminie}", ctx.type === "miasto" ? "naszym mieście" : "naszej gminie")
    .replaceAll("{mieście/gminie}", ctx.typeLoc)
    .replaceAll("{miasto}", "miasto")
    .replaceAll("{gmina}", "gmina");
  return out;
}
