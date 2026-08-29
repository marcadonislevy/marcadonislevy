#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

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

export async function verifyPublicOutput(root = profileRoot, denylist = process.env.PROFILE_DENYLIST) {
  const required = [
    "README.md",
    "assets/profile-light.svg",
    "assets/profile-dark.svg",
    "assets/stats.json",
  ];
  const errors = [];

  for (const relativePath of required) {
    try {
      const details = await stat(path.join(root, relativePath));
      if (!details.isFile() || details.size === 0) errors.push(`${relativePath} is empty.`);
    } catch {
      errors.push(`${relativePath} is missing.`);
    }
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));

  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const light = await readFile(path.join(root, "assets/profile-light.svg"), "utf8");
  const dark = await readFile(path.join(root, "assets/profile-dark.svg"), "utf8");
  const statsText = await readFile(path.join(root, "assets/stats.json"), "utf8");
  const publicFiles = [
    ["README.md", readme],
    ["assets/profile-light.svg", light],
    ["assets/profile-dark.svg", dark],
    ["assets/stats.json", statsText],
  ];

  if (!readme.includes("prefers-color-scheme: dark") || !readme.includes("profile-light.svg")) {
    errors.push("README.md does not provide both themes.");
  }
  if (!light.startsWith("<svg") || !dark.startsWith("<svg")) {
    errors.push("One or more profile graphics is not a valid SVG document.");
  }
  if (light === dark) errors.push("Light and dark profile graphics are identical.");
  if (!/#ffffff/i.test(light)) errors.push("Light profile graphic does not use the approved light background.");
  if (!/#06131f/i.test(dark)) errors.push("Dark profile graphic does not use the approved dark background.");

  const forbiddenPatterns = [
    ...visibleForbidden.map(makePattern),
    ...parseList(denylist).map(makePattern),
  ];
  const repositoryUrl = /github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i;
  const credential = /(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]+ PRIVATE KEY-----)/;
  const placeholder = /\b(?:AWAITING|PENDING|PLACEHOLDER|DEMO)\b/i;

  for (const [fileName, content] of publicFiles) {
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) errors.push(`${fileName} contains forbidden public text.`);
    }
    if (repositoryUrl.test(content)) errors.push(`${fileName} contains a repository URL.`);
    if (credential.test(content)) errors.push(`${fileName} contains credential-shaped material.`);
    if (placeholder.test(content)) errors.push(`${fileName} contains a placeholder value.`);
  }

  let stats;
  try {
    stats = JSON.parse(statsText);
  } catch {
    errors.push("assets/stats.json is not valid JSON.");
  }
  if (stats) validatePublishedStats(stats, errors);

  if (errors.length > 0) throw new Error(errors.join("\n"));
  return { files: required.length };
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
  if (!Array.isArray(stats.contributions?.last365Days) || stats.contributions.last365Days.length !== 365) {
    errors.push("Published contribution history does not contain 365 days.");
  }
  if (Object.hasOwn(stats.repositories ?? {}, "private") || Object.hasOwn(stats.repositories ?? {}, "public")) {
    errors.push("Published statistics contain a repository visibility breakdown.");
  }
}

function makePattern(value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return /^[A-Z0-9]{2,10}$/.test(value)
    ? new RegExp(`\\b${escaped}\\b`, "i")
    : new RegExp(escaped, "i");
}

function parseList(value) {
  return [...new Set(String(value ?? "").split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean))];
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  verifyPublicOutput()
    .then(({ files }) => console.log(`Verified ${files} public profile files.`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
