// Google Drive storage configuration.
//
// The client ID is PUBLIC by design (it is safe to commit and ship in the web
// bundle). It is created once in the Google Cloud console and pasted here via
// the EXPO_PUBLIC_GOOGLE_CLIENT_ID build variable. When it is empty the app
// still runs but the sign-in screen shows a "not configured yet" note.
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

// drive.file = the app can only see files IT created in the owner's Drive.
// openid/email/profile = so we can show which Google account holds the data.
export const GOOGLE_SCOPES =
  "https://www.googleapis.com/auth/drive.file openid email profile";

// The single JSON document that holds the whole CRM dataset, stored as a normal
// (visible) file in the signed-in user's own Google Drive.
export const DRIVE_FILE_NAME = "Tony Fragrances CRM Data.json";
