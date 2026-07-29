import { google } from "googleapis";
import crypto from "crypto";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getGoogleAuthUrl(state: string) {
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state,
  });
}

export async function getGoogleUserInfo(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: "v2",
  });

  const { data } = await oauth2.userinfo.get();

  // Validate required fields - throw descriptive error if missing
  if (!data.id) {
    throw new Error("Google OAuth: Failed to retrieve user ID from Google");
  }
  if (!data.email) {
    throw new Error("Google OAuth: Failed to retrieve user email from Google");
  }

  // Safely extract name, fallback to email prefix if name is missing
  const userName = data.name || data.email.split("@")[0];

  return {
    providerId: data.id,
    email: data.email,
    name: userName,
    picture: data.picture,
  };
}
