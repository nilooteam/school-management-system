// تعریف ثابت پروفایل محلی سامانه هنرستان بهار
export const CALENDARS = ["persian"] as const;
export type CalendarKind = "persian" | "gregory" | "islamic-umalqura" | "islamic-civil" | "islamic-tbla" | "hebrew" | "ethiopic" | "coptic" | "indian" | "buddhist" | "chinese" | "dangi" | "japanese";
export type NationalIdAlgorithm = "iran-mod11" | "luhn" | "none" | "digits";

export type CountryProfile = {
  code: "IR";
  name: string;
  nativeName: string;
  locale: string;
  direction: "rtl" | "ltr";
  timezone: string;
  calendar: CalendarKind;
  digits: "native" | "latin";
  nationalId: { label: string; algorithm: NationalIdAlgorithm; pattern: string; placeholder: string; example: string; invalidMessage?: string };
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
