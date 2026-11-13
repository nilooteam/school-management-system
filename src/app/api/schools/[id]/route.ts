import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, apiOk, apiErr, handleApiError, readJson, audit, isDemoUser } from "@/lib/api";
import { isValidProvinceCounty } from "@/lib/iran";
import { enDigits } from "@/lib/persian";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/schools/[id] — ویرایش مشخصات همان هنرستان توسط مدیر هنرستان یا مدیر سامانه */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const me = await requireUser(req);
    if (await isDemoUser(me)) return apiErr(403, "این قابلیت در حساب دمو غیرفعال است.", "DEMO_READONLY");
    const { id } = await ctx.params;
    if (me.schoolId && me.schoolId !== id) return apiErr(404, "مدرسه یافت نشد.", "NOT_FOUND");
    const body = await readJson<Record<string, string | boolean | undefined>>(req);
    const school = await db.school.findUnique({ where: { id } });
    if (!school) return apiErr(404, "مدرسه یافت نشد.", "NOT_FOUND");

    const isSuper = me.role === "SUPER_ADMIN";
    const isOwnManager = me.role === "MANAGER" && me.schoolId === id;

    if (!isSuper && !isOwnManager) {
      return apiErr(403, "ویرایش این مدرسه برای شما مجاز نیست.", "FORBIDDEN");
    }

    const data: Record<string, unknown> = {};
    const canFull = isSuper;

    if (canFull) {
      if (body.name !== undefined) data.name = String(body.name).trim();
      if (body.code !== undefined) data.code = String(body.code).trim();
      // نوع مدرسه در این نسخه ثابت است: هنرستان.
      if (body.type !== undefined) data.type = "هنرستان";
      if (body.phone !== undefined) data.phone = enDigits(String(body.phone)).trim() || null;
      if (body.establishedYear !== undefined) {
        data.establishedYear = body.establishedYear ? Number(enDigits(String(body.establishedYear))) : null;
      }
      if (body.province !== undefined || body.county !== undefined) {
        const province = (body.province !== undefined ? String(body.province) : school.province) ?? "";
        const county = (body.county !== undefined ? String(body.county) : school.county) ?? "";
        if (!isValidProvinceCounty(province, county || undefined)) {
          return apiErr(400, "استان یا شهرستان معتبر ایران را انتخاب کنید.", "BAD_COUNTY");
        }
        if (body.province !== undefined) data.province = province || null;
        if (body.county !== undefined) data.county = county || null;
      }
    }

    // مدیر مدرسه هم می‌تواند این‌ها را ویرایش کند
    if (body.address !== undefined) data.address = String(body.address) || null;
    if (body.city !== undefined) data.city = String(body.city) || null;
    if (body.motto !== undefined) data.motto = String(body.motto) || null;
    if (body.about !== undefined) data.about = String(body.about) || null;
    if (body.logoUrl !== undefined) data.logoUrl = String(body.logoUrl) || null;

    // راند ۱۸: ماژول‌های اختیاری مدرسه — شاد + نقش سرایدار (مدیر مدرسه/ادمین سرویس)
    if (body.shadEnabled !== undefined) data.shadEnabled = Boolean(body.shadEnabled);
    if (body.custodianEnabled !== undefined) data.custodianEnabled = Boolean(body.custodianEnabled);

    if (Object.keys(data).length === 0) return apiOk({ ok: true });

    await db.school.update({ where: { id }, data });
    await audit({
      user: me, action: "UPDATE_SCHOOL", entityType: "SCHOOL", entityId: id, schoolId: id,
      meta: { fields: Object.keys(data) },
    });
    return apiOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}

/** DELETE /api/schools/[id]?mode=soft|hard — غیرفعال‌سازی یا حذف کامل مدرسه */
/** حذف یا غیرفعال‌سازی هنرستان اصلی در نصب تک‌مدرسه‌ای مجاز نیست. */
export async function DELETE() {
  return apiErr(403, "حذف یا غیرفعال‌سازی هنرستان اصلی مجاز نیست.", "PRIMARY_SCHOOL_PROTECTED");
}
