#!/usr/bin/env node

import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.env.GITHUB_WORKSPACE ?? process.cwd());
const sourcePath = path.join(root, ".github", "scripts", "update-microsoft-learn.mjs");
const runtimePath = path.join(root, ".github", "scripts", ".update-microsoft-learn.runtime.mjs");

const oldBlock = `    const version = await waitForJson(\`http://127.0.0.1:\${port}/json/version\`, 10000);\n    const ws = new WebSocket(version.webSocketDebuggerUrl);`;
const newBlock = `    const targets = await waitForJson(\`http://127.0.0.1:\${port}/json/list\`, 10000);\n    const pageTarget = Array.isArray(targets) ? targets.find((target) => target?.type === "page" && target?.webSocketDebuggerUrl) : null;\n    if (!pageTarget) throw new Error("Chrome page DevTools target was not available");\n    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);`;

const source = await readFile(sourcePath, "utf8");
if (!source.includes(oldBlock)) {
  throw new Error("Microsoft Learn collector compatibility patch no longer matches the source script.");
}

await writeFile(runtimePath, source.replace(oldBlock, newBlock), "utf8");
try {
  await import(`${pathToFileURL(runtimePath).href}?run=${Date.now()}`);
} finally {
  await rm(runtimePath, { force: true });
}
