import { supabase } from "../supabaseClient";

/** true → token już zakończony (nie wpuszczamy do ankiety) */
export async function isTokenCompleted(token: string): Promise<boolean> {
  if (!token) return false;
  const { data, error } = await supabase.rpc("is_token_completed", { p_token: token });
  if (error) throw error;
  return Boolean(data);
}

/** idempotentnie oznacz start (nic się nie stanie, jeśli już było) */
export async function markTokenStarted(token: string): Promise<void> {
  if (!token) return;
  await supabase.rpc("mark_token_started", { p_token: token });
}

/** idempotentnie oznacz koniec (blokada ponownych wejść) */
export async function markTokenCompleted(token: string): Promise<void> {
  if (!token) return;
  await supabase.rpc("mark_token_completed", { p_token: token });
}
