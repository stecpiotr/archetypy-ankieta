import { supabase } from "../supabaseClient";

export type JstTokenMeta = {
  found: boolean;
  channel: "sms" | "email" | null;
  contact: string;
  study_id: string;
  study_slug: string;
  completed: boolean;
  rejected: boolean;
  revoked: boolean;
  completed_at?: string | null;
  rejected_at?: string | null;
  revoked_at?: string | null;
};

export type PersonalTokenMeta = {
  found: boolean;
  channel: "sms" | "email" | null;
  contact: string;
  study_id: string;
  study_slug: string;
  completed: boolean;
  revoked: boolean;
  completed_at?: string | null;
  revoked_at?: string | null;
};

async function rpcBool(fn: string, token: string): Promise<boolean> {
  if (!token) return false;
  const { data, error } = await supabase.rpc(fn, { p_token: token });
  if (error) throw error;
  return Boolean(data);
}

async function rpcVoid(fn: string, token: string): Promise<void> {
  if (!token) return;
  const { error } = await supabase.rpc(fn, { p_token: token });
  if (error) throw error;
}

/** Personal */
export async function isTokenCompleted(token: string): Promise<boolean> {
  return rpcBool("is_token_completed", token);
}

export async function markTokenStarted(token: string): Promise<void> {
  await rpcVoid("mark_token_started", token);
}

export async function markTokenCompleted(token: string): Promise<void> {
  await rpcVoid("mark_token_completed", token);
}

export async function getTokenMeta(token: string): Promise<PersonalTokenMeta | null> {
  if (!token) return null;
  const { data, error } = await supabase.rpc("get_token_meta", { p_token: token });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;

  const d = data as Record<string, unknown>;
  const channelRaw = String(d.channel || "").toLowerCase();
  const channel = channelRaw === "sms" || channelRaw === "email" ? channelRaw : null;

  return {
    found: Boolean(d.found),
    channel,
    contact: String(d.contact || ""),
    study_id: String(d.study_id || ""),
    study_slug: String(d.study_slug || ""),
    completed: Boolean(d.completed),
    revoked: Boolean(d.revoked),
    completed_at: d.completed_at ? String(d.completed_at) : null,
    revoked_at: d.revoked_at ? String(d.revoked_at) : null,
  };
}

/** JST */
export async function isJstTokenCompleted(token: string): Promise<boolean> {
  return rpcBool("is_jst_token_completed", token);
}

export async function markJstTokenStarted(token: string): Promise<void> {
  await rpcVoid("mark_jst_token_started", token);
}

export async function markJstTokenCompleted(token: string): Promise<void> {
  await rpcVoid("mark_jst_token_completed", token);
}

export async function markJstTokenRejected(token: string): Promise<void> {
  await rpcVoid("mark_jst_token_rejected", token);
}

export async function getJstTokenMeta(token: string): Promise<JstTokenMeta | null> {
  if (!token) return null;
  const { data, error } = await supabase.rpc("get_jst_token_meta", { p_token: token });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;

  const d = data as Record<string, unknown>;
  const channelRaw = String(d.channel || "").toLowerCase();
  const channel = channelRaw === "sms" || channelRaw === "email" ? channelRaw : null;

  return {
    found: Boolean(d.found),
    channel,
    contact: String(d.contact || ""),
    study_id: String(d.study_id || ""),
    study_slug: String(d.study_slug || ""),
    completed: Boolean(d.completed),
    rejected: Boolean(d.rejected),
    revoked: Boolean(d.revoked),
    completed_at: d.completed_at ? String(d.completed_at) : null,
    rejected_at: d.rejected_at ? String(d.rejected_at) : null,
    revoked_at: d.revoked_at ? String(d.revoked_at) : null,
  };
}
