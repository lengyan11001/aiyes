import { createDecipheriv, createSign, createVerify, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isWechatConfigured, wechatEnv } from "./env";

const WECHAT_PAY_BASE = "https://api.mch.weixin.qq.com";

export interface WechatOrderInput {
  orderId: string;
  description: string;
  amountCents: number;
}

export interface WechatNativePayment {
  provider: "wechat_native";
  codeUrl: string;
  orderId: string;
  amountCents: number;
}

export interface WechatTrade {
  appid?: string;
  mchid?: string;
  out_trade_no: string;
  transaction_id?: string;
  trade_type?: string;
  trade_state?: string;
  trade_state_desc?: string;
  amount?: {
    total?: number;
    payer_total?: number;
    currency?: string;
    payer_currency?: string;
  };
  [key: string]: unknown;
}

export interface WechatNotifyEvent {
  id?: string;
  event_type?: string;
  resource_type?: string;
  summary?: string;
  trade: WechatTrade;
  raw: unknown;
}

function assertWechatConfigured() {
  if (!isWechatConfigured()) {
    throw new Error("微信支付未配置完整，请设置 appid、商户号、APIv3 密钥、商户私钥和回调地址。");
  }
}

function readPem(raw?: string, filePath?: string) {
  if (raw?.includes("BEGIN ")) return raw.replace(/\\n/g, "\n");
  const resolved = filePath
    ? path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), "certs", path.basename(filePath))
    : undefined;
  if (resolved && existsSync(resolved)) {
    return readFileSync(resolved, "utf8");
  }
  if (raw) return raw.replace(/\\n/g, "\n");
  throw new Error("微信支付证书或密钥文件不存在。");
}

function nonce() {
  return randomBytes(16).toString("hex");
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000).toString();
}

function signMessage(method: string, urlPathWithQuery: string, body = "") {
  assertWechatConfigured();
  const timestamp = nowSeconds();
  const nonceStr = nonce();
  const message = `${method}\n${urlPathWithQuery}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signer = createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  const privateKey = readPem(wechatEnv.privateKey, wechatEnv.privateKeyPath);
  const signature = signer.sign(privateKey, "base64");
  const authorization =
    `WECHATPAY2-SHA256-RSA2048 mchid="${wechatEnv.mchId}",` +
    `nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",` +
    `serial_no="${wechatEnv.serialNo}"`;
  return authorization;
}

async function wechatRequest<T>(method: "GET" | "POST", urlPathWithQuery: string, body?: unknown) {
  const bodyText = body === undefined ? "" : JSON.stringify(body);
  const res = await fetch(`${WECHAT_PAY_BASE}${urlPathWithQuery}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: signMessage(method, urlPathWithQuery, bodyText),
    },
    body: method === "GET" ? undefined : bodyText,
    cache: "no-store",
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const message = payload?.message || payload?.code || `微信支付请求失败：HTTP ${res.status}`;
    throw new Error(String(message));
  }
  return payload as T;
}

export async function createWechatNativePayment(input: WechatOrderInput): Promise<WechatNativePayment> {
  assertWechatConfigured();
  const description = input.description.trim().slice(0, 127) || "Aiyes 余额充值";
  const result = await wechatRequest<{ code_url?: string }>("POST", "/v3/pay/transactions/native", {
    appid: wechatEnv.appId,
    mchid: wechatEnv.mchId,
    description,
    out_trade_no: input.orderId,
    notify_url: wechatEnv.notifyUrl,
    amount: {
      total: input.amountCents,
      currency: "CNY",
    },
  });
  if (!result.code_url?.startsWith("weixin://")) {
    throw new Error("微信支付下单未返回有效二维码链接。");
  }
  return {
    provider: "wechat_native",
    codeUrl: result.code_url,
    orderId: input.orderId,
    amountCents: input.amountCents,
  };
}

export async function queryWechatOrder(orderId: string) {
  assertWechatConfigured();
  return wechatRequest<WechatTrade>(
    "GET",
    `/v3/pay/transactions/out-trade-no/${encodeURIComponent(orderId)}?mchid=${encodeURIComponent(
      wechatEnv.mchId || "",
    )}`,
  );
}

function verifyWechatSignature(headers: Headers, body: string) {
  const timestamp = headers.get("wechatpay-timestamp");
  const nonceStr = headers.get("wechatpay-nonce");
  const signature = headers.get("wechatpay-signature");
  const serial = headers.get("wechatpay-serial");
  if (!timestamp || !nonceStr || !signature || !serial) {
    throw new Error("微信支付回调缺少验签头。");
  }
  if (wechatEnv.publicKeyId && serial !== wechatEnv.publicKeyId) {
    throw new Error("微信支付回调平台公钥 ID 不匹配。");
  }
  const publicKey = readPem(wechatEnv.publicKey, wechatEnv.publicKeyPath);
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${timestamp}\n${nonceStr}\n${body}\n`);
  verifier.end();
  const ok = verifier.verify(publicKey, signature, "base64");
  if (!ok) throw new Error("微信支付回调签名校验失败。");
}

function decryptResource(resource: {
  algorithm?: string;
  ciphertext?: string;
  associated_data?: string;
  nonce?: string;
}) {
  if (resource.algorithm !== "AEAD_AES_256_GCM") {
    throw new Error("微信支付回调加密算法不支持。");
  }
  if (!resource.ciphertext || !resource.nonce) {
    throw new Error("微信支付回调加密数据不完整。");
  }
  const key = Buffer.from((wechatEnv.apiV3Key || "").slice(0, 32), "utf8");
  if (key.length !== 32) throw new Error("微信支付 APIv3 密钥长度必须为 32 字节。");
  const encrypted = Buffer.from(resource.ciphertext, "base64");
  const authTag = encrypted.subarray(encrypted.length - 16);
  const data = encrypted.subarray(0, encrypted.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(resource.nonce, "utf8"));
  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, "utf8"));
  }
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as WechatTrade;
}

export async function parseWechatNotify(headers: Headers, body: string): Promise<WechatNotifyEvent> {
  assertWechatConfigured();
  verifyWechatSignature(headers, body);
  const payload = JSON.parse(body) as {
    id?: string;
    event_type?: string;
    resource_type?: string;
    summary?: string;
    resource?: {
      algorithm?: string;
      ciphertext?: string;
      associated_data?: string;
      nonce?: string;
    };
  };
  if (!payload.resource) throw new Error("微信支付回调缺少 resource。");
  return {
    id: payload.id,
    event_type: payload.event_type,
    resource_type: payload.resource_type,
    summary: payload.summary,
    trade: decryptResource(payload.resource),
    raw: payload,
  };
}
