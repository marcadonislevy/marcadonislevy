import assert from "node:assert/strict";
import test from "node:test";

import { collectStats } from "../scripts/generate-profile.mjs";

test("collector publishes GitHub contribution levels and repository-wide issue totals", async () => {
  const searchCounts = new Map([
    ["author:marcadonislevy is:pr", 50],
    ["author:marcadonislevy is:pr is:open", 4],
    ["author:marcadonislevy is:pr is:closed", 46],
    ["author:marcadonislevy is:pr is:merged", 40],
    ["author:marcadonislevy is:pr is:closed is:unmerged", 6],
    ["reviewed-by:marcadonislevy is:pr", 9],
  ]);
  const fetchImpl = async (url, options = {}) => {
    const requestUrl = new URL(url);
    if (requestUrl.pathname === "/search/issues") return Response.json({ total_count: searchCounts.get(requestUrl.searchParams.get("q")) ?? 0 });
    if (requestUrl.pathname === "/search/commits") return Response.json({ total_count: 123 });
    if (requestUrl.pathname === "/graphql") {
      const { query } = JSON.parse(options.body);
      if (query.includes("ProfileAccount")) return Response.json({ data: { user: { createdAt: "2026-08-01T00:00:00Z" } } });
      if (query.includes("ContributionWindow")) return Response.json({ data: { user: { contributionsCollection: { contributionCalendar: { weeks: [{ contributionDays: [
        { date: "2026-08-27", contributionCount: 1, contributionLevel: "FOURTH_QUARTILE" },
        { date: "2026-08-28", contributionCount: 3, contributionLevel: "FOURTH_QUARTILE" },
        { date: "2026-08-29", contributionCount: 6, contributionLevel: "FOURTH_QUARTILE" },
      ] }] } } } } });
      if (query.includes("RecentContributionCalendar")) return Response.json({ data: { user: { contributionsCollection: { contributionCalendar: { weeks: [{ contributionDays: [
        { date: "2026-08-27", contributionCount: 1, contributionLevel: "FIRST_QUARTILE" },
        { date: "2026-08-28", contributionCount: 3, contributionLevel: "THIRD_QUARTILE" },
        { date: "2026-08-29", contributionCount: 6, contributionLevel: "FOURTH_QUARTILE" },
      ] }] } } } } });
      if (query.includes("RepositoryAggregate")) return Response.json({ data: { viewer: { repositories: {
        nodes: [
          { isPrivate: false, isFork: false, stargazerCount: 7, owner: { login: "marcadonislevy" }, openIssues: { totalCount: 3 }, closedIssues: { totalCount: 5 }, languages: { edges: [{ size: 700, node: { name: "TypeScript" } }] } },
          { isPrivate: true, isFork: false, stargazerCount: 0, owner: { login: "portfolio-owner" }, openIssues: { totalCount: 25 }, closedIssues: { totalCount: 7 }, languages: { edges: [{ size: 300, node: { name: "Python" } }] } },
        ],
        pageInfo: { endCursor: null, hasNextPage: false },
      } } } });
    }
    return new Response("not found", { status: 404 });
  };

  const stats = await collectStats({
    login: "marcadonislevy",
    token: "test-token",
    ownerLogins: ["marcadonislevy", "portfolio-owner"],
    fetchImpl,
    now: new Date("2026-08-29T12:00:00Z"),
    restUrl: "https://mock.invalid",
    graphqlUrl: "https://mock.invalid/graphql",
  });
  assert.equal(stats.issues.authored, 40);
  assert.equal(stats.issues.open, 28);
  assert.equal(stats.issues.closed, 12);
  assert.equal(stats.contributions.last365Days.at(-3).level, "FIRST_QUARTILE");
  assert.equal(stats.contributions.last365Days.at(-2).level, "THIRD_QUARTILE");
  assert.equal(stats.contributions.last365Days.at(-1).level, "FOURTH_QUARTILE");
  assert.equal(stats.repositories.total, 2);
  assert.equal(stats.stars.total, 7);
});
