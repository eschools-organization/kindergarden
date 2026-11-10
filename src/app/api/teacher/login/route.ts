import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const teacherId = (body.ID || body.user_ID || body.username || "").toString().trim();
    const password = body.password;

    if (!teacherId || !password) {
      return NextResponse.json({ message: "მონაცემები არასწორია" }, { status: 401 });
    }

    const db = await getDb();
    const result = await db.collection("teachers").findOne({
      $or: [{ ID: teacherId }, { user_ID: teacherId }]
    });

    if (!result) {
      return NextResponse.json({ message: "მონაცემები არასწორია" }, { status: 401 });
    }

    const match = await bcrypt.compare(password, result.password);
    if (match) {
      const returnId = result.ID || result.user_ID || teacherId;
      return NextResponse.json({
        message: "ავტორიზაცია წარმატებით დასრულდა",
        user_ID: returnId,
        ID: returnId,
        role: result.role || "teacher",
        name: result.name,
        surname: result.surname
      });
    }

    return NextResponse.json({ message: "მონაცემები არასწორია" }, { status: 401 });
  } catch (error: any) {
    console.error("Teacher login error:", error);
    return NextResponse.json(
      { message: "სერვერის შეცდომა: " + (error?.message || "მონაცემთა ბაზასთან კავშირი ვერ დამყარდა") },
      { status: 500 }
    );
  }
}
