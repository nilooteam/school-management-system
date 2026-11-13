// نسخه تک‌زبانه هنرستان بهار: تنها زبان فعال فارسی است.
import { SITE_CATALOG, LONG_CATALOG } from "../langs";
export const SITE_LANGS = [{ code: "fa", nativeName: "فارسی", direction: "rtl" as const }];
export function siteStringsFor(_code: string) {
  return { code: "fa", direction: "rtl" as const, siteStrings: SITE_CATALOG };
}
export function longStringsFor(_code: string) {
  return { code: "fa", direction: "rtl" as const, longStrings: LONG_CATALOG };
}
