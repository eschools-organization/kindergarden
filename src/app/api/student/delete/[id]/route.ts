import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ message: "არასწორი ID" }, { status: 400 });
    }

    const decodedId = decodeURIComponent(id).trim();
    const db = await getDb();
    const collection = db.collection("students");

    // 1. Try ObjectId
    if (ObjectId.isValid(decodedId)) {
      const result = await collection.deleteOne({ _id: new ObjectId(decodedId) });
      if (result.deletedCount > 0) {
        await Promise.allSettled([
          db.collection("daily_routine_logs").deleteMany({ student_id: decodedId }),
          db.collection("grades").deleteMany({ student_id: decodedId }),
          db.collection("grades").deleteMany({ student_id: new ObjectId(decodedId) as any }),
        ]);
        return NextResponse.json({ message: "აღსაზრდელი წარმატებით წაიშალა" });
      }
    }

    // 2. Try string _id
    let result = await collection.deleteOne({ _id: decodedId as any });
    if (result.deletedCount > 0) {
      await Promise.allSettled([
        db.collection("daily_routine_logs").deleteMany({ student_id: decodedId }),
        db.collection("grades").deleteMany({ student_id: decodedId }),
      ]);
      return NextResponse.json({ message: "აღსაზრდელი წარმატებით წაიშალა" });
    }

    // 3. Try user_ID
    result = await collection.deleteOne({ user_ID: decodedId });
    if (result.deletedCount > 0) {
      await Promise.allSettled([
        db.collection("daily_routine_logs").deleteMany({ student_id: decodedId }),
        db.collection("grades").deleteMany({ student_id: decodedId }),
      ]);
      return NextResponse.json({ message: "აღსაზრდელი წარმატებით წაიშალა" });
    }

    // 4. Try ID
    result = await collection.deleteOne({ ID: decodedId });
    if (result.deletedCount > 0) {
      await Promise.allSettled([
        db.collection("daily_routine_logs").deleteMany({ student_id: decodedId }),
        db.collection("grades").deleteMany({ student_id: decodedId }),
      ]);
      return NextResponse.json({ message: "აღსაზრდელი წარმატებით წაიშალა" });
    }

    return NextResponse.json({ message: "აღსაზრდელი ვერ მოიძებნა" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ message: "წაშლის შეცდომა: " + (error?.message || error) }, { status: 500 });
  }
}

