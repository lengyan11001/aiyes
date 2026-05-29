import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

const maxFileSize = 10 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

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
    return jsonError("请选择参考图文件。", 422, "file_required");
  }

  const ext = allowedTypes.get(file.type);
  if (!ext) {
    return jsonError("参考图仅支持 PNG、JPG、WEBP。", 422, "unsupported_file_type");
  }

  if (file.size <= 0 || file.size > maxFileSize) {
    return jsonError("参考图大小不能超过 10MB。", 422, "file_too_large");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "references");
  const filename = `${randomUUID()}.${ext}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()), {
    flag: "wx",
  });

  const url = new URL(`/uploads/references/${filename}`, env.APP_URL).toString();
  return NextResponse.json({ url });
}
