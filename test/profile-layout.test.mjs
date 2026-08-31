import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  contributionLevelIndex,
  deriveMonthLabels,
  normaliseCalendar,
  splitCalendarWeeks,
} from "../scripts/profile/calendar.mjs";
import { measureText, wrapText } from "../scripts/profile/text-layout.mjs";
import { TYPE, getTheme, getVariant } from "../scripts/profile/tokens.mjs";
import { renderAllProfiles } from "../scripts/render-profile.mjs";

const fixture = JSON.parse(await readFile(new URL("./fixture-stats.json", import.meta.url), "utf8"));

test("responsive variants use native GitHub content widths", () => {
  assert.equal(getVariant("desktop").width, 600);
  assert.equal(getVariant("compact").width, 560);
  assert.equal(getVariant("mobile").width, 360);
});

test("approved theme backgrounds and metric hierarchy remain locked", () => {
  assert.equal(getTheme("dark").background, "#06131f");
  assert.equal(getTheme("light").background, "#ffffff");
  assert.ok(TYPE.metricValue.size < TYPE.section.size);
});

test("measured technology labels preserve their relative widths", () => {
  assert.ok(measureText("Cloudflare Workers", TYPE.chip) > measureText("D1", TYPE.chip));
});

test("word wrapping preserves complete words and rejects unbreakable overflow", () => {
  assert.deepEqual(
    wrapText("Public-interest Technology", {
      maxWidth: 130,
      maxLines: 2,
      style: TYPE.capability,
    }).lines,
    ["Public-interest", "Technology"],
  );
  assert.throws(
    () => wrapText("AnUnbreakableLabelThatCannotFit", {
      maxWidth: 40,
      maxLines: 2,
      style: TYPE.chip,
    }),
    /cannot fit/,
  );
});

test("GitHub contribution levels map directly to five display levels", () => {
  assert.deepEqual(
    ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"]
      .map((level) => contributionLevelIndex(level)),
    [0, 1, 2, 3, 4],
  );
});

test("rolling contribution data forms exactly 53 chronological week columns", () => {
  const { weeks } = normaliseCalendar(fixture.contributions.last365Days);
  assert.equal(weeks.length, 53);
  assert.equal(weeks.flat().filter(Boolean).length, 365);
});

test("month labels advance chronologically over the rolling calendar", () => {
  const { weeks } = normaliseCalendar(fixture.contributions.last365Days);
  const labels = deriveMonthLabels(weeks);
  assert.ok(labels.length >= 12);
  assert.ok(labels.every((label, index) => index === 0 || label.column > labels[index - 1].column));
});

test("mobile contribution calendar splits all 53 weeks into readable sections", () => {
  const { weeks } = normaliseCalendar(fixture.contributions.last365Days);
  const segments = splitCalendarWeeks(weeks);
  assert.deepEqual(segments.map((segment) => segment.weeks.length), [27, 26]);
  assert.equal(segments.flatMap((segment) => segment.weeks).length, 53);
});

test("every responsive asset retains the approved content and complete calendar", () => {
  const outputs = renderAllProfiles(fixture);
  for (const [name, result] of Object.entries(outputs)) {
    assert.ok(result.svg.includes("Technology ecosystem"), name);
    assert.ok(result.svg.includes("GitHub activity"), name);
    assert.ok(result.svg.includes("What I build"), name);
    assert.equal((result.svg.match(/data-week=/g) ?? []).length, 53 * 7, name);
    assert.doesNotMatch(result.svg, /Equitable Journeys/i, name);
  }
});
