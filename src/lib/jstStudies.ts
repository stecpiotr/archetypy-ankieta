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
  study_status?: "active" | "suspended" | "closed" | "deleted" | string | null;
  status_changed_at?: string | null;
  started_at?: string | null;
  survey_display_mode?: "matrix" | "single" | string | null;
  survey_show_progress?: boolean | null;
  survey_allow_back?: boolean | null;
  survey_randomize_questions?: boolean | null;
  survey_auto_start_enabled?: boolean | null;
  survey_auto_start_at?: string | null;
  survey_auto_start_applied_at?: string | null;
  survey_auto_end_enabled?: boolean | null;
  survey_auto_end_at?: string | null;
  survey_auto_end_applied_at?: string | null;
  metryczka_config?: unknown;
  metryczka_config_version?: number | null;
}

export interface JstTextCtx {
  type: "miasto" | "gmina";
  typeCap: "Miasto" | "Gmina";
  typeGen: "miasta" | "gminy";
  typeLoc2: "mieście" | "gminie";
  typeLoc: "mieście" | "gminie";
  typeDat: "miastu" | "gminie";
  typeGenCap: "Miasta" | "Gminy";
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
  const typeGenCap = (type === "miasto" ? "Miasta" : "Gminy") as "Miasta" | "Gminy";
  const typeLoc = (type === "miasto" ? "mieście" : "gminie") as "mieście" | "gminie";
  const typeLoc2 = typeLoc;
  const typeDat = (type === "miasto" ? "miastu" : "gminie") as "miastu" | "gminie";
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
    typeLoc2,
    typeLoc,
    typeDat,
    typeGenCap,
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
  const rep = (src: string, from: string, to: string): string => src.split(from).join(to);
  const out = [
    ["{nazwa JST w dopełniaczu}", ctx.fullGen],
    ["{nazwa JST w mianowniku}", ctx.fullNom],
    ["{nazwa miasta w mianowniku}", ctx.fullNom],
    ["{nazwa gminy w mianowniku}", ctx.fullNom],
    ["{narzędnik JST}", ctx.nameIns],
    ["{miasto/gmina}", ctx.type],
    ["{Miasto/Gmina}", ctx.typeCap],
    ["{miasta/gminy}", ctx.typeGen],
    ["{Miasta/Gminy}", ctx.typeGenCap],
    ["{miasta}/{gminy}", ctx.typeGen],
    ["{mieście/gminie}", ctx.typeLoc],
    ["{miastu/gminie}", ctx.typeDat],
    ["{miastu/gminie}", ctx.typeDat],
    ["{mieście/gminie}", ctx.typeLoc2],
    ["{naszym mieście}/{naszej gminie}", ctx.type === "miasto" ? "naszym mieście" : "naszej gminie"],
    ["{mieście}/{gminie}", ctx.typeLoc],
    ["{miasto}", "miasto"],
    ["{gmina}", "gmina"],
  ].reduce((acc, [from, to]) => rep(acc, from, to), text || "");
  return out;
}
