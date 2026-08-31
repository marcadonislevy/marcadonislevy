import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectRepositoryIssueCounts,
  parseOwnerLogins,
  updateRepositoryIssueMetrics,
} from "../scripts/update-repository-issue-metrics.mjs";
import { RESPONSIVE_ASSET_NAMES } from "../scripts/render-profile.mjs";

const fixture = JSON.parse(await readFile(new URL("./fixture-stats.json", import.meta.url), "utf8"));

function pagedFetch() {
  const pages = [
    {
      data: {
        viewer: {
          repositories: {
            nodes: [
              { owner: { login: "marcadonislevy" }, openIssues: { totalCount: 3 }, closedIssues: { totalCount: 5 } },
              { owner: { login: "someone-else" }, openIssues: { totalCount: 100 }, closedIssues: { totalCount: 100 } },
            ],
            pageInfo: { hasNextPage: true, endCursor: "page-2" },
          },
        },
      },
    },
    {
      data: {
        viewer: {
          repositories: {
            nodes: [
              { owner: { login: "Quoralinex" }, openIssues: { totalCount: 25 }, closedIssues: { totalCount: 7 } },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      },
    },
  ];
  let calls = 0;
  return {
    get calls() { return calls; },
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => pages[calls++],
    }),
  };
}

test("owner login parsing is case-insensitive and de-duplicated", () => {
  assert.deepEqual(
    parseOwnerLogins("marcadonislevy, Quoralinex\nMARCADONISLEVY"),
    ["marcadonislevy", "quoralinex"],
  );
});

test("repository issue totals include every selected owner repository across pages", async () => {
  const mock = pagedFetch();
  const result = await collectRepositoryIssueCounts({
    token: "test-token",
    ownerLogins: ["marcadonislevy", "quoralinex"],
    fetchImpl: mock.fetch,
    graphqlUrl: "https://example.invalid/graphql",
  });
  assert.equal(mock.calls, 2);
  assert.deepEqual(result, { total: 40, open: 28, closed: 12, repositories: 2 });
});

test("issue refresh rerenders all responsive assets from the amended statistics", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-issues-"));
  try {
    await mkdir(path.join(root, "assets"));
    await writeFile(path.join(root, "assets", "stats.json"), `${JSON.stringify(fixture)}\n`);
    const mock = pagedFetch();
    const result = await updateRepositoryIssueMetrics({
      rootDirectory: root,
      token: "test-token",
      ownerLogins: ["marcadonislevy", "quoralinex"],
      fetchImpl: mock.fetch,
      graphqlUrl: "https://example.invalid/graphql",
    });
    assert.deepEqual(result, { total: 40, open: 28, closed: 12, repositories: 2 });
    const stats = JSON.parse(await readFile(path.join(root, "assets", "stats.json"), "utf8"));
    assert.deepEqual(stats.issues, { authored: 40, open: 28, closed: 12 });
    for (const name of RESPONSIVE_ASSET_NAMES) {
      const svg = await readFile(path.join(root, "assets", name), "utf8");
      assert.match(svg, />40<\/tspan>/);
      assert.match(svg, />28 open · 12(?: closed)?<\/tspan>/);
      assert.ok(svg.includes("closed"));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
