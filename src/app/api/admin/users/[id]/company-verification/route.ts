import { CompanyVerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const schema = z.object({
  status: z.enum([CompanyVerificationStatus.APPROVED, CompanyVerificationStatus.REJECTED]),
  rejectReason: z.string().trim().max(200).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("需要管理员权限。", 403, "forbidden");

  const parsed = schema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonError("审核参数错误。", 422, "validation_error");

  const { id } = await context.params;
  const existing = await prisma.companyVerification.findUnique({ where: { userId: id } });
  if (!existing) return jsonError("该用户还没有提交企业认证图片。", 404, "verification_not_found");

  const verification = await prisma.companyVerification.update({
    where: { userId: id },
    data: {
      status: parsed.data.status,
      rejectReason:
        parsed.data.status === CompanyVerificationStatus.REJECTED
          ? parsed.data.rejectReason || "审核未通过"
          : null,
      reviewerId: admin.id,
      reviewedAt: new Date(),
    },
    select: {
      id: true,
      userId: true,
      status: true,
      imageUrl: true,
      rejectReason: true,
      reviewedAt: true,
    },
  });

  return NextResponse.json({ verification });
}
