import { supabase } from "../supabaseClient";

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
