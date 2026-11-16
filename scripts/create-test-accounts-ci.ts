// ساخت حساب‌های تست ۷ نقش سامانه بهار — فقط مواردِ موجود را نمی‌سازد (Idempotent)
// اجرا فقط از طریق ورک‌فلوی create-test-accounts.yml (workflow_dispatch) با هش‌های
// اسکریپتِ رمز که از بیرون داده می‌شوند. رمزِ متنِ ساده هیچ‌جا در CI چاپ یا ذخیره نمی‌شود.
// - حسابِ موجود (بر اساس کد ملی) بدون هیچ تغییری رد می‌شود.
// - حسابِ ناموجود ساخته می‌شود: ADMIN و TEACHER و STUDENT (در صورت نبودن).
// - دانش‌آموز به یک کلاس آزمایشی وصل می‌شود و ولیِ او (محمود رضایی) به همان دانش‌آموز.
// - نقش CUSTODIAN هرگز ساخته نمی‌شود.
// برای اجرا: bun scripts/create-test-accounts-ci.ts با متغیرهای ADMIN_HASH / TEACHER_HASH / STUDENT_HASH
import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DB = "bahar-db";
const SCHOOL_CODE = "BH-1001";
const ACADEMIC_YEAR = "1404-1405";

const TARGETS = [
  { nationalId: "1000000011", role: "SUPER_ADMIN", name: "سارا محمدی" },
  { nationalId: "1000000028", role: "ADMIN", name: "رضا کریمی" },
  { nationalId: "2000000010", role: "MANAGER", name: "مریم احمدی" },
  { nationalId: "2000000029", role: "DEPUTY", name: "علی رضایی" },
  { nationalId: "3000000011", role: "TEACHER", name: "نرگس حسینی" },
  { nationalId: "5000000013", role: "STUDENT", name: "امیرحسین رضایی" },
  { nationalId: "6000000014", role: "PARENT", name: "محمود رضایی" },
] as const;

const NEW_ACCOUNTS = {
  ADMIN: {
    id: "cm-test-admin-1000000028",
    nationalId: "1000000028",
    firstName: "رضا",
    lastName: "کریمی",
    gender: "MALE",
    birthDate: "1990-06-01 00:00:00",
    shadNumber: "09120000002",
    education: "کارشناسی نرم‌افزار",
    fieldOfStudy: null as string | null,
    permissions: "[]",
    schoolId: null as string | null,
    address: null as string | null,
  },
  TEACHER: {
    id: "cm-test-teacher-3000000011",
    nationalId: "3000000011",
    firstName: "نرگس",
    lastName: "حسینی",
    gender: "FEMALE",
    birthDate: "1990-06-01 00:00:00",
    shadNumber: "09120000101",
    education: "کارشناسی",
    fieldOfStudy: "ریاضی",
    permissions: '["take_attendance","enter_grades","manage_assignments"]',
    schoolId: "__SCHOOL__",
    address: null as string | null,
  },
  STUDENT: {
    id: "cm-test-student-5000000013",
    nationalId: "5000000013",
    firstName: "امیرحسین",
    lastName: "رضایی",
    gender: "MALE",
    birthDate: "2009-06-01 00:00:00",
    shadNumber: "09130000001",
    education: null as string | null,
    fieldOfStudy: null as string | null,
    permissions: "[]",
    schoolId: "__SCHOOL__",
    address: "تهران، منطقه ۵",
  },
} as const;

const CLASS_DEF = {
  id: "cm-test-class-10-1",
  name: "دهم فنی‌وحرفه‌ای ۱",
  grade: "دهم",
  field: "فنی‌وحرفه‌ای",
  roomNumber: "۱۰۱",
  capacity: 28,
};
const STUDENT_REC = { id: "cm-test-studentrec-5000000013", studentNumber: "1201", entryYear: "1404" };
const PARENT_LINK = { id: "cm-test-sp-5000000013-6000000014", relation: "FATHER" };

function sqlStr(v: string | null | undefined): string {
  if (v === null || v === undefined) return "NULL";
  return `'${String(v).replaceAll("'", "''")}'`;
}
function num(v: number): string {
  return String(v);
}

function d1json(sql: string): any[] {
  const out = execFileSync(
    "bunx",
    ["wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  const parsed = JSON.parse(out);
  const rows = parsed?.[0]?.results;
  if (!Array.isArray(rows)) throw new Error(`Unexpected wrangler JSON output for: ${sql}\n${out.slice(0, 500)}`);
  return rows;
}

function d1file(sqlPath: string): void {
  execFileSync("bunx", ["wrangler", "d1", "execute", DB, "--remote", "--file", sqlPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function userInsertSQL(a: (typeof NEW_ACCOUNTS)[keyof typeof NEW_ACCOUNTS], hash: string, schoolId: string): string {
  const sid = a.schoolId === "__SCHOOL__" ? schoolId : a.schoolId;
  return (
    `INSERT INTO [User] (id, nationalId, passwordHash, tempPassword, mustChangePassword, role, permissions, firstName, lastName, gender, birthDate, shadNumber, education, fieldOfStudy, address, isActive, failedAttempts, tokenVersion, twoFactorEnabled, schoolId, createdAt, updatedAt) ` +
    `VALUES (${sqlStr(a.id)}, ${sqlStr(a.nationalId)}, ${sqlStr(hash)}, NULL, 0, ${sqlStr(a.nationalId === "1000000028" ? "ADMIN" : a.nationalId === "3000000011" ? "TEACHER" : "STUDENT")}, ${sqlStr(a.permissions)}, ${sqlStr(a.firstName)}, ${sqlStr(a.lastName)}, ${sqlStr(a.gender)}, ${sqlStr(a.birthDate)}, ${sqlStr(a.shadNumber)}, ${sqlStr(a.education)}, ${sqlStr(a.fieldOfStudy)}, ${sqlStr(a.address)}, 1, 0, 0, 0, ${sqlStr(sid)}, datetime('now'), datetime('now'));`
  );
}

async function main() {
  const hashes: Record<string, string> = {
    ADMIN: process.env.ADMIN_HASH ?? "",
    TEACHER: process.env.TEACHER_HASH ?? "",
    STUDENT: process.env.STUDENT_HASH ?? "",
  };
  for (const [k, v] of Object.entries(hashes)) {
    if (!v || !/^[0-9a-f]{32}:[0-9a-f]{128}$/.test(v)) {
      throw new Error(`Missing or malformed ${k}_HASH env (expected salt:hash scrypt format)`);
    }
  }

  console.log("== Inspecting current state ==");
  const users = await d1json(
    `SELECT id, nationalId, role, firstName, lastName, isActive, mustChangePassword, schoolId FROM [User] WHERE nationalId IN (${TARGETS.map((t) => `'${t.nationalId}'`).join(",")}) ORDER BY nationalId;`
  );
  const byNational = new Map(users.map((u: any) => [u.nationalId, u]));
  for (const t of TARGETS) {
    const u = byNational.get(t.nationalId) as any;
    console.log(`  ${u ? "[EXISTS] " : "[MISSING] "} ${t.role.padEnd(11)} ${t.nationalId} ${t.name}${u ? ` (active=${u.isActive}, mustChange=${u.mustChangePassword}, schoolId=${u.schoolId ?? "-"})` : ""}`);
  }

  const schools = await d1json(`SELECT id, name, code, isActive, managerId FROM [School] WHERE code = '${SCHOOL_CODE}';`);
  if (schools.length === 0) throw new Error(`School with code ${SCHOOL_CODE} not found — aborting, nothing was changed.`);
  const school = schools[0];
  console.log(`  School: ${school.name} (${school.code}) id=${school.id} active=${school.isActive}`);

  const classes = await d1json(`SELECT id, schoolId, name, grade, academicYear, homeroomTeacherId, isActive FROM [Class] WHERE schoolId = '${school.id}';`);
  const students = await d1json(`SELECT id, userId, classId, schoolId, studentNumber FROM [Student];`);
  const parentLinks = await d1json(`SELECT studentId, parentUserId, relation, isPrimary FROM [StudentParent];`);
  console.log(`  Classes in school: ${classes.length} | Student rows: ${students.length} | Parent links: ${parentLinks.length}`);

  const statements: string[] = [];
  const report: string[] = [];

  // ── ADMIN / TEACHER / STUDENT users ──
  for (const role of ["ADMIN", "TEACHER", "STUDENT"] as const) {
    const def = NEW_ACCOUNTS[role];
    if (byNational.has(def.nationalId)) {
      report.push(`[SKIP] ${role} ${def.nationalId} already exists — no changes`);
      continue;
    }
    statements.push(userInsertSQL(def, hashes[role], school.id));
    report.push(`[CREATE] ${role} ${def.nationalId} ${def.firstName} ${def.lastName} (id=${def.id})`);
  }

  // ── Teacher id (new or existing) for the class homeroom ──
  const teacherUser = byNational.get("3000000011") as any;
  const teacherId = teacherUser?.id ?? NEW_ACCOUNTS.TEACHER.id;

  // ── Class for the student ──
  let classId: string | null = null;
  const exactClass = classes.find((c: any) => c.name === CLASS_DEF.name && c.academicYear === ACADEMIC_YEAR);
  const anyClass = classes.find((c: any) => c.isActive === 1 || c.isActive === true);
  if (exactClass) {
    classId = exactClass.id;
    report.push(`[SKIP] Class "${CLASS_DEF.name}" already exists (id=${classId}) — no changes`);
  } else if (anyClass) {
    classId = anyClass.id;
    report.push(`[USE] Existing class "${anyClass.name}" (id=${classId}) for the student — no new class created`);
  } else {
    statements.push(
      `INSERT INTO [Class] (id, schoolId, name, grade, field, academicYear, capacity, roomNumber, homeroomTeacherId, isActive, createdAt, updatedAt) ` +
        `VALUES (${sqlStr(CLASS_DEF.id)}, ${sqlStr(school.id)}, ${sqlStr(CLASS_DEF.name)}, ${sqlStr(CLASS_DEF.grade)}, ${sqlStr(CLASS_DEF.field)}, ${sqlStr(ACADEMIC_YEAR)}, ${num(CLASS_DEF.capacity)}, ${sqlStr(CLASS_DEF.roomNumber)}, ${sqlStr(teacherId)}, 1, datetime('now'), datetime('now'));`
    );
    classId = CLASS_DEF.id;
    report.push(`[CREATE] Class "${CLASS_DEF.name}" (id=${classId}, homeroomTeacherId=${teacherId})`);
  }

  // ── Student row + parent link ──
  const studentUser = byNational.get("5000000013") as any;
  const studentUserId = studentUser?.id ?? NEW_ACCOUNTS.STUDENT.id;
  const existingStudent = students.find((s: any) => s.userId === studentUserId);
  let studentRecId: string;
  if (existingStudent) {
    studentRecId = existingStudent.id;
    report.push(`[SKIP] Student row for 5000000013 already exists (id=${studentRecId}) — no changes`);
  } else {
    statements.push(
      `INSERT INTO [Student] (id, userId, classId, schoolId, studentNumber, entryYear, status, tags, customFields, createdAt, updatedAt) ` +
        `VALUES (${sqlStr(STUDENT_REC.id)}, ${sqlStr(studentUserId)}, ${sqlStr(classId)}, ${sqlStr(school.id)}, ${sqlStr(STUDENT_REC.studentNumber)}, ${sqlStr(STUDENT_REC.entryYear)}, 'ACTIVE', '[]', '{}', datetime('now'), datetime('now'));`
    );
    studentRecId = STUDENT_REC.id;
    report.push(`[CREATE] Student row (id=${studentRecId}, classId=${classId}, studentNumber=${STUDENT_REC.studentNumber})`);
  }

  const parentUser = byNational.get("6000000014") as any;
  if (!parentUser) throw new Error("Parent user 6000000014 (Mahmoud Rezaei) not found — cannot link the student. Aborting, nothing was changed.");
  const linkExists = parentLinks.some((p: any) => p.studentId === studentRecId && p.parentUserId === parentUser.id);
  if (linkExists) {
    report.push(`[SKIP] Parent link student→6000000014 already exists — no changes`);
  } else {
    statements.push(
      `INSERT INTO [StudentParent] (id, studentId, parentUserId, relation, isPrimary, createdAt) ` +
        `VALUES (${sqlStr(PARENT_LINK.id)}, ${sqlStr(studentRecId)}, ${sqlStr(parentUser.id)}, ${sqlStr(PARENT_LINK.relation)}, 1, datetime('now'));`
    );
    report.push(`[CREATE] Parent link student(${studentRecId}) → parent 6000000014 (${PARENT_LINK.relation}, primary)`);
  }

  console.log("== Plan ==");
  for (const line of report) console.log(`  ${line}`);

  if (statements.length === 0) {
    console.log("== Nothing to create: all 7 accounts and relations already exist. ==");
    return;
  }

  const sqlPath = join(tmpdir(), "create-test-accounts.sql");
  writeFileSync(sqlPath, statements.join("\n") + "\n", "utf8");
  console.log(`== Executing ${statements.length} statement(s) via wrangler d1 execute --file ==`);
  d1file(sqlPath);
  unlinkSync(sqlPath);
  console.log("== Done: statements executed. Verify step follows in the workflow. ==");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
