import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { parsePermissions } from "@/lib/roles";
import { avatarApiFields } from "@/lib/avatar";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload || typeof payload.sub !== "string") redirect("/login");

  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true, nationalId: true, role: true, permissions: true,
      firstName: true, lastName: true, schoolId: true,
      mustChangePassword: true, isActive: true, shadNumber: true, tokenVersion: true,
      langCode: true,
      profileImageType: true, photoUrl: true, avatarConfig: true,
      school: { select: { id: true, name: true, code: true, shadEnabled: true, custodianEnabled: true } },
    },
  });
  if (!user || !user.isActive) redirect("/login");
  if (typeof payload.tv === "number" && user.tokenVersion !== payload.tv) redirect("/login");

  const school = ["SUPER_ADMIN", "ADMIN"].includes(user.role)
    ? await db.school.findFirst({
        where: { isActive: true }, orderBy: { createdAt: "asc" },
        select: { id: true, name: true, shadEnabled: true, custodianEnabled: true },
      })
    : user.school;
  const schoolModules = school
    ? { shadEnabled: school.shadEnabled, custodianEnabled: school.custodianEnabled }
    : null;

  return (
    <AppShell user={{
      id: user.id,
      nationalId: user.nationalId,
      role: user.role,
      permissions: parsePermissions(user.permissions),
      firstName: user.firstName,
      lastName: user.lastName,
      mustChangePassword: user.mustChangePassword,
      schoolName: school?.name ?? null,
      actingSchoolId: null,
      langCode: "fa",
      schoolModules,
      ...avatarApiFields(user),
    }}>
      {children}
    </AppShell>
  );
}
