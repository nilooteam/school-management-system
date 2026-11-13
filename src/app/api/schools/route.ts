import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, apiOk, apiErr, handleApiError } from "@/lib/api";

/** این نصب فقط یک هنرستان دارد؛ API صرفاً همان مدرسه را برمی‌گرداند. */
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser(req);
    const school = me.schoolId
      ? await db.school.findUnique({ where: { id: me.schoolId }, include: { site: true } })
      : await db.school.findFirst({ orderBy: { createdAt: "asc" }, include: { site: true } });
    return apiOk({ schools: school ? [school] : [] });
  } catch (error) {
    return handleApiError(error);
  }
}

/** ایجاد مدرسه دوم در نسخه اختصاصی هنرستان پشتیبانی نمی‌شود. */
export async function POST() {
  return apiErr(409, "این سامانه فقط برای یک هنرستان پیکربندی شده است؛ ایجاد مدرسه دیگر غیرفعال است.", "SINGLE_SCHOOL_ONLY");
}
