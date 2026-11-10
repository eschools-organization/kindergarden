import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

// Forbidden executable file extensions
const DANGEROUS_EXTENSIONS = [
  ".exe", ".bat", ".bin", ".cmd", ".sh", ".ps1", ".msi", ".dll", ".scr", ".vbs", ".jar", ".com", ".pif", ".application", ".gadget", ".wsf"
];

// Allowed MIME magic signatures (file headers)
const DANGEROUS_MAGIC_HEADERS = [
  "4d5a", // MZ (.exe, .dll)
  "7f454c46", // ELF (.bin, Linux executable)
  "213c617263683e", // archive
];

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "არასწორი ფაილის ID" }, { status: 400 });
    }

    const db = await getDb();
    const record = await db.collection("uploaded_files").findOne({ _id: new ObjectId(id) });
    if (!record || !record.data) {
      return NextResponse.json({ error: "ფაილი ვერ მოიძებნა" }, { status: 404 });
    }

    const buffer = Buffer.from(record.data, "base64");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": record.mimeType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "ფაილის წაკითხვის შეცდომა" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let filename = "photo.jpg";
    let mimeType = "image/jpeg";
    let buffer: Buffer;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (!body.file_data) {
        return NextResponse.json({ error: "ფაილი არ არის ატვირთული" }, { status: 400 });
      }
      filename = body.file_name || "photo.jpg";
      const match = String(body.file_data).match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        buffer = Buffer.from(match[2], "base64");
      } else {
        buffer = Buffer.from(String(body.file_data), "base64");
      }
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "ფაილი არ არის ატვირთული" }, { status: 400 });
      }

      filename = file.name || "file";
      const ext = path.extname(filename).toLowerCase();
      mimeType = file.type || MIME_BY_EXT[ext] || "application/octet-stream";

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    const ext = path.extname(filename).toLowerCase();

    // 1. Check Extension
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      return NextResponse.json({
        error: `უსაფრთხოების დარღვევა: საშიში გაფართოების ფაილი (${ext}) დაბლოკილია!`,
        blocked: true
      }, { status: 400 });
    }

    // Read initial bytes (magic header)
    const hexHeader = buffer.subarray(0, 8).toString("hex").toLowerCase();

    // 2. Check Magic Bytes Header
    for (const dangerousHeader of DANGEROUS_MAGIC_HEADERS) {
      if (hexHeader.startsWith(dangerousHeader)) {
        return NextResponse.json({
          error: "უსაფრთხოების დარღვევა: ფაილის შიგთავსი სცდება უსაფრთხოების სტანდარტს (Exec/Binary header detected)!",
          blocked: true
        }, { status: 400 });
      }
    }

    const base64Data = buffer.toString("base64");
    const isImage = mimeType.startsWith("image/") || [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"].includes(ext);

    // Best-effort write to public/uploads for local dev convenience (ignored if filesystem is read-only)
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });
      const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const filePath = path.join(uploadsDir, safeFilename);
      await fs.writeFile(filePath, buffer);
    } catch {
      // Read-only filesystem in serverless/production environments — handled via DB / Data URL below
    }

    // Store in MongoDB so it persists across serverless instances
    let fileUrl = `data:${mimeType};base64,${base64Data}`;
    try {
      const db = await getDb();
      const result = await db.collection("uploaded_files").insertOne({
        filename,
        mimeType,
        size: buffer.length,
        data: base64Data,
        created_at: new Date().toISOString(),
      });
      // For non-image files or larger files, use the streaming endpoint URL; for compact images, data URL or endpoint both work reliably
      if (!isImage || buffer.length > 1.5 * 1024 * 1024) {
        fileUrl = `/api/file-upload?id=${result.insertedId.toString()}`;
      }
    } catch {
      // Fallback to dataUrl if DB insert fails
    }

    return NextResponse.json({
      success: true,
      file_name: filename,
      file_url: fileUrl,
      size: buffer.length
    });

  } catch (err: any) {
    console.error("File upload error:", err);
    return NextResponse.json({ error: err.message || "ფაილის ატვირთვის შეცდომა" }, { status: 500 });
  }
}
