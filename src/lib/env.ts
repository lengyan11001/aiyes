import { z } from "zod";

const envSchema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_SECRET: z.string().min(24).default("dev-only-secret-change-before-production"),
  DATABASE_URL: z
    .string()
    .default("postgresql://aiyes:change-me@localhost:5432/aiyes?schema=public"),
  REDIS_URL: z.string().optional(),
  APIZ_API_KEY: z.string().min(1).optional(),
  APIZ_BASE_URL: z.string().url().default("https://api.apiz.ai"),
  APIZ_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  APIZ_SYNC_WAIT_MS: z.coerce.number().int().positive().default(30_000),
  OPC_DATA_HEADER_KEY: z.string().optional(),
  INITIAL_CREDITS_CENTS: z.coerce.number().int().min(0).default(0),
  PRICE_IMAGE_CENTS: z.coerce.number().int().min(1).default(99),
  PRICE_VIDEO_CENTS: z.coerce.number().int().min(1).default(499),
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  WECHAT_APPID: z.string().optional(),
  WECHAT_APP_ID: z.string().optional(),
  WECHAT_MCH_ID: z.string().optional(),
  WECHAT_API_V3_KEY: z.string().optional(),
  WECHAT_PAY_APIV3_KEY: z.string().optional(),
  WECHAT_SERIAL_NO: z.string().optional(),
  WECHAT_PAY_SERIAL_NO: z.string().optional(),
  WECHAT_PRIVATE_KEY: z.string().optional(),
  WECHAT_PRIVATE_KEY_PATH: z.string().optional(),
  WECHAT_PAY_PRIVATE_KEY_PATH: z.string().optional(),
  WECHAT_PUBLIC_KEY: z.string().optional(),
  WECHAT_PUBLIC_KEY_PATH: z.string().optional(),
  WECHAT_PAY_PUBLIC_KEY_PATH: z.string().optional(),
  WECHAT_PAY_PUBLIC_KEY_ID: z.string().optional(),
  WECHAT_NOTIFY_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);

export const wechatEnv = {
  appId: env.WECHAT_APPID || env.WECHAT_APP_ID,
  mchId: env.WECHAT_MCH_ID,
  apiV3Key: env.WECHAT_API_V3_KEY || env.WECHAT_PAY_APIV3_KEY,
  serialNo: env.WECHAT_SERIAL_NO || env.WECHAT_PAY_SERIAL_NO,
  privateKey: env.WECHAT_PRIVATE_KEY,
  privateKeyPath:
    env.WECHAT_PRIVATE_KEY_PATH || env.WECHAT_PAY_PRIVATE_KEY_PATH,
  publicKey: env.WECHAT_PUBLIC_KEY,
  publicKeyPath:
    env.WECHAT_PUBLIC_KEY_PATH || env.WECHAT_PAY_PUBLIC_KEY_PATH,
  publicKeyId: env.WECHAT_PAY_PUBLIC_KEY_ID,
  notifyUrl: env.WECHAT_NOTIFY_URL || `${env.APP_URL}/api/pay/wechat/notify`,
};

export function isWechatConfigured() {
  return Boolean(
    wechatEnv.appId &&
      wechatEnv.mchId &&
      wechatEnv.apiV3Key &&
      wechatEnv.serialNo &&
      (wechatEnv.privateKey || wechatEnv.privateKeyPath) &&
      wechatEnv.notifyUrl,
  );
}
