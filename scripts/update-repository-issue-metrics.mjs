#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_GRAPHQL_URL = "https://api.github.com/graphql";
const modulePath = fileURLToPath(import.meta.url);
const profileRoot = path.resolve(path.dirname(modulePath), "..");

export function parseOwnerLogins(value) {
  return [...new Set(
    String(value ?? "")
      .split(/[\n,]/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )];
}

export async function collectRepositoryIssueCounts({
  token,
  ownerLogins,
  fetchImpl = fetch,
  graphqlUrl = DEFAULT_GRAPHQL_URL,
}) {
  if (!token || typeof token !== "string") {
    throw new Error("PROFILE_STATS_TOKEN is required to collect repository issue totals.");
  }

  const owners = new Set(
    (Array.isArray(ownerLogins) ? ownerLogins : parseOwnerLogins(ownerLogins))
      .map((entry) => String(entry).trim().toLowerCase())
      .filter(Boolean),
  );
  if (owners.size === 0) {
    throw new Error("At least one PROFILE_OWNER_LOGINS entry is required.");
  }

  let after = null;
  let open = 0;
  let closed = 0;
  let repositories = 0;

  do {
    const response = await fetchImpl(graphqlUrl, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "marcadonislevy-profile-repository-issues",
      },
      body: JSON.stringify({
        query: `
          query RepositoryIssueTotals($after: String) {
            viewer {
              repositories(
                first: 100
                after: $after
                affiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR]
                ownerAffiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR]
                orderBy: { field: UPDATED_AT, direction: DESC }
              ) {
                nodes {
                  owner { login }
                  openIssues: issues(states: [OPEN]) { totalCount }
                  closedIssues: issues(states: [CLOSED]) { totalCount }
                }
                pageInfo { endCursor hasNextPage }
              }
            }
          }
        `,
        variables: { after },
      }),
    });

    if (!response?.ok) {
      throw new Error(`Repository issue query failed with HTTP ${response?.status ?? "unknown"}.`);
    }

    const payload = await response.json();
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      throw new Error("Repository issue query returned a GraphQL error.");
    }

    const connection = payload?.data?.viewer?.repositories;
    if (!connection || !Array.isArray(connection.nodes)) {
      throw new Error("Repository issue query returned an invalid repository connection.");
    }

    for (const repository of connection.nodes) {
      const owner = repository?.owner?.login?.toLowerCase();
      if (!owner || !owners.has(owner)) continue;

      const repositoryOpen = repository?.openIssues?.totalCount;
      const repositoryClosed = repository?.closedIssues?.totalCount;
      if (
        !Number.isSafeInteger(repositoryOpen)
        || repositoryOpen < 0
        || !Number.isSafeInteger(repositoryClosed)
        || repositoryClosed < 0
      ) {
        throw new Error("Repository issue query returned an invalid issue count.");
      }

      open += repositoryOpen;
      closed += repositoryClosed;
      repositories += 1;
    }

    after = connection.pageInfo?.hasNextPage
      ? connection.pageInfo?.endCursor
      : null;
    if (connection.pageInfo?.hasNextPage && !after) {
      throw new Error("Repository issue query did not return its next cursor.");
    }
  } while (after);

  return {
    total: open + closed,
    open,
    closed,
    repositories,
  };
}

export function replaceIssueCard(svg, counts) {
  const pattern = /(<text[^>]*class="metric-label">Issues<\/text><text[^>]*class="metric-value">)([^<]*)(<\/text><text[^>]*class="metric-note">)([^<]*)(<\/text><text[^>]*class="metric-note">)([^<]*)(<\/text>)/;
  const matches = svg.match(new RegExp(pattern.source, "g")) ?? [];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one Issues metric card, found ${matches.length}.`);
  }

  return svg.replace(
    pattern,
    `$1${counts.total.toLocaleString("en-US")}$3${counts.open.toLocaleString("en-US")} open$5${counts.closed.toLocaleString("en-US")} closed$7`,
  );
}

export async function updateRepositoryIssueMetrics({
  rootDirectory = profileRoot,
  token,
  ownerLogins,
  fetchImpl = fetch,
  graphqlUrl = DEFAULT_GRAPHQL_URL,
}) {
  const counts = await collectRepositoryIssueCounts({
    token,
    ownerLogins,
    fetchImpl,
    graphqlUrl,
  });

  const statsPath = path.join(rootDirectory, "assets", "stats.json");
  const lightPath = path.join(rootDirectory, "assets", "profile-light.svg");
  const darkPath = path.join(rootDirectory, "assets", "profile-dark.svg");

  const [statsText, lightSvg, darkSvg] = await Promise.all([
    readFile(statsPath, "utf8"),
    readFile(lightPath, "utf8"),
    readFile(darkPath, "utf8"),
  ]);

  const stats = JSON.parse(statsText);
  stats.issues = {
    // Retain the existing schema key while changing the metric's scope from
    // issues authored by one login to all issues in the selected repositories.
    authored: counts.total,
    open: counts.open,
    closed: counts.closed,
  };

  const nextLightSvg = replaceIssueCard(lightSvg, counts);
  const nextDarkSvg = replaceIssueCard(darkSvg, counts);

  await Promise.all([
    writeFile(statsPath, `${JSON.stringify(stats, null, 2)}\n`, "utf8"),
    writeFile(lightPath, nextLightSvg, "utf8"),
    writeFile(darkPath, nextDarkSvg, "utf8"),
  ]);

  return counts;
}

async function runCli() {
  const token = process.env.PROFILE_STATS_TOKEN;
  const ownerLogins = parseOwnerLogins(process.env.PROFILE_OWNER_LOGINS);
  const counts = await updateRepositoryIssueMetrics({ token, ownerLogins });
  console.log(
    `Published aggregate issue totals for ${counts.repositories} selected repositories: `
    + `${counts.total} total, ${counts.open} open, ${counts.closed} closed.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
