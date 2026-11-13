import { cookies } from "next/headers";
import { Landing } from "@/components/landing/landing";
import { verifyToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { siteStringsFor, longStringsFor } from "@/lib/langs/shipped";

export default async function Home() {
  let isLoggedIn = false;
  try {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    if (token && verifyToken(token)) isLoggedIn = true;
  } catch {}
  let androidUrl: string | null = null;
  let windowsUrl: string | null = null;
  try {
    const settings = await getSettings();
    androidUrl = settings.androidAppUrl || null;
    windowsUrl = settings.windowsAppUrl || null;
  } catch {}
  const site = siteStringsFor("fa");
  return <Landing isLoggedIn={isLoggedIn} androidUrl={androidUrl} windowsUrl={windowsUrl} shadEnabled siteStrings={site.siteStrings} longStrings={longStringsFor("fa").longStrings} />;
}
