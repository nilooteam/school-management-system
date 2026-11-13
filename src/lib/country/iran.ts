// ============================================================
// بهار | پروفایل ثابت ایران برای نسخه تک‌هنرستانی
// این نصب فقط از همین تنظیمات محلی استفاده می‌کند.
// منابع داده: تقسیمات کشوری ~۱۴۰۲ (۳۱ استان، ~۴۲۹ شهرستان)،
// نقشه GADM 4.1 (scripts/geo/build-iran-map.ts)، تقویم شمسی،
// کد ملی با رقم کنترل mod-11، موبایل ۰۹…، تومان، پایه ۱۰ تا ۱۲.
// ============================================================
import type { CountryProfile } from "./types";
import { IRAN_PROVINCES } from "@/lib/iran-data";

export const IRAN_PROFILE: CountryProfile = {
  code: "IR",
  name: "ایران",
  nativeName: "Iran",
  locale: "fa-IR",
  direction: "rtl",
  timezone: "Asia/Tehran",
  calendar: "persian",
  digits: "native",

  nationalId: {
    label: "کد ملی",
    algorithm: "iran-mod11",
    pattern: "^\\d{10}$",
    placeholder: "۰۰۱۲۳۴۵۶۷۹",
    example: "0012345679",
  },
  phone: {
    pattern: "^09\\d{9}$",
    placeholder: "۰۹۱۲۳۴۵۶۷۸۹",
    example: "09123456789",
  },
  currency: {
    label: "تومان",
    code: "IRR",
    minAmount: 1000,
    maxAmount: 5000000000,
  },
  week: {
    workDays: [1, 2, 3, 4, 5], // شنبه تا چهارشنبه
    labels: ["", "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"],
  },
  gradeLevels: ["دهم", "یازدهم", "دوازدهم"],
  fields: ["فنی‌وحرفه‌ای", "کاردانش"],
  schoolTypes: ["هنرستان"],
  regions: IRAN_PROVINCES.map((p) => ({ name: p.fa, center: p.center, counties: p.counties })),
  // نقشه ایران به‌صورت داخلی (built-in) در iran-map-picker از «lib/iran-map» لود می‌شود؛
  // اینجا map را خالی می‌گذاریم تا ۳۸KB داده SVG وارد باندل همه صفحات نشود.
  // بسته‌های کاستوم می‌توانند map خودشان را در JSON بسته بگذارند.

  grading: {
    maxScore: 20,
    terms: 2,
    termLabels: ["", "نیمسال اول", "نیمسال دوم"],
  },
  academicYearExample: "1404-1405",
  modules: {
    shad: true, // شبکه شاد فقط در ایران فعال است
  },
  version: "1.0.0",
  notes: "پروفایل پیش‌فرض سامانه بهار — دقیقاً مطابق رفتار اصلی (نسخه ایران).",
};

/** نام‌های بومی تقویم‌ها برای راهنما */
export const CALENDAR_LABELS: Record<string, string> = { persian: "هجری شمسی (جلالی)" };

export const ALGORITHM_LABELS: Record<string, string> = { "iran-mod11": "ایرانی — رقم کنترل باقیمانده بر ۱۱" };
