// تعریف ثابت پروفایل محلی سامانه هنرستان بهار
export const CALENDARS = ["persian"] as const;
export type CalendarKind = (typeof CALENDARS)[number];
export type NationalIdAlgorithm = "iran-mod11";

export type CountryProfile = {
  code: "IR";
  name: string;
  nativeName: string;
  locale: "fa-IR";
  direction: "rtl";
  timezone: "Asia/Tehran";
  calendar: "persian";
  digits: "native" | "latin";
  nationalId: { label: string; algorithm: "iran-mod11"; pattern: string; placeholder: string; example: string; invalidMessage?: string };
  phone: { pattern: string; placeholder: string; example: string };
  currency: { label: string; code: "IRR"; minAmount: number; maxAmount: number };
  week: { workDays: number[]; labels: string[] };
  gradeLevels: string[];
  fields: string[];
  schoolTypes: string[];
  regions: { name: string; center: string; counties: string[] }[];
  divisions?: { province: string; cities: { name: string; villages: string[] }[] }[];
  map?: { viewBox: { w: number; h: number }; provinces: { name: string; d: string; cx: number; cy: number }[] };
  grading: { maxScore: number; terms: number; termLabels: string[] };
  academicYearExample: string;
  modules: { shad: boolean };
  notes?: string;
  version?: string;
};
