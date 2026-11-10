import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("eschools");
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignment_id");
    const studentId = searchParams.get("student_id");

    let query: any = {};
    if (assignmentId) query.assignment_id = assignmentId;
    if (studentId) query.student_id = studentId;

    const submissions = await db.collection("assignment_submissions").find(query).sort({ _id: -1 }).toArray();
    return NextResponse.json(submissions);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let assignment_id = "";
    let student_id = "";
    let student_name = "";
    let file_name = "";
    let file_url = "";
    let comment = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      assignment_id = String(formData.get("assignment_id") || "");
      student_id = String(formData.get("student_id") || "");
      student_name = String(formData.get("student_name") || "");
      comment = String(formData.get("comment") || "");
      const file = formData.get("file") as File | null;
      if (file) {
        file_name = file.name || "attachment";
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString("base64");
        const mimeType = file.type || "application/octet-stream";
        const client = await clientPromise;
        const db = client.db("eschools");
        const uploadRes = await db.collection("uploaded_files").insertOne({
          filename: file_name,
          mimeType,
          size: buffer.length,
          data: base64Data,
          created_at: new Date().toISOString(),
        });
        file_url = mimeType.startsWith("image/") && buffer.length < 1.5 * 1024 * 1024
          ? `data:${mimeType};base64,${base64Data}`
          : `/api/file-upload?id=${uploadRes.insertedId.toString()}`;
      }
    } else {
      const body = await req.json();
      assignment_id = body.assignment_id;
      student_id = body.student_id;
      student_name = body.student_name;
      file_name = body.file_name;
      file_url = body.file_url;
      comment = body.comment;
    }

    if (!assignment_id || !student_id) {
      return NextResponse.json({ error: "არასწორი პარამეტრები" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("eschools");

    const submission = {
      assignment_id,
      student_id,
      student_name: student_name || "მოსწავლე",
      file_name: file_name || "",
      file_url: file_url || "",
      comment: comment || "",
      status: "submitted",
      submitted_at: new Date().toISOString()
    };

    const res = await db.collection("assignment_submissions").insertOne(submission);
    return NextResponse.json({ success: true, id: res.insertedId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { submissionId, status, feedback } = body; // status: 'approved' | 'needs_resubmission'

    if (!submissionId || !status) {
      return NextResponse.json({ error: "არასწორი პარამეტრები" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("eschools");

    await db.collection("assignment_submissions").updateOne(
      { _id: new ObjectId(submissionId) },
      { $set: { status, feedback: feedback || "", reviewed_at: new Date().toISOString() } }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
