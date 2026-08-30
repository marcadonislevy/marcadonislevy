import assert from "node:assert/strict";
import test from "node:test";

import {
  collectRepositoryIssueCounts,
  parseOwnerLogins,
  replaceIssueCard,
} from "../scripts/update-repository-issue-metrics.mjs";

test("owner login parsing is case-insensitive and de-duplicated", () => {
  assert.deepEqual(
    parseOwnerLogins("marcadonislevy, Quoralinex\nMARCADONISLEVY"),
    ["marcadonislevy", "quoralinex"],
  );
});

test("repository issue totals include every selected owner repository across pages", async () => {
  const pages = [
    {
      data: {
        viewer: {
          repositories: {
            nodes: [
              {
                owner: { login: "marcadonislevy" },
                openIssues: { totalCount: 3 },
                closedIssues: { totalCount: 5 },
              },
              {
                owner: { login: "someone-else" },
                openIssues: { totalCount: 100 },
                closedIssues: { totalCount: 100 },
              },
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
              {
                owner: { login: "Quoralinex" },
                openIssues: { totalCount: 25 },
                closedIssues: { totalCount: 7 },
              },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      },
    },
  ];
  let calls = 0;
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => pages[calls++],
  });

  const result = await collectRepositoryIssueCounts({
    token: "test-token",
    ownerLogins: ["marcadonislevy", "quoralinex"],
    fetchImpl,
    graphqlUrl: "https://example.invalid/graphql",
  });

  assert.equal(calls, 2);
  assert.deepEqual(result, {
    total: 40,
    open: 28,
    closed: 12,
    repositories: 2,
  });
});

test("Issues card values are replaced without altering the rest of the SVG", () => {
  const svg = [
    '<svg>',
    '<text x="31" y="25" class="metric-label">Issues</text>',
    '<text x="15" y="68" class="metric-value">74</text>',
    '<text x="15" y="92" class="metric-note">53 open</text>',
    '<text x="15" y="107" class="metric-note">21 closed</text>',
    '<text class="metric-label">Stars</text>',
    '</svg>',
  ].join("");

  const result = replaceIssueCard(svg, { total: 132, open: 81, closed: 51 });
  assert.match(result, />132<\/text>/);
  assert.match(result, />81 open<\/text>/);
  assert.match(result, />51 closed<\/text>/);
  assert.match(result, />Stars<\/text>/);
  assert.doesNotMatch(result, />74<\/text>/);
});

test("missing or duplicated Issues cards fail closed", () => {
  assert.throws(
    () => replaceIssueCard("<svg></svg>", { total: 1, open: 1, closed: 0 }),
    /exactly one Issues metric card/,
  );

  const card = '<text class="metric-label">Issues</text><text class="metric-value">1</text><text class="metric-note">1 open</text><text class="metric-note">0 closed</text>';
  assert.throws(
    () => replaceIssueCard(`<svg>${card}${card}</svg>`, { total: 1, open: 1, closed: 0 }),
    /found 2/,
  );
});
