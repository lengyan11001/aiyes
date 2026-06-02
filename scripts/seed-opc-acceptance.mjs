import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { nanoid } from "nanoid";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://aiyes:change-me@localhost:5432/aiyes?schema=public";
const USERNAME = process.env.OPC_ACCEPTANCE_USERNAME || "深圳市上融科技有限公司";
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

function minutesAfter(base, minutes) {
  return new Date(date(base).getTime() + minutes * 60 * 1000);
}

function yuanToPoints(yuan) {
  return Math.round(yuan * 100);
}

function buildOrders() {
  return Array.from({ length: 36 }, (_, index) => {
    const day = 1 + (index % 28);
    const amountYuan = [300, 500, 800, 1000, 1500, 2000][index % 6];
    const createdAt = date(`2026-05-${String(day).padStart(2, "0")}T02:${String(index % 50).padStart(2, "0")}:00.000Z`);
    const paidAt = minutesAfter(createdAt.toISOString(), 2);
    const orderNo = String(index + 1).padStart(3, "0");
    return {
      id: `opc_acceptance_order_202605_${orderNo}`,
      userId: USER_ID,
      provider: "wechat",
      status: "PAID",
      amountCents: yuanToPoints(amountYuan),
      creditsCents: yuanToPoints(amountYuan),
      title: `OPC验收充值 ${amountYuan}元`,
      wxTransactionId: `opc_acceptance_wx_202605_${orderNo}`,
      raw: {
        acceptance_seed: true,
      },
      createdAt,
      paidAt,
    };
  });
}

function jobTemplate(index) {
  const day = 1 + (index % 28);
  const hour = 3 + (index % 12);
  const minute = (index * 7) % 60;
  const createdAt = date(`2026-05-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`);
  const completedAt = minutesAfter(createdAt.toISOString(), 3 + (index % 4));
  const no = String(index + 1).padStart(3, "0");
  return { createdAt, completedAt, no };
}

function buildJobs() {
  const imageModels = [
    { model: "openai/gpt-image-2", cost: 16, params: { size: "1K", quality: "medium", aspectRatio: "1:1" } },
    { model: "fal-ai/bytedance/seedream/v5/lite/text-to-image", cost: 14, params: { imageSize: "auto_2K", aspectRatio: "16:9" } },
    { model: "fal-ai/nano-banana-2", cost: 32, params: { imageSize: "1K", aspectRatio: "4:3" } },
  ];
  const videoModels = [
    { model: "seedance2", cost: 20, duration: 10, params: { duration: 10, videoModel: "standard_vip", resolution: "1080p", aspectRatio: "16:9" } },
    { model: "alibaba/happy-horse/image-to-video", cost: 4.48, duration: 8, params: { duration: 8, resolution: "720p", aspectRatio: "9:16" } },
    { model: "fal-ai/veo3.1/fast/image-to-video", cost: 4.8, duration: 8, params: { duration: "8s", resolution: "720p", aspectRatio: "16:9" } },
  ];

  const images = Array.from({ length: 42 }, (_, index) => {
    const template = jobTemplate(index);
    const picked = imageModels[index % imageModels.length];
    return {
      id: `opc_acceptance_job_image_202605_${template.no}`,
      userId: USER_ID,
      apiKeyId: API_KEY_ID,
      upstreamTaskId: `opc-acceptance-upstream-image-202605-${template.no}`,
      kind: "IMAGE",
      model: picked.model,
      status: "COMPLETED",
      prompt: `OPC验收图片：5月营销素材 ${template.no}`,
      params: picked.params,
      result: { image_url: `https://aiyes.vip/opc-acceptance/image-202605-${template.no}.png` },
      chargedCents: yuanToPoints(picked.cost),
      clientIp: "127.0.0.1",
      createdAt: template.createdAt,
      completedAt: template.completedAt,
    };
  });

  const videos = Array.from({ length: 38 }, (_, index) => {
    const template = jobTemplate(index + 42);
    const picked = videoModels[index % videoModels.length];
    return {
      id: `opc_acceptance_job_video_202605_${template.no}`,
      userId: USER_ID,
      apiKeyId: API_KEY_ID,
      upstreamTaskId: `opc-acceptance-upstream-video-202605-${template.no}`,
      kind: "VIDEO",
      model: picked.model,
      status: "COMPLETED",
      prompt: `OPC验收视频：5月客户案例 ${template.no}`,
      params: { ...picked.params, audio_duration: picked.duration },
      result: {
        video_url: `https://aiyes.vip/opc-acceptance/video-202605-${template.no}.mp4`,
        audio_duration: picked.duration,
      },
      chargedCents: yuanToPoints(picked.cost),
      clientIp: "127.0.0.1",
      createdAt: template.createdAt,
      completedAt: template.completedAt,
    };
  });

  return [...images, ...videos];
}

function buildLedgers(orders, jobs) {
  const events = [
    ...orders.map((order) => ({
      id: `opc_acceptance_ledger_credit_${order.id.replace("opc_acceptance_order_", "")}`,
      userId: USER_ID,
      apiKeyId: null,
      jobId: null,
      type: "CREDIT",
      amountCents: order.creditsCents,
      model: null,
      note: `OPC验收充值 ${order.id}`,
      createdAt: minutesAfter(order.paidAt.toISOString(), 0.02),
    })),
    ...jobs.map((job) => ({
      id: `opc_acceptance_ledger_debit_${job.id.replace("opc_acceptance_job_", "")}`,
      userId: USER_ID,
      apiKeyId: API_KEY_ID,
      jobId: job.id,
      type: "DEBIT",
      amountCents: -job.chargedCents,
      model: job.model,
      note: job.kind === "IMAGE" ? "OPC验收图片消耗" : "OPC验收视频消耗",
      createdAt: minutesAfter(job.completedAt.toISOString(), 0.02),
    })),
  ].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

  let balance = 0;
  return events.map((event) => {
    balance += event.amountCents;
    return { ...event, balanceAfter: balance };
  });
}

async function assertSeedCanOwnUsername() {
  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [{ id: USER_ID }, { username: USERNAME }],
    },
    include: { apiKeys: { where: { id: API_KEY_ID }, select: { id: true } } },
  });

  for (const existing of existingUsers) {
    const looksLikeSeed = existing.id === USER_ID || existing.apiKeys.length > 0;
    if (!OVERWRITE_EXISTING && !looksLikeSeed) {
      throw new Error(
        `User "${USERNAME}" already exists and does not look like OPC seed data. ` +
          "Set OPC_ACCEPTANCE_OVERWRITE_EXISTING=1 only if this account is safe to replace.",
      );
    }

    await prisma.user.delete({ where: { id: existing.id } });
  }
}

async function main() {
  const key = apiKeyParts(API_KEY);
  const orders = buildOrders();
  const jobs = buildJobs();
  const ledgers = buildLedgers(orders, jobs);
  const finalBalance = ledgers.at(-1)?.balanceAfter ?? 0;

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
        balanceCents: finalBalance,
        companyVerification: {
          create: {
            status: "APPROVED",
            imageUrl: "https://aiyes.vip/opc-acceptance/company-verification.png",
            reviewedAt: date("2026-05-01T01:00:00.000Z"),
          },
        },
        apiKeys: {
          create: {
            id: API_KEY_ID,
            name: "OPC Acceptance Stable Token",
            prefix: key.prefix,
            last4: key.last4,
            keyHash: key.keyHash,
            secretPlain: API_KEY,
            status: "ACTIVE",
          },
        },
      },
    });

    await tx.order.createMany({ data: orders });
    await tx.generationJob.createMany({ data: jobs });
    await tx.usageLedger.createMany({ data: ledgers });
  });

  console.log(
    JSON.stringify(
      {
        username: USERNAME,
        apiKeyPrefix: key.prefix,
        apiKeyLast4: key.last4,
        orders: orders.length,
        jobs: jobs.length,
        ledgers: ledgers.length,
        balanceCents: finalBalance,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
