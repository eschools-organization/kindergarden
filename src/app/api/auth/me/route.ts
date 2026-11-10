import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function verifyUser(userId: string, role: string) {
  if (!userId) return null;
  const db = await getDb();
  const cleanId = userId.toString().trim();

  if (role === "admin" || role === "superadmin" || role === "resource_center") {
    const admin = await db.collection("admins").findOne({ user_ID: cleanId });
    if (admin) {
      const userRole = admin.role || (admin.user_ID === "kakhi-kakhidze" ? "superadmin" : "admin");
      return {
        user_ID: admin.user_ID,
        name: admin.name,
        surname: admin.surname,
        role: userRole,
      };
    }
  }

  if (role === "teacher" || role === "methodist") {
    const teacher = await db.collection("teachers").findOne({
      $or: [{ user_ID: cleanId }, { ID: cleanId }]
    });
    if (teacher) {
      const userRole = role === "methodist" ? "methodist" : (teacher.role || "teacher");
      return {
        user_ID: teacher.user_ID || teacher.ID || cleanId,
        ID: teacher.ID || teacher.user_ID || cleanId,
        name: teacher.name,
        surname: teacher.surname,
        role: userRole,
        phone: teacher.phone || "",
        classes: teacher.classes || [],
      };
    }
  }

  if (role === "student") {
    const student = await db.collection("students").findOne({
      $or: [{ user_ID: cleanId }, { ID: cleanId }]
    });
    if (student) {
      return {
        user_ID: student.user_ID || student.ID || cleanId,
        ID: student.ID || student.user_ID || cleanId,
        name: student.name,
        surname: student.surname,
        role: "student",
        class_id: student.class_id ? student.class_id.toString() : null,
      };
    }
  }

  // Fallback lookup if role wasn't explicitly matched
  const adminDoc = await db.collection("admins").findOne({ user_ID: cleanId });
  if (adminDoc) {
    return {
      user_ID: adminDoc.user_ID,
      name: adminDoc.name,
      surname: adminDoc.surname,
      role: adminDoc.role || "admin",
    };
  }

  const teacherDoc = await db.collection("teachers").findOne({
    $or: [{ user_ID: cleanId }, { ID: cleanId }]
  });
  if (teacherDoc) {
    return {
      user_ID: teacherDoc.user_ID || teacherDoc.ID,
      name: teacherDoc.name,
      surname: teacherDoc.surname,
      role: teacherDoc.role || "teacher",
    };
  }

  const studentDoc = await db.collection("students").findOne({
    $or: [{ user_ID: cleanId }, { ID: cleanId }]
  });
  if (studentDoc) {
    return {
      user_ID: studentDoc.user_ID || studentDoc.ID,
      name: studentDoc.name,
      surname: studentDoc.surname,
      role: "student",
      class_id: studentDoc.class_id ? studentDoc.class_id.toString() : null,
    };
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_ID = searchParams.get("user_ID") || searchParams.get("id") || "";
    const role = searchParams.get("role") || "";

    const user = await verifyUser(user_ID, role);
    if (user) {
      return NextResponse.json({ authenticated: true, user });
    }

    return NextResponse.json({ authenticated: false, message: "სესია არასწორია ან მომხმარებელი არ არსებობს" }, { status: 401 });
  } catch (error: any) {
    console.error("Auth Me error:", error);
    return NextResponse.json({ authenticated: false, message: "სერვერის შეცდომა: " + (error?.message || error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const user_ID = body.user_ID || body.ID || body.username || "";
    const role = body.role || "";

    const user = await verifyUser(user_ID, role);
    if (user) {
      return NextResponse.json({ authenticated: true, user });
    }

    return NextResponse.json({ authenticated: false, message: "სესია არასწორია ან მომხმარებელი არ არსებობს" }, { status: 401 });
  } catch (error: any) {
    console.error("Auth Me error:", error);
    return NextResponse.json({ authenticated: false, message: "სერვერის შეცდომა: " + (error?.message || error) }, { status: 500 });
  }
}
