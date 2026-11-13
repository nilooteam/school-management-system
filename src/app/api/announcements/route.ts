import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser, apiOk, apiErr, handleApiError, readJson, audit, requireSchoolId, ApiError, isDemoUser, demoWriteBlock } from "@/lib/api";
import { hasPermission } from "@/lib/roles";

const ROLE_TO_TARGET: Record<string, string> = {
  MANAGER: "MANAGERS", DEPUTY: "TEACHERS", TEACHER: "TEACHERS",
  STUDENT: "STUDENTS", PARENT: "PARENTS",
};
function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { const value = JSON.parse(raw); return Array.isArray(value) ? value.filter((x) => typeof x === "string") : []; }
  catch { return []; }
}
function targetsUser(a: { audienceRoles: string[]; classId: string | null }, role: string, classIds: string[]): boolean {
  if (a.audienceRoles.length) {
    const target = ROLE_TO_TARGET[role];
    if (!target || !a.audienceRoles.includes(target)) return false;
  }
  return !a.classId || classIds.includes(a.classId);
}

export async function GET(req: NextRequest) {
  try {
    const me = await requireUser(req);
    const schoolId = requireSchoolId(me);
    const userClassIds: string[] = [];
    if (me.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { userId: me.id }, select: { classId: true } });
      if (student?.classId) userClassIds.push(student.classId);
    } else if (me.role === "PARENT") {
      const children = await db.studentParent.findMany({ where: { parentUserId: me.id }, select: { student: { select: { classId: true } } } });
      userClassIds.push(...children.map((x) => x.student.classId).filter((x): x is string => Boolean(x)));
    }
    const rows = await db.announcement.findMany({
      where: { schoolId },
      include: {
        class: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 120,
    });
    const visible = rows.map((row) => ({
      ...row,
      audienceRoles: parseJsonArray(row.audienceRoles),
      targetProvinces: [],
      targetCounties: [],
    })).filter((row) => targetsUser({ audienceRoles: row.audienceRoles, classId: row.classId }, me.role, userClassIds));
    return apiOk({ announcements: visible });
  } catch (error) { return handleApiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser(req);
    if (await isDemoUser(me)) return apiErr(403, "این قابلیت در حساب دمو غیرفعال است.", "DEMO_READONLY");
    const schoolId = requireSchoolId(me);
    if (!["MANAGER", "SUPER_ADMIN", "ADMIN"].includes(me.role) && !hasPermission(me, "manage_announcements")) {
      throw new ApiError(403, "FORBIDDEN", "دسترسی ارسال اطلاعیه ندارید.");
    }
    const body = await readJson<Record<string, unknown>>(req);
    const title = String(body.title ?? "").trim();
    const text = String(body.body ?? "").trim();
    if (title.length < 2 || text.length < 2) return apiErr(400, "عنوان و متن اطلاعیه الزامی است.", "BAD_INPUT");
    if (text.length > 600) return apiErr(400, "متن اطلاعیه بیش از حد بلند است؛ برای محتوای بلند از شاد استفاده کنید.", "TOO_LONG");
    const validRoles = ["MANAGERS", "TEACHERS", "STUDENTS", "PARENTS"];
    const audienceRoles = Array.isArray(body.audienceRoles)
      ? (body.audienceRoles as string[]).filter((role) => validRoles.includes(role))
      : [];
    let classId: string | null = null;
    if (body.classId) {
      classId = String(body.classId);
      const cls = await db.class.findUnique({ where: { id: classId }, select: { schoolId: true } });
      if (!cls || cls.schoolId !== schoolId) return apiErr(400, "کلاس نامعتبر است.", "BAD_CLASS");
    }
    const announcement = await db.announcement.create({
      data: {
        scope: "SCHOOL", schoolId, title, body: text,
        audienceRoles: JSON.stringify(audienceRoles),
        targetProvinces: "[]", targetCounties: "[]",
        classId, pinned: body.pinned === true, createdById: me.id,
      },
    });
    await audit({ user: me, action: "CREATE_ANNOUNCEMENT", entityType: "ANNOUNCEMENT", entityId: announcement.id, schoolId, meta: { scope: "SCHOOL", audienceRoles } });
    return apiOk({ announcement });
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(req: NextRequest) {
  try {
    const me = await requireUser(req, ["MANAGER", "DEPUTY", "SUPER_ADMIN", "ADMIN"]);
    const blocked = await demoWriteBlock(me);
    if (blocked) return blocked;
    const schoolId = requireSchoolId(me);
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!id) return apiErr(400, "شناسه لازم است.", "NO_ID");
    const row = await db.announcement.findUnique({ where: { id }, select: { schoolId: true } });
    if (!row || row.schoolId !== schoolId) return apiErr(404, "اطلاعیه یافت نشد.", "NOT_FOUND");
    await db.announcement.delete({ where: { id } });
    return apiOk({ ok: true });
  } catch (error) { return handleApiError(error); }
}
