import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = (body.ID || body.user_ID || body.username || "").toString().trim();
    const password = body.password;

    if (!userId || !password) {
      return NextResponse.json({ message: "მონაცემები არასწორია" }, { status: 401 });
    }

    const db = await getDb();
    let result = await db.collection("teachers").findOne({
      $or: [{ ID: userId }, { user_ID: userId }]
    });

    // Auto-seed default test methodist if credentials match methodist1 or methodist
    if (!result && (userId === "methodist1" || userId === "methodist")) {
      const hashedPassword = await bcrypt.hash("methodist1", 10);
      const testMethodist = {
        name: "მარიამ",
        surname: "მეთოდისტი",
        ID: "methodist1",
        user_ID: "methodist1",
        role: "methodist",
        phone: "599000000",
        classes: [],
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      };
      await db.collection("teachers").insertOne(testMethodist);
      result = await db.collection("teachers").findOne({ user_ID: "methodist1" });
    }

    if (!result) {
      return NextResponse.json({ message: "მონაცემები არასწორია" }, { status: 401 });
    }

    const match = await bcrypt.compare(password, result.password);
    if (match) {
      if (result.role !== "methodist") {
        await db.collection("teachers").updateOne(
          { _id: result._id },
          { $set: { role: "methodist" } }
        );
      }
      const returnId = result.ID || result.user_ID || userId;
      return NextResponse.json({
        message: "ავტორიზაცია წარმატებით დასრულდა",
        user_ID: returnId,
        ID: returnId,
        role: "methodist",
        name: result.name,
        surname: result.surname
      });
    }

    return NextResponse.json({ message: "მონაცემები არასწორია" }, { status: 401 });
  } catch (error: any) {
    console.error("Methodist login error:", error);
    return NextResponse.json(
      { message: "სერვერის შეცდომა: " + (error?.message || "მონაცემთა ბაზასთან კავშირი ვერ დამყარდა") },
      { status: 500 }
    );
  }
}
