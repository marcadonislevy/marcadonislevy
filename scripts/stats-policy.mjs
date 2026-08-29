const PLACEHOLDER_PATTERN = /\b(?:AWAITING|PENDING|PLACEHOLDER|DEMO|PREVIEW)\b/i;

export function validateStats(stats) {
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    throw new Error("Statistics snapshot must be an object.");
  }
  if (stats.schemaVersion !== 1) {
    throw new Error("Statistics snapshot has an unsupported schema version.");
  }
  if (stats.source !== "github-api") {
    throw new Error("Statistics source must be github-api.");
  }
  if (typeof stats.generatedAt !== "string" || Number.isNaN(Date.parse(stats.generatedAt))) {
    throw new Error("Statistics snapshot requires a valid generation timestamp.");
  }
  rejectPlaceholders(stats);

  const contributionsTotal = requireCount(stats.contributions?.total, "total contribution count");
  const commits = requireCount(stats.contributions?.commits, "commit count");
  const calendar = validateCalendar(stats.contributions?.last365Days, stats.generatedAt);

  const authoredPrs = requireCount(stats.pullRequests?.authored, "authored pull-request count");
  const openPrs = requireCount(stats.pullRequests?.open, "open pull-request count");
  const closedPrs = requireCount(stats.pullRequests?.closed, "closed pull-request count");
  const mergedPrs = requireCount(stats.pullRequests?.merged, "merged pull-request count");
  const closedUnmergedPrs = requireCount(
    stats.pullRequests?.closedUnmerged,
    "closed-unmerged pull-request count",
  );
  requireCount(stats.pullRequests?.reviewed, "reviewed pull-request count");

  const authoredIssues = requireCount(stats.issues?.authored, "authored issue count");
  const openIssues = requireCount(stats.issues?.open, "open issue count");
  const closedIssues = requireCount(stats.issues?.closed, "closed issue count");

  const repositoryTotal = requireCount(stats.repositories?.total, "repository count");
  const publicRepositories = requireCount(stats.repositories?.public, "public repository count");
  const restrictedRepositories = requireCount(stats.repositories?.private, "restricted repository count");
  requireCount(stats.stars?.total, "star count");

  const languageCount = requireCount(stats.languages?.detectedCount, "language count");
  if (!Array.isArray(stats.languages?.top) || stats.languages.top.length === 0) {
    throw new Error("Statistics snapshot requires an aggregated language list.");
  }
  if (languageCount < stats.languages.top.length) {
    throw new Error("Detected language count cannot be smaller than the displayed language list.");
  }
  for (const entry of stats.languages.top) {
    if (!entry || typeof entry.name !== "string" || entry.name.trim() === "") {
      throw new Error("Each language entry requires a name.");
    }
    if (!Number.isFinite(entry.bytes) || entry.bytes <= 0) {
      throw new Error("Each language entry requires a positive byte count.");
    }
  }

  reconcile(authoredPrs, openPrs + closedPrs, "Pull-request lifecycle totals do not reconcile.");
  reconcile(closedPrs, mergedPrs + closedUnmergedPrs, "Closed pull-request totals do not reconcile.");
  reconcile(authoredIssues, openIssues + closedIssues, "Issue lifecycle totals do not reconcile.");
  reconcile(repositoryTotal, publicRepositories + restrictedRepositories, "Repository totals do not reconcile.");

  const knownAuthoredActivity = authoredPrs + authoredIssues;
  if (knownAuthoredActivity > 0 && contributionsTotal === 0) {
    throw new Error("Refusing to publish zero contributions while authored activity exists.");
  }
  if (knownAuthoredActivity > 0 && commits === 0) {
    throw new Error("Refusing to publish zero commits while authored activity exists.");
  }
  if (repositoryTotal === 0) {
    throw new Error("Refusing to publish an empty repository aggregate.");
  }
  if (languageCount === 0) {
    throw new Error("Refusing to publish an empty language aggregate.");
  }

  const recentContributionTotal = calendar.reduce((sum, day) => sum + day.count, 0);
  if (contributionsTotal < recentContributionTotal) {
    throw new Error("All-time contribution total is smaller than the 365-day contribution history.");
  }

  return stats;
}

function validateCalendar(value, generatedAt) {
  if (!Array.isArray(value) || value.length !== 365) {
    throw new Error("Statistics snapshot requires exactly 365 contribution days.");
  }

  const dates = new Set();
  let previous = null;
  for (const day of value) {
    if (!day || typeof day.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
      throw new Error("Contribution history contains an invalid date.");
    }
    const parsed = new Date(`${day.date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day.date) {
      throw new Error("Contribution history contains an invalid calendar date.");
    }
    requireCount(day.count, `contribution count for ${day.date}`);
    if (dates.has(day.date)) {
      throw new Error("Contribution history contains a duplicate date.");
    }
    dates.add(day.date);
    if (previous) {
      const expected = new Date(previous);
      expected.setUTCDate(expected.getUTCDate() + 1);
      if (expected.toISOString().slice(0, 10) !== day.date) {
        throw new Error("Contribution history must contain consecutive dates.");
      }
    }
    previous = parsed;
  }

  const generatedDate = new Date(generatedAt).toISOString().slice(0, 10);
  const lastDate = value[value.length - 1].date;
  if (lastDate > generatedDate) {
    throw new Error("Contribution history cannot extend beyond the generation date.");
  }
  return value;
}

function rejectPlaceholders(value, path = "stats") {
  if (typeof value === "string") {
    if (PLACEHOLDER_PATTERN.test(value)) {
      throw new Error(`Statistics snapshot contains a placeholder at ${path}.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectPlaceholders(entry, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      rejectPlaceholders(entry, `${path}.${key}`);
    }
  }
}

function requireCount(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Statistics snapshot requires a valid ${label}.`);
  }
  return value;
}

function reconcile(actual, expected, message) {
  if (actual !== expected) throw new Error(message);
}
