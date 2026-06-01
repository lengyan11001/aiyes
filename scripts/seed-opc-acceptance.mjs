import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { nanoid } from "nanoid";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://aiyes:change-me@localhost:5432/aiyes?schema=public";
const USERNAME = process.env.OPC_ACCEPTANCE_USERNAME || "A公司";
const PASSWORD = process.env.OPC_ACCEPTANCE_PASSWORD || `${randomBytes(18).toString("base64url")}Aa1!`;
const USER_ID = process.env.OPC_ACCEPTANCE_USER_ID || "opc_acceptance_user_a";
const API_KEY_ID = process.env.OPC_ACCEPTANCE_API_KEY_ID || "opc_acceptance_key_a";
const API_KEY = process.env.OPC_ACCEPTANCE_API_KEY || `ak_${nanoid(24)}${randomBytes(18).toString("base64url")}`;
const OVERWRITE_EXISTING = process.env.OPC_ACCEPTANCE_OVERWRITE_EXISTING === "1";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
  log: ["error", "warn"],
});

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function date(value) {
  return new Date(value);
}

function apiKeyParts(plain) {
  return {
    prefix: plain.slice(0, 10),
    last4: plain.slice(-4),
    keyHash: sha256(plain),
  };
}

async function assertSeedCanOwnUsername() {
  const existing = await prisma.user.findUnique({
    where: { username: USERNAME },
    include: { apiKeys: { where: { id: API_KEY_ID }, select: { id: true } } },
  });

  if (!existing) return;

  if (!OVERWRITE_EXISTING && existing.id !== USER_ID && existing.apiKeys.length === 0) {
    throw new Error(
      `User "${USERNAME}" already exists and does not look like OPC seed data. ` +
        "Set OPC_ACCEPTANCE_OVERWRITE_EXISTING=1 only if this account is safe to replace.",
    );
  }

  await prisma.user.delete({ where: { id: existing.id } });
}

async function main() {
  const key = apiKeyParts(API_KEY);

  await assertSeedCanOwnUsername();

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: USER_ID,
        username: USERNAME,
        name: USERNAME,
        email: null,
        role: UserRole.USER,
        status: "ACTIVE",
        passwordHash: await hash(PASSWORD, 12),
        balanceCents: 144552,
        apiKeys: {
          create: {
            id: API_KEY_ID,
            name: "OPC验收稳定 Token",
            prefix: key.prefix,
            last4: key.last4,
            keyHash: key.keyHash,
            secretPlain: API_KEY,
            status: "ACTIVE",
          },
        },
      },
    });

    await tx.order.createMany({
      data: [
        {
          id: "opc_acceptance_order_20260405",
          userId: USER_ID,
          provider: "wechat",
          status: "PAID",
          amountCents: 50000,
          creditsCents: 50000,
          title: "OPC验收充值 500元",
          wxTransactionId: "opc_acceptance_wx_20260405",
          raw: {
            invoice_url: "https://aiyes.vip/invoices/opc-acceptance-20260405.pdf",
            acceptance_seed: true,
          },
          createdAt: date("2026-04-05T02:10:00.000Z"),
          paidAt: date("2026-04-05T02:12:00.000Z"),
        },
        {
          id: "opc_acceptance_order_20260420",
          userId: USER_ID,
          provider: "wechat",
          status: "PAID",
          amountCents: 100000,
          creditsCents: 100000,
          title: "OPC验收充值 1000元",
          wxTransactionId: "opc_acceptance_wx_20260420",
          raw: {
            invoice_url: "https://aiyes.vip/invoices/opc-acceptance-20260420.pdf",
            acceptance_seed: true,
          },
          createdAt: date("2026-04-20T03:20:00.000Z"),
          paidAt: date("2026-04-20T03:21:00.000Z"),
        },
      ],
    });

    await tx.generationJob.createMany({
      data: [
        {
          id: "opc_acceptance_job_image_20260406",
          userId: USER_ID,
          apiKeyId: API_KEY_ID,
          upstreamTaskId: "opc-acceptance-upstream-image-20260406",
          kind: "IMAGE",
          model: "openai/gpt-image-2",
          status: "COMPLETED",
          prompt: "OPC验收图片：企业展厅海报",
          params: { size: "1K", quality: "medium", aspectRatio: "1:1" },
          result: { image_url: "https://aiyes.vip/opc-acceptance/image-20260406.png" },
          chargedCents: 1600,
          clientIp: "127.0.0.1",
          createdAt: date("2026-04-06T06:30:00.000Z"),
          completedAt: date("2026-04-06T06:31:00.000Z"),
        },
        {
          id: "opc_acceptance_job_video_20260410",
          userId: USER_ID,
          apiKeyId: API_KEY_ID,
          upstreamTaskId: "opc-acceptance-upstream-video-20260410",
          kind: "VIDEO",
          model: "seedance2",
          status: "COMPLETED",
          prompt: "OPC验收视频：产品发布会开场",
          params: {
            duration: 10,
            videoModel: "standard_vip",
            resolution: "1080p",
            aspectRatio: "16:9",
            audio_duration: 10,
          },
          result: { video_url: "https://aiyes.vip/opc-acceptance/video-20260410.mp4", audio_duration: 10 },
          chargedCents: 2000,
          clientIp: "127.0.0.1",
          createdAt: date("2026-04-10T08:00:00.000Z"),
          completedAt: date("2026-04-10T08:04:00.000Z"),
        },
        {
          id: "opc_acceptance_job_image_20260512",
          userId: USER_ID,
          apiKeyId: API_KEY_ID,
          upstreamTaskId: "opc-acceptance-upstream-image-20260512",
          kind: "IMAGE",
          model: "fal-ai/bytedance/seedream/v5/lite/text-to-image",
          status: "COMPLETED",
          prompt: "OPC验收图片：5月营销素材",
          params: { imageSize: "auto_2K", aspectRatio: "16:9" },
          result: { image_url: "https://aiyes.vip/opc-acceptance/image-20260512.png" },
          chargedCents: 1400,
          clientIp: "127.0.0.1",
          createdAt: date("2026-05-12T04:15:00.000Z"),
          completedAt: date("2026-05-12T04:16:00.000Z"),
        },
        {
          id: "opc_acceptance_job_video_20260515",
          userId: USER_ID,
          apiKeyId: API_KEY_ID,
          upstreamTaskId: "opc-acceptance-upstream-video-20260515",
          kind: "VIDEO",
          model: "alibaba/happy-horse/image-to-video",
          status: "COMPLETED",
          prompt: "OPC验收视频：5月客户案例",
          params: { duration: 8, resolution: "720p", aspectRatio: "9:16", audio_duration: 8 },
          result: { video_url: "https://aiyes.vip/opc-acceptance/video-20260515.mp4", audio_duration: 8 },
          chargedCents: 448,
          clientIp: "127.0.0.1",
          createdAt: date("2026-05-15T05:20:00.000Z"),
          completedAt: date("2026-05-15T05:24:00.000Z"),
        },
      ],
    });

    await tx.usageLedger.createMany({
      data: [
        {
          id: "opc_acceptance_ledger_credit_20260405",
          userId: USER_ID,
          apiKeyId: null,
          jobId: null,
          type: "CREDIT",
          amountCents: 50000,
          balanceAfter: 50000,
          model: null,
          note: "OPC验收充值 opc_acceptance_order_20260405",
          createdAt: date("2026-04-05T02:12:01.000Z"),
        },
        {
          id: "opc_acceptance_ledger_debit_image_20260406",
          userId: USER_ID,
          apiKeyId: API_KEY_ID,
          jobId: "opc_acceptance_job_image_20260406",
          type: "DEBIT",
          amountCents: -1600,
          balanceAfter: 48400,
          model: "openai/gpt-image-2",
          note: "OPC验收图片消耗",
          createdAt: date("2026-04-06T06:31:01.000Z"),
        },
        {
          id: "opc_acceptance_ledger_credit_20260420",
          userId: USER_ID,
          apiKeyId: null,
          jobId: null,
          type: "CREDIT",
          amountCents: 100000,
          balanceAfter: 148400,
          model: null,
          note: "OPC验收充值 opc_acceptance_order_20260420",
          createdAt: date("2026-04-20T03:21:01.000Z"),
        },
        {
          id: "opc_acceptance_ledger_debit_video_20260410",
          userId: USER_ID,
          apiKeyId: API_KEY_ID,
          jobId: "opc_acceptance_job_video_20260410",
          type: "DEBIT",
          amountCents: -2000,
          balanceAfter: 146400,
          model: "seedance2",
          note: "OPC验收视频消耗",
          createdAt: date("2026-04-10T08:04:01.000Z"),
        },
        {
          id: "opc_acceptance_ledger_debit_image_20260512",
          userId: USER_ID,
          apiKeyId: API_KEY_ID,
          jobId: "opc_acceptance_job_image_20260512",
          type: "DEBIT",
          amountCents: -1400,
          balanceAfter: 145000,
          model: "fal-ai/bytedance/seedream/v5/lite/text-to-image",
          note: "OPC验收5月图片消耗",
          createdAt: date("2026-05-12T04:16:01.000Z"),
        },
        {
          id: "opc_acceptance_ledger_debit_video_20260515",
          userId: USER_ID,
          apiKeyId: API_KEY_ID,
          jobId: "opc_acceptance_job_video_20260515",
          type: "DEBIT",
          amountCents: -448,
          balanceAfter: 144552,
          model: "alibaba/happy-horse/image-to-video",
          note: "OPC验收5月视频消耗",
          createdAt: date("2026-05-15T05:24:01.000Z"),
        },
      ],
    });
  });

  console.log(JSON.stringify({ username: USERNAME, apiKeyPrefix: key.prefix, apiKeyLast4: key.last4 }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
