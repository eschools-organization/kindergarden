import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { invalidateCache } from "@/lib/cache";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const nameStr = (body.name || body.subject_name || body.ID || "").toString().trim();
  if (!nameStr) {
    return NextResponse.json({ message: "Subject name is required" }, { status: 400 });
  }

  const db = await getDb();
  const collection = db.collection("subjects");

  const existing = await collection.findOne({
    $or: [{ name: nameStr }, { subject_name: nameStr }]
  });
  if (existing) {
    return NextResponse.json({ message: "Subject already exists", _id: existing._id.toString() }, { status: 409 });
  }

  const doc = {
    ...body,
    name: nameStr,
    subject_name: nameStr,
  };

  const res = await collection.insertOne(doc);
  invalidateCache("all_subjects_formatted");
  return NextResponse.json({ message: "Subject added successfully", _id: res.insertedId.toString(), name: nameStr }, { status: 201 });
}
