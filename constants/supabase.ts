// Supabase storage configuration (nakotech project).
//
// Both values are PUBLIC by design and safe to commit / ship in the web bundle:
// the URL is public, and the anon key is the browser key that only ever reaches
// rows allowed by Row Level Security. Real access is gated by Tony's secret
// passcode (see supabase/tony_crm.sql). They are injected at build time via the
// EXPO_PUBLIC_* build variables. When empty the app still runs but the passcode
// screen shows a "not configured yet" note and data stays on-device only.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// The Postgres table holding the single JSON document per workspace.
export const SUPABASE_TABLE = "tony_crm";
