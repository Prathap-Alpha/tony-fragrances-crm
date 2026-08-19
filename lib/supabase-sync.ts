import { Platform } from "react-native";

import { SUPABASE_ANON_KEY, SUPABASE_TABLE, SUPABASE_URL } from "@/constants/supabase";
import { emptyCRMData, mergeData } from "./crm-domain";

// ---------------------------------------------------------------------------
// Supabase storage adapter (web only).
//
// The whole CRM dataset is ONE JSON document kept in a single Postgres row in
// the nakotech Supabase project. Two devices that type the same secret passcode
// derive the same "workspace" key (SHA-256 of the passcode) and therefore share
// the same row — so records made on the phone appear on the laptop and vice
// versa. Unlike the old Google-Drive design, a passcode never expires, so the
// app never silently signs itself out.
//
// Access control: the workspace key is sent on every request as the
// `x-workspace` header. Row Level Security only exposes the row whose key
// matches — without the passcode, the public anon key sees nothing.
//
// On native (Expo Android) these functions are no-ops so the app falls back to
// the on-device cache.
// ---------------------------------------------------------------------------

const isWeb = Platform.OS === "web";
const PASSCODE_KEY = "tony-crm-passcode";

export type Workspace = { label: string };

let workspaceKey: string | null = null; // sha256(passcode) hex, cached in memory
let saveChain: Promise<boolean> = Promise.resolve(true);

// --- passcode storage -----------------------------------------------------

function readStoredPasscode(): string | null {
  if (!isWeb) return null;
  try {
    return window.localStorage.getItem(PASSCODE_KEY) || null;
  } catch {
    return null;
  }
}

function writeStoredPasscode(passcode: string) {
  if (!isWeb) return;
  try {
    window.localStorage.setItem(PASSCODE_KEY, passcode);
  } catch {
    /* ignore */
  }
}

function clearStoredPasscode() {
  if (!isWeb) return;
  try {
    window.localStorage.removeItem(PASSCODE_KEY);
  } catch {
    /* ignore */
  }
}

// SHA-256 hex of the passcode — the unguessable per-workspace key.
async function deriveWorkspace(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(`tony-fragrances::${passcode.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function ensureWorkspace(): Promise<string | null> {
  if (workspaceKey) return workspaceKey;
  const passcode = readStoredPasscode();
  if (!passcode) return null;
  workspaceKey = await deriveWorkspace(passcode);
  return workspaceKey;
}

// A short, non-secret label for the UI ("shop code ab12") derived from the key.
function workspaceLabel(key: string): string {
  return `shop code ${key.slice(0, 4)}`;
}

// --- config / session -----------------------------------------------------

export function isConfigured(): boolean {
  return isWeb && SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

// Called on app start: if a passcode is already stored on this device, use it
// silently — no prompt, no expiry.
export async function restoreSession(): Promise<Workspace | null> {
  if (!isConfigured()) return null;
  const key = await ensureWorkspace();
  if (!key) return null;
  return { label: workspaceLabel(key) };
}

// Sign in = remember the passcode for this device.
export async function signIn(passcode: string): Promise<Workspace> {
  if (!isConfigured()) throw new Error("Cloud sync is not set up yet.");
  const trimmed = passcode.trim();
  if (trimmed.length < 4) throw new Error("Enter a passcode of at least 4 characters.");
  writeStoredPasscode(trimmed);
  workspaceKey = await deriveWorkspace(trimmed);
  return { label: workspaceLabel(workspaceKey) };
}

export function signOut() {
  clearStoredPasscode();
  workspaceKey = null;
}

// Forget the workspace key (on sign-out) so a different passcode read next
// doesn't reuse the previous one.
export function resetState() {
  workspaceKey = null;
}

// --- REST read / write ----------------------------------------------------

function headers(key: string): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "x-workspace": key,
    "Content-Type": "application/json",
  };
}

// Load the CRM JSON for this workspace. Returns null if the row doesn't exist.
export async function loadRemote(): Promise<any | null> {
  if (!isConfigured()) return null;
  const key = await ensureWorkspace();
  if (!key) return null;
  const url =
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}` +
    `?workspace=eq.${encodeURIComponent(key)}&select=data`;
  const res = await fetch(url, { headers: headers(key) });
  if (!res.ok) throw new Error(`Cloud read failed (${res.status}).`);
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  return row?.data ?? null;
}

// Save the CRM JSON for this workspace. Writes are queued so two rapid changes
// can't race and lose each other, and each write re-reads + merges the latest
// remote first so a record added on the other device is never overwritten.
export function saveRemote(data: any): Promise<boolean> {
  const run = () => doSave(data);
  saveChain = saveChain.then(run, run);
  return saveChain;
}

async function doSave(data: any): Promise<boolean> {
  if (!isConfigured()) return false;
  const key = await ensureWorkspace();
  if (!key) return false;

  let toSave = data;

  // Merge with whatever is currently in the cloud so we never clobber records
  // another device added since this device last loaded.
  try {
    const remote = await loadRemote();
    if (remote) {
      const remoteData = { ...emptyCRMData, ...remote };
      const local = { ...emptyCRMData, ...data };
      toSave = mergeData(local, remoteData);
    }
  } catch (error) {
    // Save local as-is rather than aborting — the merge design is self-healing:
    // the other device still holds its records and restores them on its next
    // load/save cycle.
    console.warn("Pre-save cloud read failed; saving local copy without merge.", error);
  }

  const url =
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}` +
    `?on_conflict=workspace`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...headers(key),
      // Upsert: insert, or update the existing row for this workspace.
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ workspace: key, data: toSave, updated_at: new Date().toISOString() }),
  });
  return res.ok;
}
