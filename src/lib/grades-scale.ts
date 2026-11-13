// نظام نمره‌دهی و تقویم ثابت هنرستان‌های ایران
export type GradingScale = "SCORE20";
export const GRADING_SCALES = [{ value: "SCORE20", label: "از ۲۰ (نظام آموزشی ایران)" }] as const;
export const CALENDAR_SYSTEMS = [{ value: "JALALI", label: "شمسی (جلالی)" }] as const;
export function convertScore(score20: number, _scale: string): string {
  const score = Math.min(20, Math.max(0, score20));
  return String(Math.round(score * 100) / 100);
}
export function scaleIsNumeric(_scale: string): boolean { return true; }
