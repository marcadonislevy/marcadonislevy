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

const rendererBlock = `function renderDesktop(stats) {
  const level = display(stats.level), xp = formatXp(stats.xp), badges = display(stats.badges), trophies = display(stats.trophies);
  return \`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="98" viewBox="0 0 1200 98" role="img" aria-labelledby="title description">
  <title id="title">Microsoft Learn progress</title><desc id="description">Level \${level}, \${xp} XP, \${badges} badges and \${trophies} trophies. View Microsoft Learn profile.</desc>
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#03172c"/><stop offset=".5" stop-color="#052b50"/><stop offset="1" stop-color="#03182c"/></linearGradient><linearGradient id="button" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#052844"/><stop offset="1" stop-color="#031d33"/></linearGradient></defs>
  <rect x="1" y="1" width="1198" height="96" rx="16" fill="url(#bg)" stroke="#0a70aa" stroke-width="2"/><rect x="1" y="1" width="1198" height="96" rx="16" fill="none" stroke="#46d5ff" stroke-opacity=".11"/>
  <g transform="translate(35 27)"><rect width="18" height="18" fill="#f25022"/><rect x="21" width="18" height="18" fill="#7fba00"/><rect y="21" width="18" height="18" fill="#00a4ef"/><rect x="21" y="21" width="18" height="18" fill="#ffb900"/></g>
  <text x="94" y="57" fill="#ffffff" font-family="Segoe UI,Arial,sans-serif" font-size="22" font-weight="800" letter-spacing="1.1">MICROSOFT LEARN</text>
  <g stroke="#315a79" stroke-width="1"><path d="M297 20v58"/><path d="M463 20v58"/><path d="M625 20v58"/><path d="M790 20v58"/><path d="M955 20v58"/></g>
  <g font-family="Segoe UI,Arial,sans-serif" text-anchor="middle">
    <text x="380" y="48" fill="#ffffff" font-size="29" font-weight="800">\${level}</text><text x="380" y="69" fill="#d1e7f5" font-size="12" font-weight="800" letter-spacing="1">LEVEL</text>
    <text x="544" y="48" fill="#ffffff" font-size="29" font-weight="800">\${xp}</text><text x="544" y="69" fill="#d1e7f5" font-size="12" font-weight="800" letter-spacing="1">XP</text>
    <text x="707" y="48" fill="#ffffff" font-size="29" font-weight="800">\${badges}</text><text x="707" y="69" fill="#d1e7f5" font-size="12" font-weight="800" letter-spacing="1">BADGES</text>
    <text x="872" y="48" fill="#ffffff" font-size="29" font-weight="800">\${trophies}</text><text x="872" y="69" fill="#d1e7f5" font-size="12" font-weight="800" letter-spacing="1">TROPHIES</text>
  </g>
  <rect x="975" y="23" width="200" height="51" rx="12" fill="url(#button)" stroke="#19cfff" stroke-width="1.5"/><text x="1075" y="54" text-anchor="middle" fill="#35dbff" font-family="Segoe UI,Arial,sans-serif" font-size="13" font-weight="800" letter-spacing=".5">VIEW LEARN PROFILE →</text>
</svg>\\n\`;
}

function renderMobile(stats) {
  const level = display(stats.level), xp = formatXp(stats.xp), badges = display(stats.badges), trophies = display(stats.trophies);
  return \`<svg xmlns="http://www.w3.org/2000/svg" width="680" height="178" viewBox="0 0 680 178" role="img" aria-labelledby="title description">
  <title id="title">Microsoft Learn progress</title><desc id="description">Level \${level}, \${xp} XP, \${badges} badges and \${trophies} trophies. View Microsoft Learn profile.</desc>
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#03172c"/><stop offset=".58" stop-color="#052b50"/><stop offset="1" stop-color="#03182c"/></linearGradient></defs>
  <rect x="1" y="1" width="678" height="176" rx="18" fill="url(#bg)" stroke="#0a70aa" stroke-width="2"/>
  <g transform="translate(25 15)"><rect width="18" height="18" fill="#f25022"/><rect x="21" width="18" height="18" fill="#7fba00"/><rect y="21" width="18" height="18" fill="#00a4ef"/><rect x="21" y="21" width="18" height="18" fill="#ffb900"/></g>
  <text x="81" y="43" fill="#ffffff" font-family="Segoe UI,Arial,sans-serif" font-size="22" font-weight="800" letter-spacing="1.1">MICROSOFT LEARN</text>
  <path d="M25 64h630" stroke="#315a79"/>
  <g font-family="Segoe UI,Arial,sans-serif" text-anchor="middle">
    <text x="103" y="101" fill="#ffffff" font-size="27" font-weight="800">\${level}</text><text x="103" y="122" fill="#d1e7f5" font-size="11" font-weight="800" letter-spacing="1">LEVEL</text>
    <text x="260" y="101" fill="#ffffff" font-size="27" font-weight="800">\${xp}</text><text x="260" y="122" fill="#d1e7f5" font-size="11" font-weight="800" letter-spacing="1">XP</text>
    <text x="417" y="101" fill="#ffffff" font-size="27" font-weight="800">\${badges}</text><text x="417" y="122" fill="#d1e7f5" font-size="11" font-weight="800" letter-spacing="1">BADGES</text>
    <text x="574" y="101" fill="#ffffff" font-size="27" font-weight="800">\${trophies}</text><text x="574" y="122" fill="#d1e7f5" font-size="11" font-weight="800" letter-spacing="1">TROPHIES</text>
  </g>
  <rect x="25" y="138" width="630" height="28" rx="9" fill="#031d33" stroke="#19cfff"/><text x="340" y="157" text-anchor="middle" fill="#35dbff" font-family="Segoe UI,Arial,sans-serif" font-size="12" font-weight="800" letter-spacing=".5">VIEW MICROSOFT LEARN PROFILE →</text>
</svg>\\n\`;
}
`;

const source = await readFile(sourcePath, "utf8");
const renderStart = source.indexOf("function renderDesktop(stats) {");
if (!source.includes(oldBlock) || !source.includes(oldType) || !source.includes(oldClassification) || renderStart < 0) {
  throw new Error("Microsoft Learn collector compatibility patch no longer matches the source script.");
}

const sourceWithCleanRenderers = source.slice(0, renderStart) + rendererBlock;
const patched = sourceWithCleanRenderers
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
