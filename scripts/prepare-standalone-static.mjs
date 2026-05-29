import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const standaloneRoot = join(root, ".next", "standalone");

await mkdir(join(standaloneRoot, ".next"), { recursive: true });
await rm(join(standaloneRoot, ".next", "static"), { recursive: true, force: true });
await cp(join(root, ".next", "static"), join(standaloneRoot, ".next", "static"), { recursive: true });
await rm(join(standaloneRoot, "public"), { recursive: true, force: true });
await cp(join(root, "public"), join(standaloneRoot, "public"), { recursive: true });

console.log("Copied .next/static and public into .next/standalone.");
