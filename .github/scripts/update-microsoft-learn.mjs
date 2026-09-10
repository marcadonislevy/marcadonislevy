#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const PROFILE_URL = process.env.MS_LEARN_PROFILE_URL ?? "https://learn.microsoft.com/en-gb/users/marclevy/";
const ROOT = path.resolve(process.env.GITHUB_WORKSPACE ?? process.cwd());
const JSON_PATH = path.join(ROOT, "assets", "microsoft-learn.json");
const DESKTOP_PATH = path.join(ROOT, "assets", "microsoft-learn-desktop.svg");
const MOBILE_PATH = path.join(ROOT, "assets", "microsoft-learn-mobile.svg");
const USER_AGENT = "Mozilla/5.0 (compatible; MarcLevyProfileBot/1.0; +https://github.com/marcadonislevy)";

const bootstrap = {
  profileUrl: PROFILE_URL,
  level: 13,
  xp: 414000,
  badges: null,
  trophies: null,
  source: "bootstrap",
  updatedAt: null,
};

const existing = await readExisting();
const discovered = await collectMetrics();
const next = mergeMetrics(existing, discovered);

if (!hasAnyMetric(discovered)) {
  console.warn("Microsoft Learn metrics were not discoverable during this run; retaining the last known values.");
}

const changed = metricsChanged(existing, next);
if (!changed && await filesExist()) {
  console.log("Microsoft Learn metrics are unchanged.");
  process.exit(0);
}

next.source = hasAnyMetric(discovered) ? "learn.microsoft.com-public-profile" : existing.source ?? bootstrap.source;
next.updatedAt = hasAnyMetric(discovered) ? new Date().toISOString() : existing.updatedAt ?? null;

await writeFile(JSON_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
await writeFile(DESKTOP_PATH, renderDesktop(next), "utf8");
await writeFile(MOBILE_PATH, renderMobile(next), "utf8");
console.log(`Microsoft Learn profile assets refreshed: level=${display(next.level)}, xp=${formatXp(next.xp)}, badges=${display(next.badges)}, trophies=${display(next.trophies)}.`);

async function collectMetrics() {
  const urls = [
    PROFILE_URL,
    new URL("achievements", ensureTrailingSlash(PROFILE_URL)).toString(),
  ];
  const texts = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-GB,en;q=0.9",
        },
        redirect: "follow",
      });
      if (response.ok) texts.push(stripHtml(await response.text()));
    } catch (error) {
      console.warn(`Direct Microsoft Learn fetch failed for ${url}: ${shortError(error)}`);
    }
  }

  let merged = extractMetrics(texts.join(" "));
  if (isComplete(merged)) return merged;

  const chrome = await findChrome();
  if (!chrome) {
    console.warn("A headless Chrome executable was not found; direct-profile results will be used.");
    return merged;
  }

  for (const url of urls) {
    try {
      const dom = execFileSync(
        chrome,
        [
          "--headless=new",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--no-sandbox",
          "--hide-scrollbars",
          "--window-size=1280,1400",
          "--virtual-time-budget=12000",
          "--dump-dom",
          url,
        ],
        {
          encoding: "utf8",
          timeout: 30000,
          maxBuffer: 20 * 1024 * 1024,
          env: { ...process.env, LANG: "en_GB.UTF-8" },
        },
      );
      texts.push(stripHtml(dom));
      merged = extractMetrics(texts.join(" "));
      if (isComplete(merged)) break;
    } catch (error) {
      console.warn(`Headless Microsoft Learn fetch failed for ${url}: ${shortError(error)}`);
    }
  }

  return merged;
}

function extractMetrics(text) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  return {
    level: firstInteger(clean, [
      /\bLevel\s*[:\-]?\s*(\d{1,3})\b/i,
      /\b(\d{1,3})\s+Level\b/i,
    ]),
    xp: firstScaledNumber(clean, [
      /\b([\d,.]+\s*[kKmM]?)\s*XP\b/i,
      /\bXP\s*[:\-]?\s*([\d,.]+\s*[kKmM]?)\b/i,
    ]),
    badges: firstInteger(clean, [
      /\b(\d{1,5})\s+Badges?\b/i,
      /\bBadges?\s*[:\-]?\s*(\d{1,5})\b/i,
    ]),
    trophies: firstInteger(clean, [
      /\b(\d{1,5})\s+Troph(?:y|ies)\b/i,
      /\bTroph(?:y|ies)\s*[:\-]?\s*(\d{1,5})\b/i,
    ]),
  };
}

function firstInteger(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number.parseInt(match[1], 10);
    if (Number.isSafeInteger(value) && value >= 0) return value;
  }
  return null;
}

function firstScaledNumber(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const raw = match[1].replace(/\s+/g, "").replace(/,/g, "");
    const suffix = raw.at(-1)?.toUpperCase();
    const scale = suffix === "K" ? 1000 : suffix === "M" ? 1_000_000 : 1;
    const numeric = Number.parseFloat(scale === 1 ? raw : raw.slice(0, -1));
    if (Number.isFinite(numeric) && numeric >= 0) return Math.round(numeric * scale);
  }
  return null;
}

function mergeMetrics(previous, current) {
  return {
    profileUrl: PROFILE_URL,
    level: current.level ?? previous.level ?? bootstrap.level,
    xp: current.xp ?? previous.xp ?? bootstrap.xp,
    badges: current.badges ?? previous.badges ?? bootstrap.badges,
    trophies: current.trophies ?? previous.trophies ?? bootstrap.trophies,
    source: previous.source ?? bootstrap.source,
    updatedAt: previous.updatedAt ?? bootstrap.updatedAt,
  };
}

function metricsChanged(previous, next) {
  return ["level", "xp", "badges", "trophies", "profileUrl"].some((key) => previous[key] !== next[key]);
}

function hasAnyMetric(value) {
  return ["level", "xp", "badges", "trophies"].some((key) => Number.isSafeInteger(value?.[key]));
}

function isComplete(value) {
  return ["level", "xp", "badges", "trophies"].every((key) => Number.isSafeInteger(value?.[key]));
}

async function readExisting() {
  try {
    const parsed = JSON.parse(await readFile(JSON_PATH, "utf8"));
    return { ...bootstrap, ...parsed };
  } catch {
    return { ...bootstrap };
  }
}

async function filesExist() {
  try {
    await Promise.all([JSON_PATH, DESKTOP_PATH, MOBILE_PATH].map((file) => access(file)));
    return true;
  } catch {
    return false;
  }
}

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }

  for (const command of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try {
      const resolved = execFileSync("bash", ["-lc", `command -v ${command}`], { encoding: "utf8" }).trim();
      if (resolved) return resolved;
    } catch {}
  }
  return null;
}

function stripHtml(html) {
  return String(html ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function formatXp(value) {
  if (!Number.isSafeInteger(value)) return "—";
  if (value >= 1_000_000) {
    const digits = value >= 10_000_000 ? 0 : 1;
    return `${(value / 1_000_000).toFixed(digits).replace(/\.0$/, "")}M`;
  }
  if (value >= 100_000) return `${Math.round(value / 1000)}K`;
  if (value >= 10_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return value.toLocaleString("en-GB");
}

function display(value) {
  return Number.isSafeInteger(value) ? value.toLocaleString("en-GB") : "—";
}

function renderDesktop(stats) {
  const level = display(stats.level);
  const xp = formatXp(stats.xp);
  const badges = display(stats.badges);
  const trophies = display(stats.trophies);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="112" viewBox="0 0 1200 112" role="img" aria-labelledby="title description">
  <title id="title">Microsoft Learn progress</title>
  <desc id="description">Level ${level}, ${xp} XP, ${badges} badges and ${trophies} trophies. View Microsoft Learn profile.</desc>
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#06182d"/><stop offset=".52" stop-color="#082e55"/><stop offset="1" stop-color="#05182b"/></linearGradient><linearGradient id="button" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#0d4067"/><stop offset="1" stop-color="#083050"/></linearGradient></defs>
  <rect x="1" y="1" width="1198" height="110" rx="20" fill="url(#bg)" stroke="#1676b6" stroke-width="2"/>
  <rect x="1" y="1" width="1198" height="110" rx="20" fill="none" stroke="#4acfff" stroke-opacity=".12"/>
  <g transform="translate(32 31)"><rect width="18" height="18" fill="#f25022"/><rect x="21" width="18" height="18" fill="#7fba00"/><rect y="21" width="18" height="18" fill="#00a4ef"/><rect x="21" y="21" width="18" height="18" fill="#ffb900"/></g>
  <text x="88" y="43" fill="#ffffff" font-family="Segoe UI,Arial,sans-serif" font-size="17" font-weight="800" letter-spacing="1.3">MICROSOFT LEARN</text>
  <text x="88" y="64" fill="#82b9dc" font-family="Segoe UI,Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1.4">CONTINUOUSLY LEARNING</text>
  <text x="88" y="79" fill="#82b9dc" font-family="Segoe UI,Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1.4">A BRIGHTER TOMORROW</text>
  <g stroke="#285575" stroke-width="1"><path d="M278 25v62"/><path d="M428 25v62"/><path d="M586 25v62"/><path d="M744 25v62"/></g>
  <g font-family="Segoe UI,Arial,sans-serif">
    <g transform="translate(305 31)"><rect x="0" y="20" width="5" height="16" rx="2" fill="#28c7ff"/><rect x="9" y="12" width="5" height="24" rx="2" fill="#28c7ff"/><rect x="18" y="4" width="5" height="32" rx="2" fill="#28c7ff"/></g>
    <text x="348" y="43" fill="#b7d8ee" font-size="10" font-weight="800" letter-spacing="1">LEVEL</text><text x="348" y="73" fill="#ffffff" font-size="29" font-weight="800">${level}</text>
    <path d="M474 41l6 12 14 2-10 10 3 14-13-7-12 7 2-14-10-10 14-2z" fill="#28c7ff"/>
    <text x="510" y="43" fill="#ffffff" font-size="27" font-weight="800">${xp}</text><text x="510" y="66" fill="#b7d8ee" font-size="10" font-weight="800" letter-spacing="1">XP</text>
    <circle cx="628" cy="53" r="13" fill="none" stroke="#28c7ff" stroke-width="5"/><circle cx="628" cy="53" r="3" fill="#28c7ff"/><path d="M621 66l-4 14 11-6 11 6-4-14" fill="#28c7ff"/>
    <text x="664" y="43" fill="#ffffff" font-size="27" font-weight="800">${badges}</text><text x="664" y="66" fill="#b7d8ee" font-size="10" font-weight="800" letter-spacing="1">BADGES</text>
    <path d="M787 39h29v12c0 12-7 20-14 20s-15-8-15-20z" fill="#28c7ff"/><path d="M787 45h-9c0 12 7 18 15 18M816 45h9c0 12-7 18-15 18" fill="none" stroke="#28c7ff" stroke-width="4"/><rect x="798" y="70" width="8" height="8" fill="#28c7ff"/><rect x="790" y="78" width="24" height="5" rx="2" fill="#28c7ff"/>
    <text x="840" y="43" fill="#ffffff" font-size="27" font-weight="800">${trophies}</text><text x="840" y="66" fill="#b7d8ee" font-size="10" font-weight="800" letter-spacing="1">TROPHIES</text>
  </g>
  <rect x="973" y="29" width="195" height="54" rx="13" fill="url(#button)" stroke="#22c8ff" stroke-width="1.5"/>
  <text x="1070" y="62" text-anchor="middle" fill="#42d8ff" font-family="Segoe UI,Arial,sans-serif" font-size="13" font-weight="800" letter-spacing=".5">VIEW LEARN PROFILE →</text>
</svg>\n`;
}

function renderMobile(stats) {
  const level = display(stats.level);
  const xp = formatXp(stats.xp);
  const badges = display(stats.badges);
  const trophies = display(stats.trophies);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="216" viewBox="0 0 680 216" role="img" aria-labelledby="title description">
  <title id="title">Microsoft Learn progress</title>
  <desc id="description">Level ${level}, ${xp} XP, ${badges} badges and ${trophies} trophies. View Microsoft Learn profile.</desc>
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#06182d"/><stop offset=".58" stop-color="#082e55"/><stop offset="1" stop-color="#05182b"/></linearGradient></defs>
  <rect x="1" y="1" width="678" height="214" rx="22" fill="url(#bg)" stroke="#1676b6" stroke-width="2"/>
  <g transform="translate(28 24)"><rect width="18" height="18" fill="#f25022"/><rect x="21" width="18" height="18" fill="#7fba00"/><rect y="21" width="18" height="18" fill="#00a4ef"/><rect x="21" y="21" width="18" height="18" fill="#ffb900"/></g>
  <text x="84" y="42" fill="#ffffff" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="800" letter-spacing="1.1">MICROSOFT LEARN</text>
  <text x="84" y="64" fill="#82b9dc" font-family="Segoe UI,Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1.2">CONTINUOUSLY LEARNING · A BRIGHTER TOMORROW</text>
  <path d="M28 85h624" stroke="#285575"/>
  <g font-family="Segoe UI,Arial,sans-serif">
    <text x="44" y="111" fill="#8fbfdd" font-size="10" font-weight="800" letter-spacing="1">LEVEL</text><text x="44" y="141" fill="#ffffff" font-size="28" font-weight="800">${level}</text>
    <text x="186" y="111" fill="#8fbfdd" font-size="10" font-weight="800" letter-spacing="1">XP</text><text x="186" y="141" fill="#ffffff" font-size="28" font-weight="800">${xp}</text>
    <text x="334" y="111" fill="#8fbfdd" font-size="10" font-weight="800" letter-spacing="1">BADGES</text><text x="334" y="141" fill="#ffffff" font-size="28" font-weight="800">${badges}</text>
    <text x="490" y="111" fill="#8fbfdd" font-size="10" font-weight="800" letter-spacing="1">TROPHIES</text><text x="490" y="141" fill="#ffffff" font-size="28" font-weight="800">${trophies}</text>
  </g>
  <rect x="28" y="163" width="624" height="36" rx="10" fill="#082b49" stroke="#22c8ff"/>
  <text x="340" y="186" text-anchor="middle" fill="#42d8ff" font-family="Segoe UI,Arial,sans-serif" font-size="13" font-weight="800" letter-spacing=".5">VIEW MICROSOFT LEARN PROFILE →</text>
</svg>\n`;
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function shortError(error) {
  return error instanceof Error ? error.message.split("\n")[0] : String(error);
}
