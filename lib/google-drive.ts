import { Platform } from "react-native";

import { DRIVE_FILE_NAME, GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from "@/constants/google";

// ---------------------------------------------------------------------------
// Google Drive storage adapter (web only).
//
// Each user signs in with their own Google account. The whole CRM dataset is
// kept as ONE JSON file in that user's own Google Drive. Nothing is stored on
// any server we run. On native (Expo Android) these functions are no-ops so the
// app falls back to the on-device cache.
// ---------------------------------------------------------------------------

const isWeb = Platform.OS === "web";
const TOKEN_KEY = "tony-crm-google-token";

type StoredToken = { accessToken: string; expiresAt: number; email: string };

export type GoogleUser = { email: string };

let tokenClient: any = null;
let scriptPromise: Promise<void> | null = null;

// --- Google Identity Services script loader ------------------------------

function loadGisScript(): Promise<void> {
  if (!isWeb) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// --- token storage --------------------------------------------------------

function readStoredToken(): StoredToken | null {
  if (!isWeb) return null;
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredToken;
    // Treat a token expiring within 60s as already expired.
    if (!parsed.accessToken || parsed.expiresAt < Date.now() + 60_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredToken(token: StoredToken) {
  if (!isWeb) return;
  try {
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  } catch {
    /* ignore */
  }
}

function clearStoredToken() {
  if (!isWeb) return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// --- sign in / out --------------------------------------------------------

export function isConfigured(): boolean {
  return isWeb && GOOGLE_CLIENT_ID.length > 0;
}

async function fetchEmail(accessToken: string): Promise<string> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return "";
    const body = await res.json();
    return typeof body?.email === "string" ? body.email : "";
  } catch {
    return "";
  }
}

async function ensureTokenClient() {
  await loadGisScript();
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) throw new Error("Google sign-in is unavailable.");
  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: () => {}, // replaced per-request below
    });
  }
  return tokenClient;
}

// Request an access token. `interactive: false` tries to renew silently for an
// already-consented user (no popup); `true` shows the Google account chooser.
function requestToken(interactive: boolean): Promise<StoredToken> {
  return new Promise<StoredToken>(async (resolve, reject) => {
    try {
      const client = await ensureTokenClient();
      client.callback = async (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        const accessToken: string = response.access_token;
        const expiresIn: number = Number(response.expires_in ?? 3600);
        const email = await fetchEmail(accessToken);
        const token: StoredToken = {
          accessToken,
          expiresAt: Date.now() + expiresIn * 1000,
          email,
        };
        writeStoredToken(token);
        resolve(token);
      };
      client.requestAccessToken({ prompt: interactive ? "consent" : "" });
    } catch (error) {
      reject(error as Error);
    }
  });
}

// Called on app start: if we already have a valid token, use it silently.
export async function restoreSession(): Promise<GoogleUser | null> {
  if (!isConfigured()) return null;
  const stored = readStoredToken();
  if (stored) return { email: stored.email };
  return null;
}

export async function signIn(): Promise<GoogleUser> {
  if (!isConfigured()) throw new Error("Google sign-in is not set up yet.");
  const token = await requestToken(true);
  return { email: token.email };
}

export function signOut() {
  clearStoredToken();
}

// Return a usable access token, renewing silently if the cached one lapsed.
async function getAccessToken(): Promise<string> {
  const stored = readStoredToken();
  if (stored) return stored.accessToken;
  const renewed = await requestToken(false);
  return renewed.accessToken;
}

// --- Drive read / write ---------------------------------------------------

async function findFileId(accessToken: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Drive lookup failed (${res.status}).`);
  const body = await res.json();
  const file = body?.files?.[0];
  return file?.id ?? null;
}

// Load the CRM JSON from the user's Drive. Returns null if no file exists yet.
export async function loadFromDrive(): Promise<any | null> {
  if (!isConfigured()) return null;
  const accessToken = await getAccessToken();
  const fileId = await findFileId(accessToken);
  if (!fileId) return null;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Could not open your Drive file (${res.status}).`);
  const text = await res.text();
  if (!text.trim()) return null;
  return JSON.parse(text);
}

// Save the CRM JSON to the user's Drive (creates the file the first time).
export async function saveToDrive(data: any): Promise<boolean> {
  if (!isConfigured()) return false;
  const accessToken = await getAccessToken();
  const fileId = await findFileId(accessToken);
  const content = JSON.stringify(data);

  if (fileId) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: content,
      },
    );
    return res.ok;
  }

  // Create a new visible file at the root of the user's Drive.
  const boundary = "tonycrm" + Math.random().toString(36).slice(2);
  const metadata = { name: DRIVE_FILE_NAME, mimeType: "application/json" };
  const body =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    "Content-Type: application/json\r\n\r\n" +
    content +
    `\r\n--${boundary}--`;
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  return res.ok;
}
