import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CompanyVerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
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

  const existing = await prisma.companyVerification.findUnique({ where: { userId: user.id } });
  if (existing?.status === CompanyVerificationStatus.APPROVED) {
    return jsonError("企业认证已通过，不能重复认证。", 409, "already_verified");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("上传参数不正确。", 400, "invalid_form");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("请选择企业认证图片。", 422, "file_required");
  }

  const ext = allowedTypes.get(file.type);
  if (!ext) {
    return jsonError("企业认证图片仅支持 PNG、JPG、WEBP。", 422, "unsupported_file_type");
  }

  if (file.size <= 0 || file.size > maxFileSize) {
    return jsonError("企业认证图片大小不能超过 10MB。", 422, "file_too_large");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "company-verifications");
  const filename = `${randomUUID()}.${ext}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()), { flag: "wx" });

  const imageUrl = new URL(`/uploads/company-verifications/${filename}`, env.APP_URL).toString();
  const verification = await prisma.companyVerification.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      imageUrl,
      status: CompanyVerificationStatus.APPROVED,
      reviewedAt: new Date(),
    },
    update: {
      imageUrl,
      status: CompanyVerificationStatus.APPROVED,
      rejectReason: null,
      reviewedAt: new Date(),
      reviewerId: null,
    },
    select: {
      id: true,
      status: true,
      imageUrl: true,
      reviewedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ verification });
}
