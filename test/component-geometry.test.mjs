import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { renderAllProfiles } from "../scripts/render-profile.mjs";
import { contains } from "../scripts/profile/svg-layout.mjs";

const fixture = JSON.parse(await readFile(new URL("./fixture-stats.json", import.meta.url), "utf8"));

test("every measured text box stays inside its owning component at all variants", () => {
  const outputs = renderAllProfiles(fixture);
  for (const [name, result] of Object.entries(outputs)) {
    const view = { x: 0, y: 0, width: result.width, height: result.height };
    for (const item of result.diagnostics) {
      assert.ok(contains(view, item.bounds), `${name}: ${item.id} leaves viewBox`);
      for (const text of item.text ?? []) {
        assert.ok(contains(item.bounds, text.bbox, 1.5), `${name}: ${item.id}/${text.id} overflows`);
        assert.ok(text.fontSize >= 11.5, `${name}: ${item.id}/${text.id} is too small`);
      }
    }
  }
});

test("same-type card dimensions are uniform within each responsive asset", () => {
  const outputs = renderAllProfiles(fixture);
  for (const [name, result] of Object.entries(outputs)) {
    for (const prefix of ["capability-", "metric-", "focus-"]) {
      const pattern = new RegExp(`^${prefix}\\d+$`);
      const boxes = result.diagnostics.filter((item) => pattern.test(item.id)).map((item) => item.bounds);
      const sizes = new Set(boxes.map((box) => `${box.width.toFixed(2)}x${box.height.toFixed(2)}`));
      assert.equal(sizes.size, 1, `${name}: ${prefix} sizes are not uniform`);
    }
  }
});
