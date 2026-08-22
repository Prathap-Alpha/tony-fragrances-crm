import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/constants/supabase";
import { getWorkspace } from "./supabase-sync";

// Ask the AI assistant a question about the business. The static app never
// holds the AI key — the question goes to the `tony-ai-ask` relay (a Supabase
// Edge Function, deployed from the Nako-Tech repo) which verifies the
// workspace, reads the cloud copy of the books itself, and asks DeepSeek.
export async function askAssistant(question: string): Promise<string> {
  const workspace = await getWorkspace();
  if (!workspace) throw new Error("Sign in with your passcode first.");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/tony-ai-ask`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workspace, question }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.answer) {
    throw new Error(body?.error || "The assistant could not answer — check your internet and try again.");
  }
  return String(body.answer);
}
