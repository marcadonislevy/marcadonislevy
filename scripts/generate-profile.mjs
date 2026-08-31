#!/usr/bin/env node

import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { RESPONSIVE_ASSET_NAMES, renderAllProfiles } from "./render-profile.mjs";
import { validateStats } from "./stats-policy.mjs";

const API_VERSION = "2022-11-28";
const modulePath = fileURLToPath(import.meta.url);
const profileRoot = path.resolve(path.dirname(modulePath), "..");

export async function generateFromStats(stats, outputDirectory = profileRoot) {
  validateStats(stats);
  const outputs = renderAllProfiles(stats);
  const template = await readFile(path.join(profileRoot, "README.template.md"), "utf8");
  assertGeneratedContent(template, outputs);

  await mkdir(outputDirectory, { recursive: true });
  const staging = await mkdtemp(path.join(outputDirectory, ".profile-build-"));
  const stagingAssets = path.join(staging, "assets");
  await mkdir(stagingAssets, { recursive: true });

  try {
    await Promise.all([
      ...Object.entries(outputs).map(([name, result]) => (
        writeFile(path.join(stagingAssets, name), result.svg, "utf8")
      )),
      writeFile(
        path.join(stagingAssets, "stats.json"),
        `${JSON.stringify(toPublicSnapshot(stats), null, 2)}\n`,
        "utf8",
      ),
      writeFile(path.join(staging, "README.md"), template, "utf8"),
    ]);

    const outputAssets = path.join(outputDirectory, "assets");
    await mkdir(outputAssets, { recursive: true });
    for (const name of RESPONSIVE_ASSET_NAMES) {
      await rename(path.join(stagingAssets, name), path.join(outputAssets, name));
    }
    await rename(path.join(stagingAssets, "stats.json"), path.join(outputAssets, "stats.json"));
    await rename(path.join(staging, "README.md"), path.join(outputDirectory, "README.md"));
    await Promise.all([
      rm(path.join(outputAssets, "profile-light.svg"), { force: true }),
      rm(path.join(outputAssets, "profile-dark.svg"), { force: true }),
    ]);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return outputs;
}

export async function collectStats({
  login,
  token,
  ownerLogins = [login],
  fetchImpl = fetch,
  now = new Date(),
  restUrl = "https://api.github.com",
  graphqlUrl = "https://api.github.com/graphql",
}) {
  if (!login || typeof login !== "string") throw new Error("A GitHub login is required.");
  if (!token || typeof token !== "string") throw new Error("A GitHub token is required.");
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("A valid collection time is required.");
  }

  const owners = new Set(
    [...ownerLogins, login]
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean),
  );
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": `${login}-profile-metrics`,
  };

  const accountData = await fetchGraphql({
    fetchImpl,
    graphqlUrl,
    token,
    label: "account metadata",
    query: `
      query ProfileAccount($login: String!) {
        user(login: $login) { createdAt }
      }
    `,
    variables: { login },
  });
  const createdAt = accountData?.user?.createdAt;
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
    throw new Error("GitHub account metadata was unavailable.");
  }

  const pullRequestQueries = {
    authored: `author:${login} is:pr`,
    open: `author:${login} is:pr is:open`,
    closed: `author:${login} is:pr is:closed`,
    merged: `author:${login} is:pr is:merged`,
    closedUnmerged: `author:${login} is:pr is:closed is:unmerged`,
    reviewed: `reviewed-by:${login} is:pr`,
  };

  const [pullRequests, commits, contributions, repositories] = await Promise.all([
    fetchSearchCounts(pullRequestQueries, { fetchImpl, restUrl, headers }),
    fetchCommitCount(login, { fetchImpl, restUrl, headers }),
    collectContributionHistory({ login, token, createdAt, now, fetchImpl, graphqlUrl }),
    collectRepositoryAggregates({ token, owners, fetchImpl, graphqlUrl }),
  ]);

  return validateStats({
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    source: "github-api",
    contributions: {
      total: contributions.total,
      commits,
      last365Days: contributions.last365Days,
    },
    pullRequests,
    issues: repositories.issues,
    repositories: repositories.repositories,
    stars: { total: repositories.stars },
    languages: repositories.languages,
  });
}

async function fetchSearchCounts(queries, context) {
  const entries = await Promise.all(
    Object.entries(queries).map(async ([key, query]) => [
      key,
      await fetchSearchCount(query, context),
    ]),
  );
  return Object.fromEntries(entries);
}

async function fetchSearchCount(query, { fetchImpl, restUrl, headers }) {
  const url = `${restUrl.replace(/\/$/, "")}/search/issues?q=${encodeURIComponent(query)}&per_page=1`;
  const data = await fetchJson(fetchImpl, url, { headers }, "GitHub activity search");
  if (!Number.isSafeInteger(data.total_count) || data.total_count < 0) {
    throw new Error("GitHub activity search returned an invalid count.");
  }
  return data.total_count;
}

async function fetchCommitCount(login, { fetchImpl, restUrl, headers }) {
  const query = encodeURIComponent(`author:${login}`);
  const url = `${restUrl.replace(/\/$/, "")}/search/commits?q=${query}&per_page=1`;
  const data = await fetchJson(fetchImpl, url, { headers }, "GitHub commit search");
  if (!Number.isSafeInteger(data.total_count) || data.total_count < 0) {
    throw new Error("GitHub commit search returned an invalid count.");
  }
  return data.total_count;
}

async function collectContributionHistory({
  login,
  token,
  createdAt,
  now,
  fetchImpl,
  graphqlUrl,
}) {
  const start = startOfUtcDay(new Date(createdAt));
  const endExclusive = addUtcDays(startOfUtcDay(now), 1);
  if (start >= endExclusive) throw new Error("GitHub account creation date is invalid.");

  const allDays = new Map();
  for (
    let windowStart = start;
    windowStart < endExclusive;
    windowStart = addUtcDays(windowStart, 180)
  ) {
    const windowEndExclusive = minDate(addUtcDays(windowStart, 180), endExclusive);
    const data = await fetchGraphql({
      fetchImpl,
      graphqlUrl,
      token,
      label: "contribution history",
      query: `
        query ContributionWindow($login: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                weeks {
                  contributionDays { date contributionCount contributionLevel }
                }
              }
            }
          }
        }
      `,
      variables: {
        login,
        from: windowStart.toISOString(),
        to: new Date(windowEndExclusive.getTime() - 1).toISOString(),
      },
    });
    const calendar = data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar) throw new Error("GitHub contribution history was unavailable.");
    collectCalendarDays(calendar, allDays);
  }

  const recentStart = addUtcDays(startOfUtcDay(now), -364);
  const recentData = await fetchGraphql({
    fetchImpl,
    graphqlUrl,
    token,
    label: "recent contribution levels",
    query: `
      query RecentContributionCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              weeks {
                contributionDays { date contributionCount contributionLevel }
              }
            }
          }
        }
      }
    `,
    variables: {
      login,
      from: recentStart.toISOString(),
      to: new Date(endExclusive.getTime() - 1).toISOString(),
    },
  });
  const recentCalendar = recentData?.user?.contributionsCollection?.contributionCalendar;
  if (!recentCalendar) throw new Error("GitHub recent contribution levels were unavailable.");
  const recentDays = new Map();
  collectCalendarDays(recentCalendar, recentDays);

  const total = [...allDays.values()].reduce((sum, day) => sum + day.count, 0);
  const last365Days = [];
  for (let index = 0; index < 365; index += 1) {
    const date = addUtcDays(recentStart, index).toISOString().slice(0, 10);
    const day = recentDays.get(date) ?? allDays.get(date) ?? { count: 0, level: "NONE" };
    last365Days.push({
      date,
      count: day.count,
      level: day.level,
    });
  }
  return { total, last365Days };
}

function collectCalendarDays(calendar, target) {
  for (const week of calendar.weeks ?? []) {
    for (const day of week.contributionDays ?? []) {
      if (
        typeof day.date !== "string"
        || !Number.isSafeInteger(day.contributionCount)
        || day.contributionCount < 0
      ) {
        continue;
      }
      target.set(day.date, {
        count: day.contributionCount,
        level: normaliseLevel(day.contributionLevel, day.contributionCount),
      });
    }
  }
}

function normaliseLevel(level, count) {
  const allowed = new Set([
    "NONE",
    "FIRST_QUARTILE",
    "SECOND_QUARTILE",
    "THIRD_QUARTILE",
    "FOURTH_QUARTILE",
  ]);
  if (allowed.has(level)) return level;
  if (count <= 0) return "NONE";
  if (count <= 2) return "FIRST_QUARTILE";
  if (count <= 5) return "SECOND_QUARTILE";
  if (count <= 9) return "THIRD_QUARTILE";
  return "FOURTH_QUARTILE";
}

async function collectRepositoryAggregates({ token, owners, fetchImpl, graphqlUrl }) {
  const languageBytes = new Map();
  const repositories = { total: 0, public: 0, private: 0 };
  const issues = { authored: 0, open: 0, closed: 0 };
  let stars = 0;
  let after = null;

  do {
    const data = await fetchGraphql({
      fetchImpl,
      graphqlUrl,
      token,
      label: "repository aggregate",
      query: `
        query RepositoryAggregate($after: String) {
          viewer {
            repositories(
              first: 50
              after: $after
              affiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR]
              ownerAffiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR]
              orderBy: { field: UPDATED_AT, direction: DESC }
            ) {
              nodes {
                isPrivate
                isFork
                stargazerCount
                owner { login }
                openIssues: issues(states: [OPEN]) { totalCount }
                closedIssues: issues(states: [CLOSED]) { totalCount }
                languages(first: 100, orderBy: { field: SIZE, direction: DESC }) {
                  edges { size node { name } }
                }
              }
              pageInfo { endCursor hasNextPage }
            }
          }
        }
      `,
      variables: { after },
    });
    const connection = data?.viewer?.repositories;
    if (!connection || !Array.isArray(connection.nodes)) {
      throw new Error("GitHub repository aggregate was unavailable.");
    }

    for (const repository of connection.nodes) {
      const owner = repository.owner?.login?.toLowerCase();
      if (!owner || !owners.has(owner)) continue;
      const open = repository.openIssues?.totalCount;
      const closed = repository.closedIssues?.totalCount;
      if (!Number.isSafeInteger(open) || open < 0 || !Number.isSafeInteger(closed) || closed < 0) {
        throw new Error("GitHub repository aggregate returned invalid issue totals.");
      }

      repositories.total += 1;
      if (repository.isPrivate) repositories.private += 1;
      else repositories.public += 1;
      issues.open += open;
      issues.closed += closed;

      if (!repository.isPrivate && !repository.isFork) {
        stars += Number.isSafeInteger(repository.stargazerCount) ? repository.stargazerCount : 0;
      }
      if (!repository.isFork) {
        for (const edge of repository.languages?.edges ?? []) {
          const language = edge.node?.name;
          const size = edge.size;
          if (typeof language === "string" && Number.isFinite(size) && size > 0) {
            languageBytes.set(language, (languageBytes.get(language) ?? 0) + size);
          }
        }
      }
    }

    after = connection.pageInfo?.hasNextPage ? connection.pageInfo.endCursor : null;
    if (connection.pageInfo?.hasNextPage && !after) {
      throw new Error("GitHub repository aggregate did not return its next cursor.");
    }
  } while (after);

  issues.authored = issues.open + issues.closed;
  const top = [...languageBytes.entries()]
    .map(([name, bytes]) => ({ name, bytes }))
    .sort((a, b) => b.bytes - a.bytes);
  return {
    repositories,
    issues,
    stars,
    languages: {
      detectedCount: top.length,
      top: top.slice(0, 12),
    },
  };
}

async function fetchGraphql({ fetchImpl, graphqlUrl, token, label, query, variables }) {
  const data = await fetchJson(
    fetchImpl,
    graphqlUrl,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "marcadonislevy-profile-metrics",
      },
      body: JSON.stringify({ query, variables }),
    },
    label,
  );
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    throw new Error(label + " returned a GraphQL error.");
  }
  return data.data;
}

async function fetchJson(fetchImpl, url, options, label) {
  const response = await fetchImpl(url, options);
  if (!response?.ok) {
    throw new Error(`${label} failed with HTTP ${response?.status ?? "unknown"}.`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(label + " returned invalid JSON.");
  }
}

function toPublicSnapshot(stats) {
  return {
    schemaVersion: stats.schemaVersion,
    generatedAt: stats.generatedAt,
    source: stats.source,
    contributions: stats.contributions,
    pullRequests: stats.pullRequests,
    issues: stats.issues,
    repositories: { total: stats.repositories.total },
    stars: stats.stars,
    languages: stats.languages,
  };
}

function assertGeneratedContent(template, outputs) {
  for (const name of RESPONSIVE_ASSET_NAMES) {
    if (!template.includes(name)) throw new Error("README template is missing " + name + ".");
    const svg = outputs[name]?.svg;
    if (!svg?.startsWith("<svg") || /\b(?:AWAITING|PENDING)\b/i.test(svg)) {
      throw new Error(name + " is incomplete.");
    }
  }
  if (!template.includes("prefers-color-scheme: dark") || !template.includes("max-width: 767px")) {
    throw new Error("README template is not responsive and theme-aware.");
  }
}

function parseList(value) {
  return [...new Set(
    String(value ?? "")
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean),
  )];
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function minDate(first, second) {
  return first < second ? first : second;
}

async function runCli() {
  const fixtureIndex = process.argv.indexOf("--fixture");
  const outputIndex = process.argv.indexOf("--output");
  const outputDirectory = outputIndex >= 0
    ? path.resolve(process.argv[outputIndex + 1])
    : profileRoot;

  if (fixtureIndex >= 0) {
    const fixturePath = process.argv[fixtureIndex + 1];
    if (!fixturePath) throw new Error("--fixture requires a JSON file path.");
    const fixture = JSON.parse(await readFile(path.resolve(fixturePath), "utf8"));
    await generateFromStats(fixture, outputDirectory);
    console.log("Generated verified fixture profile in " + outputDirectory + ".");
    return;
  }

  const config = JSON.parse(await readFile(path.join(profileRoot, "config", "profile.json"), "utf8"));
  const login = process.env.PROFILE_LOGIN || config.login;
  const token = process.env.PROFILE_STATS_TOKEN || process.env.GITHUB_TOKEN;
  const ownerLogins = parseList(process.env.PROFILE_OWNER_LOGINS || login);
  const stats = await collectStats({ login, token, ownerLogins });
  await generateFromStats(stats, outputDirectory);
  console.log("Generated verified GitHub profile in " + outputDirectory + ".");
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
