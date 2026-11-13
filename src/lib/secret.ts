import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getCloudflareContext } from "@opennextjs-cloudflare";

// ============================================================
// Bahar | Single source of truth for the application signing secret.
//
// Resolution order:
//   1. SESSION_SECRET environment variable — the only supported
//      source in production and on serverless platforms (set it as
//      a platform secret; sessions are HMAC tokens keyed by it).
//   2. db/session-secret.txt — persistent fallback for self-hosted
//      installs (the file is git-ignored and must never be committed).
//   3. A freshly generated random secret for this process, persisted
//      to the file above when the filesystem is writable.
//
// There is intentionally NO hardcoded fallback constant: a guessable
// secret here would silently make session cookies, captcha tokens,
// OTP pending tokens and second-factor tokens forgeable.
// ============================================================

let cached: string | null = null;

export function getSessionSecret(): string {
  try {
    const cfSecret = (getCloudflareContext().env as { SESSION_SECRET?: unknown }).SESSION_SECRET;
    if (typeof cfSecret === "string" && cfSecret.trim().length >= 32) return cfSecret.trim();
  } catch { /* not inside a Workers request context — fall through to the existing sources */ }
  if (cached) return cached;

  const fromEnv = (process.env.SESSION_SECRET ?? "").trim();
  if (fromEnv.length >= 32) {
    cached = fromEnv;
    return cached;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be configured as a production secret (at least 32 characters).");
  }

  const candidates = [
    path.join(process.cwd(), "db", "session-secret.txt"),
    path.join(process.cwd(), "..", "db", "session-secret.txt"),
    path.join(process.cwd(), "next-service-dist", "db", "session-secret.txt"),
  ];
  for (const p of candidates) {
    try {
      const v = fs.readFileSync(p, "utf8").trim();
      if (v.length >= 32) {
        console.warn(`[Bahar] SESSION_SECRET recovered from persistent fallback file (${p}).`);
        cached = v;
        return cached;
      }
    } catch { /* probe next candidate */ }
  }

  const generated = crypto.randomBytes(32).toString("hex");
  try {
    const dir = path.join(process.cwd(), "db");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "session-secret.txt"), generated + "\n", { mode: 0o600 });
    console.warn("[Bahar] SESSION_SECRET generated and stored in db/session-secret.txt.");
  } catch {
    console.warn(
      "[Bahar] WARNING: SESSION_SECRET not found in env or fallback file; " +
      "using an ephemeral per-process secret (sessions will not survive restarts). " +
      "Set the SESSION_SECRET environment variable in production."
    );
  }
  cached = generated;
  return cached;
}
