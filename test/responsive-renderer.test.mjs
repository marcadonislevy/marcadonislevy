import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { generateFromStats } from "../scripts/generate-profile.mjs";
import { RESPONSIVE_ASSET_NAMES } from "../scripts/render-profile.mjs";
import { verifyPublicOutput } from "../scripts/verify-public-output.mjs";

const fixture = JSON.parse(await readFile(new URL("./fixture-stats.json", import.meta.url), "utf8"));

test("fixture generation creates six responsive assets and a viewport-aware README", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "responsive-profile-"));
  try {
    await generateFromStats(fixture, directory);
    const readme = await readFile(path.join(directory, "README.md"), "utf8");
    for (const name of RESPONSIVE_ASSET_NAMES) {
      const svg = await readFile(path.join(directory, "assets", name), "utf8");
      assert.match(svg, /^<svg/);
      assert.ok(readme.includes(name));
    }
    assert.match(readme, /max-width: 767px/);
    assert.match(readme, /min-width: 1004px/);
    assert.doesNotMatch(readme, /profile-light\.svg|profile-dark\.svg/);
    const result = await verifyPublicOutput(directory, "");
    assert.equal(result.assets, 6);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
