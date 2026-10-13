import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");
    const date = searchParams.get("date");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const db = await getDb();
    const query: Record<string, any> = {};

    if (classId) {
      if (ObjectId.isValid(classId)) {
        query.$or = [{ class_id: classId }, { class_id: new ObjectId(classId) }];
      } else {
        query.class_id = classId;
      }
    }
    if (date) query.date = date;

    const photos = await db
      .collection("activity_photos")
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(photos);
  } catch (err: any) {
    return NextResponse.json(
      { message: "შეცდომა აქტივობების ფოტოების მიღებისას", error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { class_id, teacher_id, teacher_name, activity_title, activities, description, photo_url, date } = body;

    if (!class_id || !photo_url) {
      return NextResponse.json(
        { message: "ჯგუფი და ფოტოს ბმული აუცილებელია" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("activity_photos");

    const resolvedActivities = Array.isArray(activities) && activities.length > 0
      ? activities
      : (activity_title ? String(activity_title).split(/•|,/).map((s: string) => s.trim()).filter(Boolean) : []);

    const newPhotoRecord = {
      class_id: String(class_id),
      teacher_id: teacher_id ? String(teacher_id) : "",
      teacher_name: teacher_name || "აღმზრდელი",
      activity_title: activity_title || (resolvedActivities.length > 0 ? resolvedActivities.join(", ") : "შესრულებული აქტივობა"),
      activities: resolvedActivities,
      description: description || "",
      photo_url: String(photo_url),
      date: date || new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };

    const result = await collection.insertOne(newPhotoRecord);

    return NextResponse.json({
      message: "აქტივობის ფოტო წარმატებით აიტვირთა",
      photo: { _id: result.insertedId, ...newPhotoRecord },
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: "შეცდომა ფოტოს შენახვისას", error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "არასწორი ID" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("activity_photos").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "ფოტო ვერ მოიძებნა" }, { status: 404 });
    }

    return NextResponse.json({ message: "აქტივობის ფოტო წაიშალა" });
  } catch (err: any) {
    return NextResponse.json({ message: "შეცდომა წაშლისას", error: err.message }, { status: 500 });
  }
}
