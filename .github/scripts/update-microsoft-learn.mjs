#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const PROFILE_URL = process.env.MS_LEARN_PROFILE_URL ?? "https://learn.microsoft.com/en-gb/users/marclevy/";
const ROOT = path.resolve(process.env.GITHUB_WORKSPACE ?? process.cwd());
const JSON_PATH = path.join(ROOT, "assets", "microsoft-learn.json");
const DESKTOP_PATH = path.join(ROOT, "assets", "microsoft-learn-desktop.svg");
const MOBILE_PATH = path.join(ROOT, "assets", "microsoft-learn-mobile.svg");

const bootstrap = {
  profileUrl: PROFILE_URL,
  level: 13,
  xp: 414000,
  badges: null,
  trophies: null,
  source: "bootstrap",
  updatedAt: null,
};

const existing = await readTrustedExisting();
const responses = await captureAchievementApiResponses();
const discovered = extractStructuredMetrics(responses);
const next = mergeMetrics(existing, discovered);

if (responses.length === 0) {
  console.warn("No Microsoft Learn achievement API responses were captured; retaining last trusted values.");
} else {
  console.log(`Captured ${responses.length} Microsoft Learn achievement API response(s).`);
  for (const item of responses) {
    const pathname = safePathname(item.url);
    const keys = item.data && typeof item.data === "object" && !Array.isArray(item.data)
      ? Object.keys(item.data).slice(0, 20).join(",")
      : typeof item.data;
    console.log(`Achievement API: ${pathname} | shape=${Array.isArray(item.data) ? `array(${item.data.length})` : keys}`);
  }
}

if (!hasAnyMetric(discovered)) {
  console.warn("No structured Microsoft Learn metric fields were found; retaining last trusted values.");
}

const changed = metricsChanged(existing, next) || !(await filesExist());
if (!changed) {
  console.log("Microsoft Learn metrics are unchanged.");
  process.exit(0);
}

next.source = hasAnyMetric(discovered) ? "learn.microsoft.com-achievements-api" : existing.source;
next.updatedAt = hasAnyMetric(discovered) ? new Date().toISOString() : existing.updatedAt;

await writeFile(JSON_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
await writeFile(DESKTOP_PATH, renderDesktop(next), "utf8");
await writeFile(MOBILE_PATH, renderMobile(next), "utf8");
console.log(`Microsoft Learn profile assets refreshed: level=${display(next.level)}, xp=${formatXp(next.xp)}, badges=${display(next.badges)}, trophies=${display(next.trophies)}.`);

async function readTrustedExisting() {
  try {
    const parsed = JSON.parse(await readFile(JSON_PATH, "utf8"));
    if (parsed?.source === "learn.microsoft.com-achievements-api") {
      return sanitizeMetrics({ ...bootstrap, ...parsed });
    }
  } catch {}
  return { ...bootstrap };
}

async function captureAchievementApiResponses() {
  const chrome = await findChrome();
  if (!chrome) {
    console.warn("Chrome was not found on the runner.");
    return [];
  }

  const port = 9222 + Math.floor(Math.random() * 500);
  const child = spawn(chrome, [
    `--remote-debugging-port=${port}`,
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--hide-scrollbars",
    "--window-size=1280,1400",
    "about:blank",
  ], { stdio: ["ignore", "ignore", "ignore"] });

  try {
    const version = await waitForJson(`http://127.0.0.1:${port}/json/version`, 10000);
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await once(ws, "open", 10000);

    let sequence = 0;
    const pending = new Map();
    const responseMeta = new Map();
    const collected = [];

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 10000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });

    ws.addEventListener("message", async (event) => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message.id) {
        const waiter = pending.get(message.id);
        if (!waiter) return;
        clearTimeout(waiter.timer);
        pending.delete(message.id);
        if (message.error) waiter.reject(new Error(message.error.message ?? "CDP error"));
        else waiter.resolve(message.result ?? {});
        return;
      }

      if (message.method === "Network.responseReceived") {
        const { requestId, response } = message.params ?? {};
        if (requestId && isAchievementApiUrl(response?.url) && response?.status >= 200 && response?.status < 300) {
          responseMeta.set(requestId, { url: response.url });
        }
      }

      if (message.method === "Network.loadingFinished") {
        const requestId = message.params?.requestId;
        const meta = responseMeta.get(requestId);
        if (!meta) return;
        responseMeta.delete(requestId);
        try {
          const body = await send("Network.getResponseBody", { requestId });
          const text = body.base64Encoded ? Buffer.from(body.body, "base64").toString("utf8") : body.body;
          const data = JSON.parse(text);
          collected.push({ url: meta.url, data });
        } catch (error) {
          console.warn(`Could not decode ${safePathname(meta.url)}: ${shortError(error)}`);
        }
      }
    });

    await send("Network.enable");
    await send("Page.enable");
    await send("Page.navigate", { url: PROFILE_URL });
    await sleep(15000);
    ws.close();
    return dedupeResponses(collected);
  } catch (error) {
    console.warn(`Microsoft Learn browser capture failed: ${shortError(error)}`);
    return [];
  } finally {
    child.kill("SIGTERM");
  }
}

function extractStructuredMetrics(responses) {
  const result = { level: null, xp: null, badges: null, trophies: null };

  for (const { url, data } of responses) {
    const endpoint = safePathname(url).toLowerCase();

    if (endpoint.includes("/achievements/xp/")) {
      if (Number.isSafeInteger(data) && data >= 0) result.xp ??= data;
      if (typeof data === "number" && Number.isFinite(data) && data >= 0) result.xp ??= Math.round(data);
    }

    const found = findExactMetricFields(data);
    result.level ??= found.level;
    result.xp ??= found.xp;
    result.badges ??= found.badges;
    result.trophies ??= found.trophies;

    if (endpoint.endsWith("/achievements") || endpoint.includes("/achievements?")) {
      const counted = countAchievementTypes(data);
      result.badges ??= counted.badges;
      result.trophies ??= counted.trophies;
    }
  }

  return sanitizeMetrics(result);
}

function findExactMetricFields(value) {
  const found = { level: null, xp: null, badges: null, trophies: null };
  const aliases = {
    level: new Set(["level", "currentlevel", "userlevel"]),
    xp: new Set(["xp", "totalxp", "experiencepoints", "totalexperiencepoints"]),
    badges: new Set(["badgecount", "badgescount", "totalbadges"]),
    trophies: new Set(["trophycount", "trophiescount", "totaltrophies"]),
  };

  const visit = (node, depth = 0) => {
    if (depth > 7 || node == null) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    if (typeof node !== "object") return;
    for (const [key, raw] of Object.entries(node)) {
      const normal = key.toLowerCase().replace(/[^a-z]/g, "");
      for (const [metric, names] of Object.entries(aliases)) {
        if (names.has(normal) && found[metric] == null) {
          const numeric = normalizeInteger(raw);
          if (numeric != null) found[metric] = numeric;
        }
      }
      visit(raw, depth + 1);
    }
  };
  visit(value);
  return found;
}

function countAchievementTypes(value) {
  let badges = 0;
  let trophies = 0;
  let typed = 0;
  const visit = (node, depth = 0) => {
    if (depth > 7 || node == null) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    if (typeof node !== "object") return;
    const typeValue = [node.type, node.achievementType, node.kind]
      .find((entry) => typeof entry === "string");
    if (typeValue) {
      const type = typeValue.toLowerCase();
      if (/\bbadge\b/.test(type)) { badges += 1; typed += 1; }
      else if (/\btrophy\b/.test(type)) { trophies += 1; typed += 1; }
    }
    for (const child of Object.values(node)) visit(child, depth + 1);
  };
  visit(value);
  return typed > 0 ? { badges, trophies } : { badges: null, trophies: null };
}

function sanitizeMetrics(value) {
  const out = { ...value };
  out.level = boundedInteger(out.level, 1, 100);
  out.xp = boundedInteger(out.xp, 0, 20_000_000);
  out.badges = boundedInteger(out.badges, 0, 20_000);
  out.trophies = boundedInteger(out.trophies, 0, 20_000);
  return out;
}

function boundedInteger(value, min, max) {
  const number = normalizeInteger(value);
  return number != null && number >= min && number <= max ? number : null;
}

function normalizeInteger(value) {
  if (Number.isSafeInteger(value)) return value;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value);
  if (typeof value === "string" && /^\s*\d[\d,]*\s*$/.test(value)) {
    const parsed = Number.parseInt(value.replace(/,/g, ""), 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
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

async function filesExist() {
  try {
    await Promise.all([JSON_PATH, DESKTOP_PATH, MOBILE_PATH].map((file) => access(file)));
    return true;
  } catch { return false; }
}

async function findChrome() {
  const candidates = [process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"].filter(Boolean);
  for (const candidate of candidates) {
    try { await access(candidate); return candidate; } catch {}
  }
  return null;
}

async function waitForJson(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch (error) { lastError = error; }
    await sleep(200);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

function once(target, eventName, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${eventName} timed out`)), timeoutMs);
    target.addEventListener(eventName, (event) => { clearTimeout(timer); resolve(event); }, { once: true });
  });
}

function dedupeResponses(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${safePathname(item.url)}:${JSON.stringify(item.data).slice(0, 300)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isAchievementApiUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "learn.microsoft.com" && parsed.pathname.toLowerCase().startsWith("/api/achievements");
  } catch { return false; }
}

function safePathname(url) {
  try { return new URL(url).pathname; } catch { return String(url); }
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function shortError(error) { return error instanceof Error ? error.message.split("\n")[0] : String(error); }

function formatXp(value) {
  if (!Number.isSafeInteger(value)) return "—";
  if (value >= 1_000_000) { const digits = value >= 10_000_000 ? 0 : 1; return `${(value / 1_000_000).toFixed(digits).replace(/\.0$/, "")}M`; }
  if (value >= 100_000) return `${Math.round(value / 1000)}K`;
  if (value >= 10_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return value.toLocaleString("en-GB");
}
function display(value) { return Number.isSafeInteger(value) ? value.toLocaleString("en-GB") : "—"; }

function renderDesktop(stats) {
  const level = display(stats.level), xp = formatXp(stats.xp), badges = display(stats.badges), trophies = display(stats.trophies);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="112" viewBox="0 0 1200 112" role="img" aria-labelledby="title description">
  <title id="title">Microsoft Learn progress</title><desc id="description">Level ${level}, ${xp} XP, ${badges} badges and ${trophies} trophies. View Microsoft Learn profile.</desc>
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#06182d"/><stop offset=".52" stop-color="#082e55"/><stop offset="1" stop-color="#05182b"/></linearGradient><linearGradient id="button" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#0d4067"/><stop offset="1" stop-color="#083050"/></linearGradient></defs>
  <rect x="1" y="1" width="1198" height="110" rx="20" fill="url(#bg)" stroke="#1676b6" stroke-width="2"/><rect x="1" y="1" width="1198" height="110" rx="20" fill="none" stroke="#4acfff" stroke-opacity=".12"/>
  <g transform="translate(32 31)"><rect width="18" height="18" fill="#f25022"/><rect x="21" width="18" height="18" fill="#7fba00"/><rect y="21" width="18" height="18" fill="#00a4ef"/><rect x="21" y="21" width="18" height="18" fill="#ffb900"/></g>
  <text x="88" y="43" fill="#ffffff" font-family="Segoe UI,Arial,sans-serif" font-size="17" font-weight="800" letter-spacing="1.3">MICROSOFT LEARN</text><text x="88" y="64" fill="#82b9dc" font-family="Segoe UI,Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1.4">CONTINUOUSLY LEARNING</text><text x="88" y="79" fill="#82b9dc" font-family="Segoe UI,Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1.4">A BRIGHTER TOMORROW</text>
  <g stroke="#285575" stroke-width="1"><path d="M278 25v62"/><path d="M428 25v62"/><path d="M586 25v62"/><path d="M744 25v62"/></g><g font-family="Segoe UI,Arial,sans-serif">
    <g transform="translate(305 31)"><rect x="0" y="20" width="5" height="16" rx="2" fill="#28c7ff"/><rect x="9" y="12" width="5" height="24" rx="2" fill="#28c7ff"/><rect x="18" y="4" width="5" height="32" rx="2" fill="#28c7ff"/></g><text x="348" y="43" fill="#b7d8ee" font-size="10" font-weight="800" letter-spacing="1">LEVEL</text><text x="348" y="73" fill="#ffffff" font-size="29" font-weight="800">${level}</text>
    <path d="M474 41l6 12 14 2-10 10 3 14-13-7-12 7 2-14-10-10 14-2z" fill="#28c7ff"/><text x="510" y="43" fill="#ffffff" font-size="27" font-weight="800">${xp}</text><text x="510" y="66" fill="#b7d8ee" font-size="10" font-weight="800" letter-spacing="1">XP</text>
    <circle cx="628" cy="53" r="13" fill="none" stroke="#28c7ff" stroke-width="5"/><circle cx="628" cy="53" r="3" fill="#28c7ff"/><path d="M621 66l-4 14 11-6 11 6-4-14" fill="#28c7ff"/><text x="664" y="43" fill="#ffffff" font-size="27" font-weight="800">${badges}</text><text x="664" y="66" fill="#b7d8ee" font-size="10" font-weight="800" letter-spacing="1">BADGES</text>
    <path d="M787 39h29v12c0 12-7 20-14 20s-15-8-15-20z" fill="#28c7ff"/><path d="M787 45h-9c0 12 7 18 15 18M816 45h9c0 12-7 18-15 18" fill="none" stroke="#28c7ff" stroke-width="4"/><rect x="798" y="70" width="8" height="8" fill="#28c7ff"/><rect x="790" y="78" width="24" height="5" rx="2" fill="#28c7ff"/><text x="840" y="43" fill="#ffffff" font-size="27" font-weight="800">${trophies}</text><text x="840" y="66" fill="#b7d8ee" font-size="10" font-weight="800" letter-spacing="1">TROPHIES</text>
  </g><rect x="973" y="29" width="195" height="54" rx="13" fill="url(#button)" stroke="#22c8ff" stroke-width="1.5"/><text x="1070" y="62" text-anchor="middle" fill="#42d8ff" font-family="Segoe UI,Arial,sans-serif" font-size="13" font-weight="800" letter-spacing=".5">VIEW LEARN PROFILE →</text></svg>\n`;
}

function renderMobile(stats) {
  const level = display(stats.level), xp = formatXp(stats.xp), badges = display(stats.badges), trophies = display(stats.trophies);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="216" viewBox="0 0 680 216" role="img" aria-labelledby="title description"><title id="title">Microsoft Learn progress</title><desc id="description">Level ${level}, ${xp} XP, ${badges} badges and ${trophies} trophies. View Microsoft Learn profile.</desc><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#06182d"/><stop offset=".58" stop-color="#082e55"/><stop offset="1" stop-color="#05182b"/></linearGradient></defs><rect x="1" y="1" width="678" height="214" rx="22" fill="url(#bg)" stroke="#1676b6" stroke-width="2"/><g transform="translate(28 24)"><rect width="18" height="18" fill="#f25022"/><rect x="21" width="18" height="18" fill="#7fba00"/><rect y="21" width="18" height="18" fill="#00a4ef"/><rect x="21" y="21" width="18" height="18" fill="#ffb900"/></g><text x="84" y="42" fill="#ffffff" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="800" letter-spacing="1.1">MICROSOFT LEARN</text><text x="84" y="64" fill="#82b9dc" font-family="Segoe UI,Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1.2">CONTINUOUSLY LEARNING · A BRIGHTER TOMORROW</text><path d="M28 85h624" stroke="#285575"/><g font-family="Segoe UI,Arial,sans-serif"><text x="44" y="111" fill="#8fbfdd" font-size="10" font-weight="800" letter-spacing="1">LEVEL</text><text x="44" y="141" fill="#ffffff" font-size="28" font-weight="800">${level}</text><text x="186" y="111" fill="#8fbfdd" font-size="10" font-weight="800" letter-spacing="1">XP</text><text x="186" y="141" fill="#ffffff" font-size="28" font-weight="800">${xp}</text><text x="334" y="111" fill="#8fbfdd" font-size="10" font-weight="800" letter-spacing="1">BADGES</text><text x="334" y="141" fill="#ffffff" font-size="28" font-weight="800">${badges}</text><text x="490" y="111" fill="#8fbfdd" font-size="10" font-weight="800" letter-spacing="1">TROPHIES</text><text x="490" y="141" fill="#ffffff" font-size="28" font-weight="800">${trophies}</text></g><rect x="28" y="163" width="624" height="36" rx="10" fill="#082b49" stroke="#22c8ff"/><text x="340" y="186" text-anchor="middle" fill="#42d8ff" font-family="Segoe UI,Arial,sans-serif" font-size="13" font-weight="800" letter-spacing=".5">VIEW MICROSOFT LEARN PROFILE →</text></svg>\n`;
}
