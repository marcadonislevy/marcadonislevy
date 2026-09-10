#!/usr/bin/env node

import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.env.GITHUB_WORKSPACE ?? process.cwd());
const sourcePath = path.join(root, ".github", "scripts", "update-microsoft-learn.mjs");
const runtimePath = path.join(root, ".github", "scripts", ".update-microsoft-learn.runtime.mjs");

const oldBlock = `    const version = await waitForJson(\`http://127.0.0.1:\${port}/json/version\`, 10000);\n    const ws = new WebSocket(version.webSocketDebuggerUrl);`;
const newBlock = `    const targets = await waitForJson(\`http://127.0.0.1:\${port}/json/list\`, 10000);\n    const pageTarget = Array.isArray(targets) ? targets.find((target) => target?.type === "page" && target?.webSocketDebuggerUrl) : null;\n    if (!pageTarget) throw new Error("Chrome page DevTools target was not available");\n    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);`;

const oldType = `    const typeValue = [node.type, node.achievementType, node.kind]\n      .find((entry) => typeof entry === "string");`;
const newType = `    const typeValue = [node.category, node.type, node.achievementType, node.kind]\n      .find((entry) => typeof entry === "string");`;
const oldClassification = `      if (/\\bbadge\\b/.test(type)) { badges += 1; typed += 1; }\n      else if (/\\btrophy\\b/.test(type)) { trophies += 1; typed += 1; }`;
const newClassification = `      if (/^(module|modules|badge)$/.test(type)) { badges += 1; typed += 1; }\n      else if (/^(learningpath|learningpaths|trophy|trophies)$/.test(type)) { trophies += 1; typed += 1; }`;

const oldLog = `    console.log(\`Achievement API: \${pathname} | shape=\${Array.isArray(item.data) ? \`array(\${item.data.length})\` : keys}\`);`;
const newLog = `${oldLog}\n    if (Array.isArray(item.data?.achievements)) {\n      const categories = item.data.achievements.reduce((counts, achievement) => {\n        const category = String(achievement?.category ?? "unknown").toLowerCase();\n        counts[category] = (counts[category] ?? 0) + 1;\n        return counts;\n      }, {});\n      console.log(\`Achievement API totalCount: \${item.data.totalCount ?? "unknown"} | categories=\${JSON.stringify(categories)}\`);\n    }`;

const source = await readFile(sourcePath, "utf8");
if (!source.includes(oldBlock) || !source.includes(oldType) || !source.includes(oldClassification)) {
  throw new Error("Microsoft Learn collector compatibility patch no longer matches the source script.");
}

const patched = source
  .replace(oldBlock, newBlock)
  .replace(oldType, newType)
  .replace(oldClassification, newClassification)
  .replace(oldLog, newLog);

await writeFile(runtimePath, patched, "utf8");
try {
  await import(`${pathToFileURL(runtimePath).href}?run=${Date.now()}`);
} finally {
  await rm(runtimePath, { force: true });
}
