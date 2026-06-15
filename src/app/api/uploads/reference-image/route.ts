import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

type ReferenceKind = "image" | "video" | "audio";

const allowedTypes = new Map<string, { ext: string; kind: ReferenceKind; maxFileSize: number }>([
  ["image/png", { ext: "png", kind: "image", maxFileSize: 10 * 1024 * 1024 }],
  ["image/jpeg", { ext: "jpg", kind: "image", maxFileSize: 10 * 1024 * 1024 }],
  ["image/webp", { ext: "webp", kind: "image", maxFileSize: 10 * 1024 * 1024 }],
  ["image/gif", { ext: "gif", kind: "image", maxFileSize: 10 * 1024 * 1024 }],
  ["image/bmp", { ext: "bmp", kind: "image", maxFileSize: 10 * 1024 * 1024 }],
  ["video/mp4", { ext: "mp4", kind: "video", maxFileSize: 50 * 1024 * 1024 }],
  ["video/quicktime", { ext: "mov", kind: "video", maxFileSize: 50 * 1024 * 1024 }],
  ["video/x-msvideo", { ext: "avi", kind: "video", maxFileSize: 50 * 1024 * 1024 }],
  ["video/x-matroska", { ext: "mkv", kind: "video", maxFileSize: 50 * 1024 * 1024 }],
  ["video/webm", { ext: "webm", kind: "video", maxFileSize: 50 * 1024 * 1024 }],
  ["video/x-flv", { ext: "flv", kind: "video", maxFileSize: 50 * 1024 * 1024 }],
  ["audio/mpeg", { ext: "mp3", kind: "audio", maxFileSize: 15 * 1024 * 1024 }],
  ["audio/mp3", { ext: "mp3", kind: "audio", maxFileSize: 15 * 1024 * 1024 }],
  ["audio/wav", { ext: "wav", kind: "audio", maxFileSize: 15 * 1024 * 1024 }],
  ["audio/x-wav", { ext: "wav", kind: "audio", maxFileSize: 15 * 1024 * 1024 }],
]);

const allowedExtensions = new Map<string, { ext: string; kind: ReferenceKind; maxFileSize: number }>(
  Array.from(allowedTypes.values()).map((value) => [value.ext, value]),
);

function fileType(file: File) {
  const byMime = allowedTypes.get(file.type);
  if (byMime) return byMime;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext ? allowedExtensions.get(ext) : undefined;
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("上传参数不正确。", 400, "invalid_form");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("请选择参考素材文件。", 422, "file_required");
  }

  const type = fileType(file);
  if (!type) {
    return jsonError(
      "参考素材仅支持图片 PNG/JPG/WEBP/GIF/BMP、视频 MP4/MOV/AVI/MKV/WEBM/FLV、音频 MP3/WAV。",
      422,
      "unsupported_file_type",
    );
  }

  if (file.size <= 0 || file.size > type.maxFileSize) {
    const limit = type.kind === "video" ? "50MB" : type.kind === "audio" ? "15MB" : "10MB";
    return jsonError(`参考素材大小不能超过 ${limit}。`, 422, "file_too_large");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "references");
  const filename = `${randomUUID()}.${type.ext}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()), {
    flag: "wx",
  });

  const url = new URL(`/uploads/references/${filename}`, env.APP_URL).toString();
  return NextResponse.json({ url, name: file.name, kind: type.kind, mimeType: file.type, size: file.size });
}
