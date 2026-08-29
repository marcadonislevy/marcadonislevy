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
import { renderProfile } from "./render-profile.mjs";
import { validateStats } from "./stats-policy.mjs";

const API_VERSION = "2022-11-28";
const modulePath = fileURLToPath(import.meta.url);
const profileRoot = path.resolve(path.dirname(modulePath), "..");

export async function generateFromStats(stats, outputDirectory = profileRoot) {
  validateStats(stats);

  const lightSvg = renderProfile(stats, "light");
  const darkSvg = renderProfile(stats, "dark");
  const template = await readFile(path.join(profileRoot, "README.template.md"), "utf8");
  assertGeneratedContent({ template, lightSvg, darkSvg });

  await mkdir(outputDirectory, { recursive: true });
  const staging = await mkdtemp(path.join(outputDirectory, ".profile-build-"));
  const stagingAssets = path.join(staging, "assets");
  await mkdir(stagingAssets, { recursive: true });

  try {
    await Promise.all([
      writeFile(path.join(stagingAssets, "profile-light.svg"), lightSvg, "utf8"),
      writeFile(path.join(stagingAssets, "profile-dark.svg"), darkSvg, "utf8"),
      writeFile(
        path.join(stagingAssets, "stats.json"),
        `${JSON.stringify(toPublicSnapshot(stats), null, 2)}\n`,
        "utf8",
      ),
      writeFile(path.join(staging, "README.md"), template, "utf8"),
    ]);

    const outputAssets = path.join(outputDirectory, "assets");
    await mkdir(outputAssets, { recursive: true });
    await rename(path.join(stagingAssets, "profile-light.svg"), path.join(outputAssets, "profile-light.svg"));
    await rename(path.join(stagingAssets, "profile-dark.svg"), path.join(outputAssets, "profile-dark.svg"));
    await rename(path.join(stagingAssets, "stats.json"), path.join(outputAssets, "stats.json"));
    await rename(path.join(staging, "README.md"), path.join(outputDirectory, "README.md"));
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
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
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error("A valid collection time is required.");

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

  const issueQueries = {
    authored: `author:${login} is:issue`,
    open: `author:${login} is:issue is:open`,
    closed: `author:${login} is:issue is:closed`,
  };
  const pullRequestQueries = {
    authored: `author:${login} is:pr`,
    open: `author:${login} is:pr is:open`,
    closed: `author:${login} is:pr is:closed`,
    merged: `author:${login} is:pr is:merged`,
    closedUnmerged: `author:${login} is:pr is:closed is:unmerged`,
    reviewed: `reviewed-by:${login} is:pr`,
  };

  const [issues, pullRequests, commits, contributions, repositories] = await Promise.all([
    fetchSearchCounts(issueQueries, { fetchImpl, restUrl, headers }),
    fetchSearchCounts(pullRequestQueries, { fetchImpl, restUrl, headers }),
    fetchCommitCount(login, { fetchImpl, restUrl, headers }),
    collectContributionHistory({ login, token, createdAt, now, fetchImpl, graphqlUrl }),
    collectRepositoryAggregates({ token, owners, fetchImpl, graphqlUrl }),
  ]);

  const stats = {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    source: "github-api",
    contributions: {
      total: contributions.total,
      commits,
      last365Days: contributions.last365Days,
    },
    pullRequests,
    issues,
    repositories: repositories.repositories,
    stars: { total: repositories.stars },
    languages: repositories.languages,
  };

  return validateStats(stats);
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
  const url = `${restUrl.replace(/\/$/, "")}/search/commits?q=${encodeURIComponent(`author:${login}`)}&per_page=1`;
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

  const daily = new Map();
  for (let windowStart = start; windowStart < endExclusive; windowStart = addUtcDays(windowStart, 180)) {
    const windowEndExclusive = minDate(addUtcDays(windowStart, 180), endExclusive);
    const windowEnd = new Date(windowEndExclusive.getTime() - 1);
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
                  contributionDays { date contributionCount }
                }
              }
            }
          }
        }
      `,
      variables: {
        login,
        from: windowStart.toISOString(),
        to: windowEnd.toISOString(),
      },
    });
    const calendar = data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar) throw new Error("GitHub contribution history was unavailable.");
    for (const week of calendar.weeks ?? []) {
      for (const day of week.contributionDays ?? []) {
        if (typeof day.date !== "string" || !Number.isSafeInteger(day.contributionCount)) continue;
        daily.set(day.date, Math.max(daily.get(day.date) ?? 0, day.contributionCount));
      }
    }
  }

  const allDays = [...daily.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const total = allDays.reduce((sum, day) => sum + day.count, 0);
  const last365Start = addUtcDays(startOfUtcDay(now), -364);
  const last365Days = [];
  for (let index = 0; index < 365; index += 1) {
    const date = addUtcDays(last365Start, index).toISOString().slice(0, 10);
    last365Days.push({ date, count: daily.get(date) ?? 0 });
  }
  return { total, last365Days };
}

async function collectRepositoryAggregates({ token, owners, fetchImpl, graphqlUrl }) {
  const languageBytes = new Map();
  const repositories = { total: 0, public: 0, private: 0 };
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
    if (!connection) throw new Error("GitHub repository aggregate was unavailable.");

    for (const repository of connection.nodes ?? []) {
      const owner = repository.owner?.login?.toLowerCase();
      if (!owner || !owners.has(owner)) continue;

      repositories.total += 1;
      if (repository.isPrivate) repositories.private += 1;
      else repositories.public += 1;

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
  } while (after);

  const top = [...languageBytes.entries()]
    .map(([name, bytes]) => ({ name, bytes }))
    .sort((a, b) => b.bytes - a.bytes);

  return {
    repositories,
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
    throw new Error(`${label} returned a GraphQL error.`);
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
    throw new Error(`${label} returned invalid JSON.`);
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

function assertGeneratedContent({ template, lightSvg, darkSvg }) {
  if (!template.includes("prefers-color-scheme: dark") || !template.includes("profile-light.svg")) {
    throw new Error("README template is not theme-aware.");
  }
  for (const [label, content] of [["light SVG", lightSvg], ["dark SVG", darkSvg]]) {
    if (!content.startsWith("<svg") || /\b(?:AWAITING|PENDING)\b/i.test(content)) {
      throw new Error(`${label} is incomplete.`);
    }
  }
}

function parseList(value) {
  return [...new Set(String(value ?? "").split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean))];
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
    console.log(`Generated verified fixture profile in ${outputDirectory}.`);
    return;
  }

  const config = JSON.parse(await readFile(path.join(profileRoot, "config", "profile.json"), "utf8"));
  const login = process.env.PROFILE_LOGIN || config.login;
  const token = process.env.PROFILE_STATS_TOKEN || process.env.GITHUB_TOKEN;
  const ownerLogins = parseList(process.env.PROFILE_OWNER_LOGINS || login);
  const stats = await collectStats({ login, token, ownerLogins });
  await generateFromStats(stats, outputDirectory);
  console.log(`Generated verified GitHub profile in ${outputDirectory}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
