import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { nanoid } from "nanoid";

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function createPlatformApiKey() {
  const secret = `${nanoid(24)}${randomBytes(18).toString("base64url")}`;
  const plain = `ak_${secret}`;
  return {
    plain,
    prefix: plain.slice(0, 10),
    last4: plain.slice(-4),
    hash: sha256(plain),
  };
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
