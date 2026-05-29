import { UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const username = (process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const email = process.env.ADMIN_EMAIL || null;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.log("ADMIN_USERNAME or ADMIN_PASSWORD missing; skip admin seed.");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin ${username} already exists.`);
    return;
  }

  await prisma.user.create({
    data: {
      username,
      email,
      name: "Aiyes Admin",
      role: UserRole.ADMIN,
      passwordHash: await hash(password, 12),
      balanceCents: 0,
    },
  });
  console.log(`Created admin ${username}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
