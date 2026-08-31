#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { RESPONSIVE_ASSET_NAMES } from "./render-profile.mjs";

const modulePath = fileURLToPath(import.meta.url);
const profileRoot = path.resolve(path.dirname(modulePath), "..");

const visibleForbidden = [
  "Equitable Journeys",
  "private repository",
  "private repositories",
  "confidential research",
  "repository identities",
  "generated from GitHub API",
  "GitHub API",
  "anonymous totals",
  "authorised private",
  "authorized private",
  "counts may include",
  "public work is named",
  "private research remains unnamed",
  "no private names",
];

const requiredVisible = [
  "Marc Levy",
  "@marcadonislevy",
  "Portfolio-first",
  "AI systems",
  "Hosting & edge",
  "Open to collaborate",
  "Public-interest tech",
  "AI & Intelligent Systems",
  "Websites & Digital Experiences",
  "Web Applications & SaaS",
  "APIs, MCP Servers & Plugins",
  "Hosting & Edge Platforms",
  "Data & Backend Systems",
  "Workflow & Automation",
  "Public-interest Technology",
  "Applied R&D",
  "Technology ecosystem",
  "GitHub activity",
  "What I build",
  "Community and social-impact technology",
];

const README_ASSET_ORDER = [
  "profile-mobile-dark.svg",
  "profile-mobile-light.svg",
  "profile-compact-dark.svg",
  "profile-compact-light.svg",
  "profile-desktop-dark.svg",
  "profile-desktop-light.svg",
];

export async function verifyPublicOutput(root = profileRoot, denylist = process.env.PROFILE_DENYLIST) {
  const required = [
    "README.md",
    ...RESPONSIVE_ASSET_NAMES.map((name) => path.join("assets", name)),
    "assets/stats.json",
  ];
  const errors = [];
  for (const relativePath of required) {
    try {
      const details = await stat(path.join(root, relativePath));
      if (!details.isFile() || details.size === 0) errors.push(relativePath + " is empty.");
    } catch {
      errors.push(relativePath + " is missing.");
    }
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));

  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const statsText = await readFile(path.join(root, "assets", "stats.json"), "utf8");
  const assets = await Promise.all(
    RESPONSIVE_ASSET_NAMES.map(async (name) => [
      name,
      await readFile(path.join(root, "assets", name), "utf8"),
    ]),
  );
  const publicFiles = [
    ["README.md", readme],
    ...assets.map(([name, content]) => [`assets/${name}`, content]),
    ["assets/stats.json", statsText],
  ];

  let cursor = -1;
  for (const name of README_ASSET_ORDER) {
    const next = readme.indexOf(name);
    if (next <= cursor) errors.push("README.md is missing or misorders " + name + ".");
    cursor = next;
  }
  if (!readme.includes("prefers-color-scheme: dark") || !readme.includes("max-width: 767px")) {
    errors.push("README.md is not viewport and theme aware.");
  }
  if (/profile-(?:light|dark)\.svg/.test(readme)) {
    errors.push("README.md still references a legacy single-layout asset.");
  }

  const expectedWidths = {
    desktop: 600,
    compact: 560,
    mobile: 360,
  };
  for (const [name, svg] of assets) {
    if (!svg.startsWith("<svg")) errors.push(name + " is not an SVG document.");
    const variant = name.match(/profile-(desktop|compact|mobile)-/)?.[1];
    const expectedWidth = expectedWidths[variant];
    if (!svg.includes(`width="${expectedWidth}"`) || !svg.includes(`viewBox="0 0 ${expectedWidth} `)) {
      errors.push(name + " does not use its native responsive width.");
    }
    if (name.includes("-dark") && !/#06131f/i.test(svg)) {
      errors.push(name + " does not use the approved dark background.");
    }
    if (name.includes("-light") && !/#ffffff/i.test(svg)) {
      errors.push(name + " does not use the approved light background.");
    }
    const visible = extractVisibleText(svg);
    for (const value of requiredVisible) {
      if (!visible.includes(value)) errors.push(name + " is missing approved content: " + value + ".");
    }
    if (!visible.includes("Total")) errors.push(name + " is missing the approved Total note.");
    if (/\bDetected\b/i.test(visible)) errors.push(name + " contains the removed Detected note.");
  }

  const forbiddenPatterns = [
    ...visibleForbidden.map(makePattern),
    ...parseList(denylist).map(makePattern),
  ];
  const repositoryUrl = /github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i;
  const credential = /(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]+ PRIVATE KEY-----)/;
  const placeholder = /\b(?:AWAITING|PENDING|PLACEHOLDER|DEMO)\b/i;
  for (const [fileName, content] of publicFiles) {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) errors.push(fileName + " contains forbidden public text.");
    }
    if (repositoryUrl.test(content)) errors.push(fileName + " contains a repository URL.");
    if (credential.test(content)) errors.push(fileName + " contains credential-shaped material.");
    if (placeholder.test(content)) errors.push(fileName + " contains a placeholder value.");
  }

  let stats;
  try {
    stats = JSON.parse(statsText);
  } catch {
    errors.push("assets/stats.json is not valid JSON.");
  }
  if (stats) {
    validatePublishedStats(stats, errors);
    const issueValues = [
      Number(stats.issues?.authored).toLocaleString("en-US"),
      Number(stats.issues?.open).toLocaleString("en-US") + " open",
      Number(stats.issues?.closed).toLocaleString("en-US") + " closed",
    ];
    for (const [name, svg] of assets) {
      const visible = extractVisibleText(svg);
      for (const value of issueValues) {
        if (!visible.includes(value)) errors.push(name + " does not contain issue value " + value + ".");
      }
    }
  }

  if (errors.length > 0) throw new Error(errors.join("\n"));
  return { files: required.length, assets: RESPONSIVE_ASSET_NAMES.length };
}

function validatePublishedStats(stats, errors) {
  if (stats.source !== "github-api") errors.push("Published statistics do not have the required source state.");
  if (!stats.generatedAt || Number.isNaN(Date.parse(stats.generatedAt))) {
    errors.push("Published statistics do not have a valid timestamp.");
  }
  const counts = [
    stats.contributions?.total,
    stats.contributions?.commits,
    stats.pullRequests?.authored,
    stats.pullRequests?.open,
    stats.pullRequests?.closed,
    stats.pullRequests?.merged,
    stats.pullRequests?.closedUnmerged,
    stats.pullRequests?.reviewed,
    stats.issues?.authored,
    stats.issues?.open,
    stats.issues?.closed,
    stats.repositories?.total,
    stats.stars?.total,
    stats.languages?.detectedCount,
  ];
  if (counts.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    errors.push("Published statistics contain an invalid count.");
  }
  if (stats.pullRequests?.authored !== stats.pullRequests?.open + stats.pullRequests?.closed) {
    errors.push("Published pull-request totals do not reconcile.");
  }
  if (stats.pullRequests?.closed !== stats.pullRequests?.merged + stats.pullRequests?.closedUnmerged) {
    errors.push("Published closed pull-request totals do not reconcile.");
  }
  if (stats.issues?.authored !== stats.issues?.open + stats.issues?.closed) {
    errors.push("Published issue totals do not reconcile.");
  }
  const days = stats.contributions?.last365Days;
  if (!Array.isArray(days) || days.length !== 365) {
    errors.push("Published contribution history does not contain 365 days.");
  } else {
    const levels = new Set(["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"]);
    if (days.some((day) => !levels.has(day.level))) {
      errors.push("Published contribution history does not contain GitHub contribution levels.");
    }
  }
  if (Object.hasOwn(stats.repositories ?? {}, "private") || Object.hasOwn(stats.repositories ?? {}, "public")) {
    errors.push("Published statistics contain a repository visibility breakdown.");
  }
}

function extractVisibleText(svg) {
  return svg
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

function makePattern(value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return /^[A-Z0-9]{2,10}$/.test(value)
    ? new RegExp(`\\b${escaped}\\b`, "i")
    : new RegExp(escaped, "i");
}

function parseList(value) {
  return [...new Set(
    String(value ?? "")
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean),
  )];
}

function cliRoot() {
  const index = process.argv.indexOf("--root");
  if (index < 0) return profileRoot;
  const value = process.argv[index + 1];
  if (!value) throw new Error("--root requires a directory.");
  return path.resolve(value);
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  verifyPublicOutput(cliRoot())
    .then(({ files, assets }) => {
      console.log(`Verified ${files} public profile files, including ${assets} responsive assets.`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
