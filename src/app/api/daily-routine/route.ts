import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");
    const date = searchParams.get("date");
    const studentId = searchParams.get("student_id");

    const db = await getDb();
    const query: Record<string, any> = {};

    if (classId) query.class_id = classId;
    if (date && date !== "all") query.date = date;

    if (studentId) {
      let possibleIds: string[] = [studentId];
      try {
        const studentConditions: any[] = [
          { user_ID: studentId },
          { ID: studentId },
          { _id: studentId }
        ];
        if (ObjectId.isValid(studentId) && studentId.length === 24) {
          studentConditions.push({ _id: new ObjectId(studentId) });
        }
        const student = await db.collection("students").findOne({ $or: studentConditions });
        if (student) {
          if (student._id) possibleIds.push(student._id.toString());
          if (student.user_ID) possibleIds.push(String(student.user_ID));
          if (student.ID) possibleIds.push(String(student.ID));
        }
      } catch {
        // ignore error resolving student
      }
      possibleIds = Array.from(new Set(possibleIds.filter(Boolean)));
      query.$or = [
        { student_id: { $in: possibleIds } },
        { student_user_id: { $in: possibleIds } }
      ];
    }

    const logs = await db.collection("daily_routine_logs").find(query).sort({ date: -1 }).toArray();
    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json({ message: "შეცდომა რეჟიმის მონაცემების მიღებისას", error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { logs } = body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json({ message: "მონაცემები ცარიელია" }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection("daily_routine_logs");

    // Gather student IDs to fetch their user_ID for dual indexing
    const studentIds = logs.map((l: any) => l.student_id).filter(Boolean);
    const objectIds = studentIds
      .filter((id: string) => ObjectId.isValid(id) && id.length === 24)
      .map((id: string) => new ObjectId(id));

    let students: any[] = [];
    try {
      students = await db.collection("students").find({
        $or: [
          { _id: { $in: objectIds } },
          { _id: { $in: studentIds } },
          { user_ID: { $in: studentIds } }
        ]
      }).toArray();
    } catch {
      students = [];
    }

    const studentMap = new Map<string, any>();
    students.forEach((s: any) => {
      if (s._id) studentMap.set(s._id.toString(), s);
      if (s.user_ID) studentMap.set(String(s.user_ID), s);
      if (s.ID) studentMap.set(String(s.ID), s);
    });

    const bulkOps = logs.map((log: any) => {
      const sDoc = studentMap.get(String(log.student_id));
      const studentUserId = sDoc?.user_ID || log.student_user_id || log.student_id;
      const mongoIdStr = sDoc?._id ? sDoc._id.toString() : log.student_id;
      const idMatches = Array.from(new Set([log.student_id, mongoIdStr, studentUserId].filter(Boolean)));

      return {
        updateOne: {
          filter: {
            $or: [
              { student_id: { $in: idMatches } },
              { student_user_id: { $in: idMatches } }
            ],
            date: log.date,
          },
          update: {
            $set: {
              student_id: mongoIdStr,
              student_user_id: studentUserId,
              student_name: sDoc ? `${sDoc.name || ''} ${sDoc.surname || ''}`.trim() : (log.student_name || undefined),
              class_id: log.class_id,
              date: log.date,
              check_in_time: log.check_in_time,
              check_out_time: log.check_out_time,
              mood: log.mood,
              breakfast: log.breakfast,
              lunch: log.lunch,
              dinner: log.dinner,
              snack: log.snack,
              nap: log.nap,
              notes: log.notes,
              present: log.present,
              updatedAt: new Date().toISOString(),
            },
          },
          upsert: true,
        },
      };
    });

    await collection.bulkWrite(bulkOps);
    return NextResponse.json({ message: "დღის რეჟიმის მონაცემები წარმატებით შენახულია" });
  } catch (err: any) {
    return NextResponse.json({ message: "შეცდომა მონაცემების შენახვისას", error: err.message }, { status: 500 });
  }
}
