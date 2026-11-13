"use client";
// رابط کاربری این نسخه فقط فارسی است؛ Provider برای سازگاری هوک‌های موجود حفظ شده.
import { createContext, useCallback, useContext, useMemo } from "react";
import { CATALOG } from "@/lib/langs";

export interface ActiveLang {
  code: "fa";
  name: "فارسی";
  nativeName: "فارسی";
  direction: "rtl";
  strings: Record<string, string>;
}
const FA: ActiveLang = { code: "fa", name: "فارسی", nativeName: "فارسی", direction: "rtl", strings: {} };
const LangCtx = createContext<{ lang: ActiveLang; t: (key: string) => string; ready: boolean }>({
  lang: FA, t: (key) => CATALOG[key] ?? key, ready: true,
});
export function LangProvider({ children }: { children: React.ReactNode; initialCode?: string | null }) {
  const t = useCallback((key: string) => CATALOG[key] ?? key, []);
  const value = useMemo(() => ({ lang: FA, t, ready: true }), [t]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}
export function useLang() { return useContext(LangCtx); }
export async function switchLanguage(_code: string): Promise<void> {}
