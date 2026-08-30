# GitHub Profile Responsive Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the approved GitHub profile design while replacing the single continuously shrinking poster with verified desktop, compact and mobile SVG layouts whose text, cards, chips, metrics and rolling contribution calendar remain aligned and readable.

**Architecture:** Keep the existing GitHub API collection and approved visual identity, but rebuild rendering around measured layout primitives and typed components. Generate three geometries in light and dark variants, select them through a verified `<picture>` element, and keep the existing hourly fail-closed publication workflow. The live `main` profile remains unchanged until branch previews at all target widths have been reviewed and approved.

**Tech Stack:** Node.js 24.18.1, ECMAScript modules, SVG, GitHub Actions, GitHub REST and GraphQL APIs, Node test runner, Python 3 standard library for deterministic runtime packaging, `sharp` for branch-only preview rasterisation.

**Spec:** `docs/superpowers/specs/2026-08-31-github-profile-responsive-renderer-design.md`

## Global Constraints

- Preserve the approved navy background and cyan, blue, purple, green, amber, orange and coral accent palette.
- Preserve the ML mark, network graphic, headline, supporting copy, five portfolio pills, nine capability areas, technology ecosystem, eight activity metrics and eight “What I build” categories.
- Do not restore Equitable Journeys.
- Do not add or expose private product, repository, branch or codename identities.
- Do not replace the visual profile with plain Markdown.
- Generate `desktop`, `compact` and `mobile` geometries in both light and dark themes.
- Use browser viewport breakpoints: mobile below 768 px, compact from 768–1,003 px, desktop at 1,004 px and above.
- Keep the existing hourly refresh at 17 minutes past the hour and retain manual dispatch only for immediate refreshes.
- Never force-push generated output over newer work.
- Fail generation if text clips, a component leaves the view box, contribution data is malformed or confidential content is detected.
- Keep `main` unchanged until the branch feasibility probe, automated tests and visual previews are approved.

---

## Planned File Structure

The existing unpacked source at repository root becomes the reviewable source of truth. The base64 runtime archive remains a generated deployment artefact until a later, separately approved simplification.

### Existing files to modify

- `README.template.md` — responsive `<picture>` source selection.
- `package.json` — complete test and preview scripts plus the exact preview dependency.
- `scripts/generate-profile.mjs` — contribution-level collection and six-asset generation.
- `scripts/render-profile.mjs` — orchestration only; delegates layout to focused modules.
- `scripts/stats-policy.mjs` — validates contribution levels and responsive output data.
- `scripts/update-repository-issue-metrics.mjs` — updates all six responsive assets.
- `scripts/verify-public-output.mjs` — validates six assets, responsive source ordering and public-safety invariants.
- `test/fixture-stats.json` — contribution levels and large-value edge cases.
- `test/profile.test.mjs` — retained high-level regression coverage.
- `.github/workflows/update-profile.yml` — six-asset generation, validation and publication.
- `.gitignore` — local packaging and preview working directories.

### New source files

- `scripts/profile-layout/tokens.mjs` — themes, typography, spacing and geometry configs.
- `scripts/profile-layout/text.mjs` — deterministic text measurement and word wrapping.
- `scripts/profile-layout/geometry.mjs` — boxes, containment checks and diagnostics.
- `scripts/profile-layout/components.mjs` — hero, pills, capabilities, technology, metrics and focus components.
- `scripts/profile-layout/calendar.mjs` — rolling 53×7 contribution calendar.
- `scripts/package-profile-runtime.py` — deterministic ZIP, SHA-256 and base64 chunk generation.
- `scripts/render-responsive-previews.mjs` — raster preview generation at approved target widths.

### New tests and evidence

- `test/responsive-picture.test.mjs`
- `test/text-layout.test.mjs`
- `test/component-layout.test.mjs`
- `test/calendar-layout.test.mjs`
- `test/responsive-renderer.test.mjs`
- `test/runtime-package.test.mjs`
- `test/visual-regression.test.mjs`
- `test/baselines/*.png` — added only after preview approval.
- `docs/probes/responsive-picture.md`
- `docs/probes/assets/profile-probe-*.svg`
- `.github/workflows/profile-responsive-preview.yml`

---

### Task 1: Prove GitHub viewport-aware `<picture>` selection

**Files:**
- Create: `docs/probes/responsive-picture.md`
- Create: `docs/probes/assets/profile-probe-desktop-light.svg`
- Create: `docs/probes/assets/profile-probe-desktop-dark.svg`
- Create: `docs/probes/assets/profile-probe-compact-light.svg`
- Create: `docs/probes/assets/profile-probe-compact-dark.svg`
- Create: `docs/probes/assets/profile-probe-mobile-light.svg`
- Create: `docs/probes/assets/profile-probe-mobile-dark.svg`
- Create: `test/responsive-picture.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: GitHub’s Markdown renderer and the approved breakpoints.
- Produces: a proven source order that later tasks copy into `README.template.md`.

- [ ] **Step 1: Write the failing source-order test**

```js
// test/responsive-picture.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("responsive picture probe declares mobile, compact and desktop sources in priority order", async () => {
  const markdown = await readFile("docs/probes/responsive-picture.md", "utf8");
  const expected = [
    "(prefers-color-scheme: dark) and (max-width: 767px)",
    "(prefers-color-scheme: light) and (max-width: 767px)",
    "(prefers-color-scheme: dark) and (min-width: 768px) and (max-width: 1003px)",
    "(prefers-color-scheme: light) and (min-width: 768px) and (max-width: 1003px)",
    "(prefers-color-scheme: dark) and (min-width: 1004px)",
    "(prefers-color-scheme: light) and (min-width: 1004px)",
  ];
  let previous = -1;
  for (const media of expected) {
    const index = markdown.indexOf(`media="${media}"`);
    assert.ok(index > previous, `missing or misordered media condition: ${media}`);
    previous = index;
  }
  assert.match(markdown, /profile-probe-desktop-light\.svg/);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
node --test test/responsive-picture.test.mjs
```

Expected: FAIL because `docs/probes/responsive-picture.md` does not exist.

- [ ] **Step 3: Create six unmistakable probe SVGs**

Use the same structure for each file, changing `LABEL`, background and foreground. Example desktop dark asset:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="160" viewBox="0 0 720 160">
  <rect width="720" height="160" rx="18" fill="#06131f"/>
  <rect x="8" y="8" width="704" height="144" rx="14" fill="none" stroke="#20c6e8" stroke-width="2"/>
  <text x="360" y="92" text-anchor="middle"
        font-family="ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
        font-size="36" font-weight="700" fill="#f4f7fb">DESKTOP · DARK</text>
</svg>
```

Use native widths of 720, 600 and 360 for desktop, compact and mobile probe assets.

- [ ] **Step 4: Create the probe Markdown**

```html
<!-- docs/probes/responsive-picture.md -->
# Responsive picture feasibility probe

<picture>
  <source media="(prefers-color-scheme: dark) and (max-width: 767px)" srcset="./assets/profile-probe-mobile-dark.svg">
  <source media="(prefers-color-scheme: light) and (max-width: 767px)" srcset="./assets/profile-probe-mobile-light.svg">
  <source media="(prefers-color-scheme: dark) and (min-width: 768px) and (max-width: 1003px)" srcset="./assets/profile-probe-compact-dark.svg">
  <source media="(prefers-color-scheme: light) and (min-width: 768px) and (max-width: 1003px)" srcset="./assets/profile-probe-compact-light.svg">
  <source media="(prefers-color-scheme: dark) and (min-width: 1004px)" srcset="./assets/profile-probe-desktop-dark.svg">
  <source media="(prefers-color-scheme: light) and (min-width: 1004px)" srcset="./assets/profile-probe-desktop-light.svg">
  <img src="./assets/profile-probe-desktop-light.svg" width="100%" alt="Responsive source-selection probe">
</picture>
```

- [ ] **Step 5: Add the test to the root test command**

Replace the `test` script in `package.json` with:

```json
"test": "node --test test/*.test.mjs"
```

- [ ] **Step 6: Run the probe test**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit and push the branch-only probe**

```bash
git add docs/probes test/responsive-picture.test.mjs package.json
git commit -m "test(profile): add responsive picture feasibility probe"
git push origin profile-responsive-layout-20260831
```

- [ ] **Step 8: Verify the rendered GitHub probe manually**

Open the rendered `docs/probes/responsive-picture.md` on GitHub and verify all six conditions by changing GitHub theme and browser width:

- below 768 px → `MOBILE`;
- 768–1,003 px → `COMPACT`;
- 1,004 px and above → `DESKTOP`;
- light theme → `LIGHT`;
- dark theme → `DARK`.

Expected: the visible label changes without a page-source edit. Record screenshots in the implementation thread. If any viewport condition is ignored, stop implementation and revise the approved spec rather than continuing with an unproven selector.

- [ ] **Step 9: Commit the feasibility result note**

Append a dated result section to `docs/probes/responsive-picture.md`, including the five tested viewport widths and both themes, then commit:

```bash
git add docs/probes/responsive-picture.md
git commit -m "docs(profile): record responsive picture probe result"
```

---

### Task 2: Make the runtime package reproducible from reviewable source

**Files:**
- Create: `scripts/render-profile.mjs` from the existing runtime archive if absent at root
- Create: `test/fixture-stats.json` from the existing runtime archive if absent at root
- Create: `test/profile.test.mjs` from the existing runtime archive if absent at root
- Create: `scripts/package-profile-runtime.py`
- Create: `test/runtime-package.test.mjs`
- Create: `source/profile-source.sha256`
- Modify: `.gitignore`
- Modify: `.github/workflows/update-profile.yml`

**Interfaces:**
- Consumes: the complete root source tree.
- Produces: deterministic `source/profile-source.b64.NN` chunks and `source/profile-source.sha256`.

- [ ] **Step 1: Restore the three missing reviewable files from the current archive**

```bash
rm -rf .profile-runtime .profile-runtime.zip
cat source/profile-source.b64.* | base64 --decode > .profile-runtime.zip
unzip -q .profile-runtime.zip -d .profile-runtime
cp .profile-runtime/scripts/render-profile.mjs scripts/render-profile.mjs
cp .profile-runtime/test/fixture-stats.json test/fixture-stats.json
cp .profile-runtime/test/profile.test.mjs test/profile.test.mjs
```

Verify:

```bash
node --check scripts/render-profile.mjs
node --test test/profile.test.mjs
```

Expected: syntax valid and the existing eight renderer tests pass before responsive changes.

- [ ] **Step 2: Write the failing deterministic-package test**

```js
// test/runtime-package.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("runtime packaging is deterministic and records the matching SHA-256", async () => {
  const first = await mkdtemp(path.join(os.tmpdir(), "profile-package-a-"));
  const second = await mkdtemp(path.join(os.tmpdir(), "profile-package-b-"));
  try {
    execFileSync("python3", ["scripts/package-profile-runtime.py", "--output", first]);
    execFileSync("python3", ["scripts/package-profile-runtime.py", "--output", second]);
    assert.deepEqual(
      await readFile(path.join(first, "profile-runtime.zip")),
      await readFile(path.join(second, "profile-runtime.zip")),
    );
    assert.equal(
      await readFile(path.join(first, "profile-source.sha256"), "utf8"),
      await readFile(path.join(second, "profile-source.sha256"), "utf8"),
    );
  } finally {
    await rm(first, { recursive: true, force: true });
    await rm(second, { recursive: true, force: true });
  }
});
```

- [ ] **Step 3: Run the package test and confirm it fails**

```bash
node --test test/runtime-package.test.mjs
```

Expected: FAIL because `scripts/package-profile-runtime.py` does not exist.

- [ ] **Step 4: Implement deterministic packaging**

```python
#!/usr/bin/env python3
# scripts/package-profile-runtime.py
from __future__ import annotations

import argparse
import base64
import hashlib
import pathlib
import shutil
import tempfile
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
FILES = [
    ".github/workflows/update-profile.yml",
    ".gitignore",
    "README.template.md",
    "config/profile.json",
    "package.json",
    "scripts/generate-profile.mjs",
    "scripts/render-profile.mjs",
    "scripts/stats-policy.mjs",
    "scripts/update-repository-issue-metrics.mjs",
    "scripts/verify-public-output.mjs",
    "scripts/profile-layout/tokens.mjs",
    "scripts/profile-layout/text.mjs",
    "scripts/profile-layout/geometry.mjs",
    "scripts/profile-layout/components.mjs",
    "scripts/profile-layout/calendar.mjs",
    "test/fixture-stats.json",
    "test/profile.test.mjs",
    "test/responsive-picture.test.mjs",
    "test/text-layout.test.mjs",
    "test/component-layout.test.mjs",
    "test/calendar-layout.test.mjs",
    "test/responsive-renderer.test.mjs",
]
FIXED_TIME = (2026, 1, 1, 0, 0, 0)


def package(output: pathlib.Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    zip_path = output / "profile-runtime.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for relative in sorted(FILES):
            source = ROOT / relative
            if not source.is_file():
                raise FileNotFoundError(relative)
            info = zipfile.ZipInfo(relative, FIXED_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, source.read_bytes())

    payload = zip_path.read_bytes()
    digest = hashlib.sha256(payload).hexdigest()
    (output / "profile-source.sha256").write_text(f"{digest}\n", encoding="utf-8")
    encoded = base64.b64encode(payload)
    for index in range(0, len(encoded), 7000):
        chunk = encoded[index : index + 7000]
        (output / f"profile-source.b64.{index // 7000:02d}").write_bytes(chunk)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=pathlib.Path, required=True)
    args = parser.parse_args()
    package(args.output)


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: existing tests plus deterministic-package test pass.

- [ ] **Step 6: Generate and install the deterministic package**

```bash
rm -rf .profile-package
python3 scripts/package-profile-runtime.py --output .profile-package
rm -f source/profile-source.b64.*
cp .profile-package/profile-source.b64.* source/
cp .profile-package/profile-source.sha256 source/
```

- [ ] **Step 7: Make the workflow read the hash file**

In `.github/workflows/update-profile.yml`, remove the hard-coded `PROFILE_SOURCE_SHA256` environment value. In `Restore validated generator source`, use:

```bash
expected_sha256="$(tr -d '[:space:]' < source/profile-source.sha256)"
actual_sha256="$(sha256sum .profile-runtime.zip | cut -d' ' -f1)"
if [[ "${actual_sha256}" != "${expected_sha256}" ]]; then
  echo "::error::Profile generator source failed its integrity check."
  exit 1
fi
```

- [ ] **Step 8: Update `.gitignore`**

Add:

```gitignore
.profile-package/
preview-output/
```

- [ ] **Step 9: Commit the source-of-truth restoration**

```bash
git add scripts test source .github/workflows/update-profile.yml .gitignore
git commit -m "build(profile): make runtime package reproducible"
```

---

### Task 3: Add typography, spacing and geometry tokens

**Files:**
- Create: `scripts/profile-layout/tokens.mjs`
- Create: `test/text-layout.test.mjs`

**Interfaces:**
- Produces: `THEMES`, `VARIANTS`, `TYPE`, `SPACE`, `getTheme(name)`, `getVariant(name)`.
- Consumed by: all layout and rendering tasks.

- [ ] **Step 1: Write the failing token tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { getTheme, getVariant, TYPE } from "../scripts/profile-layout/tokens.mjs";

test("responsive variants use approved viewport-native widths", () => {
  assert.equal(getVariant("desktop").width, 720);
  assert.equal(getVariant("compact").width, 600);
  assert.equal(getVariant("mobile").width, 360);
});

test("minimum rendered type never falls below the approved floor", () => {
  assert.ok(TYPE.metricNote.size >= 12);
  assert.ok(TYPE.calendarLabel.size >= 12);
  assert.ok(TYPE.focus.size >= 13);
});

test("approved dark and light backgrounds remain locked", () => {
  assert.equal(getTheme("dark").background, "#06131f");
  assert.equal(getTheme("light").background, "#ffffff");
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --test test/text-layout.test.mjs
```

Expected: FAIL because `tokens.mjs` does not exist.

- [ ] **Step 3: Implement the locked token module**

```js
// scripts/profile-layout/tokens.mjs
export const SPACE = Object.freeze({ xs: 6, sm: 8, md: 12, lg: 16, xl: 24 });

export const TYPE = Object.freeze({
  name: { size: 32, weight: 740, lineHeight: 38 },
  username: { size: 19, weight: 520, lineHeight: 24 },
  headline: { size: 16, weight: 620, lineHeight: 21 },
  supporting: { size: 14, weight: 470, lineHeight: 19 },
  section: { size: 22, weight: 720, lineHeight: 27 },
  capability: { size: 16, weight: 650, lineHeight: 20 },
  pill: { size: 14, weight: 560, lineHeight: 18 },
  category: { size: 13, weight: 720, lineHeight: 17, letterSpacing: 0.25 },
  chip: { size: 14, weight: 520, lineHeight: 18 },
  metricLabel: { size: 13, weight: 560, lineHeight: 17 },
  metricValue: { size: 24, weight: 720, lineHeight: 29 },
  metricNote: { size: 12, weight: 500, lineHeight: 15 },
  focus: { size: 13, weight: 560, lineHeight: 17 },
  calendarLabel: { size: 12, weight: 550, lineHeight: 15 },
});

export const VARIANTS = Object.freeze({
  desktop: { name: "desktop", width: 720, outer: 16, columns: 3, focusColumns: 4 },
  compact: { name: "compact", width: 600, outer: 16, columns: 2, focusColumns: 2 },
  mobile: { name: "mobile", width: 360, outer: 12, columns: 1, focusColumns: 2 },
});

export const THEMES = Object.freeze({
  dark: {
    background: "#06131f", panel: "#0b2030", card: "#0c2232", border: "#243c4b",
    text: "#f4f7fb", muted: "#9ba8b6", emptyContribution: "#161b22",
    contribution: ["#0e4429", "#006d32", "#26a641", "#39d353"],
  },
  light: {
    background: "#ffffff", panel: "#f6f8fa", card: "#ffffff", border: "#d0d7de",
    text: "#1f2328", muted: "#59636e", emptyContribution: "#ebedf0",
    contribution: ["#9be9a8", "#40c463", "#30a14e", "#216e39"],
  },
});

export function getVariant(name) {
  const variant = VARIANTS[name];
  if (!variant) throw new Error(`Unsupported profile variant: ${name}`);
  return variant;
}

export function getTheme(name) {
  const theme = THEMES[name];
  if (!theme) throw new Error(`Unsupported profile theme: ${name}`);
  return theme;
}
```

- [ ] **Step 4: Run the tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/profile-layout/tokens.mjs test/text-layout.test.mjs
git commit -m "feat(profile): add responsive layout tokens"
```

---

### Task 4: Implement deterministic text measurement, wrapping and geometry diagnostics

**Files:**
- Create: `scripts/profile-layout/text.mjs`
- Create: `scripts/profile-layout/geometry.mjs`
- Modify: `test/text-layout.test.mjs`

**Interfaces:**
- Produces:
  - `measureText(text, style): number`
  - `wrapText(text, options): { lines, width, height }`
  - `textBox(lines, options): { x, y, width, height, lines, markup }`
  - `createDiagnostics(viewBox): Diagnostics`
  - `assertDiagnostics(diagnostics): void`
- Consumed by: all component renderers and geometry tests.

- [ ] **Step 1: Add failing measurement and wrapping tests**

```js
import { measureText, wrapText } from "../scripts/profile-layout/text.mjs";

const style = { size: 14, weight: 520, lineHeight: 18, letterSpacing: 0 };

test("technology labels are measured conservatively", () => {
  assert.ok(measureText("PostgreSQL", style) > measureText("D1", style));
  assert.ok(measureText("Cloudflare Workers", style) > 100);
});

test("wrapping preserves words and respects max lines", () => {
  assert.deepEqual(
    wrapText("Public-interest Technology", { maxWidth: 120, maxLines: 2, style }).lines,
    ["Public-interest", "Technology"],
  );
});

test("unfittable text fails rather than shrinking below the minimum", () => {
  assert.throws(
    () => wrapText("AnUnbreakableLabelThatCannotFit", { maxWidth: 40, maxLines: 2, style }),
    /cannot fit/,
  );
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --test test/text-layout.test.mjs
```

Expected: FAIL because the text module does not exist.

- [ ] **Step 3: Implement conservative text measurement and wrapping**

```js
// scripts/profile-layout/text.mjs
const NARROW = /[ilI1|!.,:'`]/;
const WIDE = /[MW@#%&]/;
const UPPER = /[A-Z]/;
const DIGIT = /[0-9]/;

function glyphWidthEm(character) {
  if (character === " ") return 0.30;
  if (NARROW.test(character)) return 0.32;
  if (WIDE.test(character)) return 0.88;
  if (UPPER.test(character)) return 0.66;
  if (DIGIT.test(character)) return 0.58;
  return 0.56;
}

export function measureText(text, style) {
  const source = String(text);
  const weightFactor = Number(style.weight) >= 650 ? 1.035 : 1;
  const glyphs = [...source].reduce((sum, character) => sum + glyphWidthEm(character), 0);
  const spacing = Math.max(0, source.length - 1) * Number(style.letterSpacing ?? 0);
  return glyphs * Number(style.size) * weightFactor + spacing + 1.5;
}

export function wrapText(text, { maxWidth, maxLines, style }) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: [], width: 0, height: 0 };
  const lines = [];
  let current = "";

  for (const word of words) {
    if (measureText(word, style) > maxWidth) {
      throw new Error(`Text cannot fit without breaking a word: ${word}`);
    }
    const candidate = current ? `${current} ${word}` : word;
    if (measureText(candidate, style) <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    throw new Error(`Text cannot fit within ${maxLines} lines: ${text}`);
  }

  return {
    lines,
    width: Math.max(...lines.map((line) => measureText(line, style))),
    height: lines.length * style.lineHeight,
  };
}
```

- [ ] **Step 4: Add geometry boxes and fail-closed diagnostics**

```js
// scripts/profile-layout/geometry.mjs
export function box(x, y, width, height, owner, kind = "component") {
  return { x, y, width, height, owner, kind };
}

export function contains(parent, child, tolerance = 0.01) {
  return child.x >= parent.x - tolerance
    && child.y >= parent.y - tolerance
    && child.x + child.width <= parent.x + parent.width + tolerance
    && child.y + child.height <= parent.y + parent.height + tolerance;
}

export function intersects(first, second, tolerance = 0.01) {
  return first.x < second.x + second.width - tolerance
    && first.x + first.width > second.x + tolerance
    && first.y < second.y + second.height - tolerance
    && first.y + first.height > second.y + tolerance;
}

export function createDiagnostics(viewBox) {
  return { viewBox, components: [], text: [], allowedOverlaps: new Set() };
}

export function assertDiagnostics(diagnostics) {
  const errors = [];
  for (const item of [...diagnostics.components, ...diagnostics.text]) {
    if (!contains(diagnostics.viewBox, item)) errors.push(`${item.owner} leaves the SVG view box.`);
  }
  for (const text of diagnostics.text) {
    const owner = diagnostics.components.find((candidate) => candidate.owner === text.owner);
    if (!owner || !contains(owner, text)) errors.push(`${text.owner} text leaves its component.`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
}
```

- [ ] **Step 5: Add text-box vertical-centering tests**

Test a one-line and two-line label in the same 104 px card and assert the line-group centre equals the card centre within 0.5 px.

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/profile-layout/text.mjs scripts/profile-layout/geometry.mjs test/text-layout.test.mjs
git commit -m "feat(profile): add measured text and geometry diagnostics"
```

---

### Task 5: Rebuild hero, pills and capability cards as measured components

**Files:**
- Create: `scripts/profile-layout/components.mjs`
- Create: `test/component-layout.test.mjs`
- Modify: `scripts/render-profile.mjs`

**Interfaces:**
- Produces:
  - `renderHero(context): LayoutNode`
  - `renderPillGroup(context, labels): LayoutNode`
  - `renderCapabilityGrid(context, items): LayoutNode`
- `LayoutNode` shape: `{ width, height, markup, components, text }`.
- Consumed by: `renderProfileWithDiagnostics`.

- [ ] **Step 1: Write failing component tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createContext, renderCapabilityGrid, renderPillGroup } from "../scripts/profile-layout/components.mjs";

const pills = ["Portfolio-first", "AI systems", "Hosting & edge", "Open to collaborate", "Public-interest tech"];
const capabilities = [
  "AI & Intelligent Systems", "Websites & Digital Experiences", "Web Applications & SaaS",
  "APIs, MCP Servers & Plugins", "Hosting & Edge Platforms", "Data & Backend Systems",
  "Workflow & Automation", "Public-interest Technology", "Applied R&D",
];

for (const variant of ["desktop", "compact", "mobile"]) {
  test(`${variant} pills remain inside equal-height rows`, () => {
    const result = renderPillGroup(createContext({ variant, theme: "dark" }), pills);
    assert.ok(result.components.every((item) => item.height === result.components[0].height));
    assert.ok(result.text.every((item) => item.width <= item.maxWidth));
  });

  test(`${variant} capability labels fit and use the approved column count`, () => {
    const result = renderCapabilityGrid(createContext({ variant, theme: "dark" }), capabilities);
    const expectedColumns = { desktop: 3, compact: 2, mobile: 1 }[variant];
    assert.equal(result.columns, expectedColumns);
    assert.ok(result.text.every((item) => item.width <= item.maxWidth && item.lines.length <= 2));
  });
}
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --test test/component-layout.test.mjs
```

Expected: FAIL because component functions do not exist.

- [ ] **Step 3: Implement the shared context and component result shape**

```js
// scripts/profile-layout/components.mjs
import { getTheme, getVariant, SPACE, TYPE } from "./tokens.mjs";
import { box } from "./geometry.mjs";
import { measureText, wrapText } from "./text.mjs";

export function createContext({ variant, theme }) {
  return { variant: getVariant(variant), theme: getTheme(theme), SPACE, TYPE };
}

function node({ width, height, markup, components = [], text = [], columns = 1 }) {
  return { width, height, markup, components, text, columns };
}
```

- [ ] **Step 4: Implement content-sized portfolio pills**

Pill width formula:

```js
const width = Math.ceil(measureText(label, TYPE.pill) + SPACE.lg * 2 + 14);
```

Flow pills into centred rows. Each row uses one 36 px rendered height and 8 px gap. The implementation must not assign a single hard-coded width to all five labels.

- [ ] **Step 5: Implement equal capability cards with grouped vertical centring**

For each variant:

```js
const columns = context.variant.columns;
const gap = context.variant.name === "mobile" ? 8 : 10;
const innerWidth = context.variant.width - context.variant.outer * 2;
const cardWidth = (innerWidth - gap * (columns - 1)) / columns;
const cardHeight = context.variant.name === "mobile" ? 72 : 82;
const iconColumn = context.variant.name === "mobile" ? 48 : 56;
const label = wrapText(item.label, {
  maxWidth: cardWidth - iconColumn - SPACE.lg,
  maxLines: 2,
  style: TYPE.capability,
});
const textTop = cardY + (cardHeight - label.height) / 2;
```

Register both card and text boxes in diagnostics.

- [ ] **Step 6: Refactor only the hero/pill/capability portion of `render-profile.mjs`**

Add:

```js
export function renderProfileWithDiagnostics(stats, themeName, variantName = "desktop") {
  const context = createContext({ variant: variantName, theme: themeName });
  // Compose measured nodes in vertical order; remaining legacy sections stay temporarily below.
}

export function renderProfile(stats, themeName, variantName = "desktop") {
  return renderProfileWithDiagnostics(stats, themeName, variantName).svg;
}
```

Keep legacy technology, activity and focus markup unchanged in this task. This isolates the first component migration.

- [ ] **Step 7: Run focused and full tests**

```bash
node --test test/component-layout.test.mjs
npm test
```

Expected: PASS; desktop output remains recognisably identical in colour and content.

- [ ] **Step 8: Commit**

```bash
git add scripts/profile-layout/components.mjs scripts/render-profile.mjs test/component-layout.test.mjs
git commit -m "feat(profile): measure hero pills and capability cards"
```

---

### Task 6: Rebuild technology, metric and focus sections with uniform layout rules

**Files:**
- Modify: `scripts/profile-layout/components.mjs`
- Modify: `scripts/render-profile.mjs`
- Modify: `test/component-layout.test.mjs`

**Interfaces:**
- Produces:
  - `renderTechnologySection(context, groups): LayoutNode`
  - `renderMetricGrid(context, metrics): LayoutNode`
  - `renderFocusGrid(context, items): LayoutNode`

- [ ] **Step 1: Add failing technology-chip tests**

```js
const technologyGroups = [
  { label: "LANGUAGES", items: ["TypeScript", "JavaScript", "Python", "SQL", "Bash", "PowerShell"] },
  { label: "WEB & FRAMEWORKS", items: ["React", "Next.js", "Remix", "Vite", "Astro", "SvelteKit", "Express.js", "NestJS"] },
  { label: "DATA & INFRASTRUCTURE", items: ["PostgreSQL", "Supabase", "Cloudflare Workers", "Redis", "D1", "KV", "Docker", "Vercel"] },
  { label: "WORKFLOW & TOOLS", items: ["GitHub Actions", "Tailwind CSS", "Shadcn/UI", "ESLint", "Prettier", "Vitest", "Playwright"] },
  { label: "INTEGRATIONS & APIS", items: ["REST APIs", "GraphQL", "WebSockets", "MCP", "CI/CD", "Codex"] },
];

test("chip widths are based on measured content and uniform padding", () => {
  const result = renderTechnologySection(createContext({ variant: "desktop", theme: "dark" }), technologyGroups);
  const postgres = result.components.find((item) => item.owner === "technology:PostgreSQL");
  const d1 = result.components.find((item) => item.owner === "technology:D1");
  assert.ok(postgres.width > d1.width);
  assert.equal(postgres.paddingLeft, d1.paddingLeft);
  assert.equal(postgres.paddingRight, d1.paddingRight);
});
```

Also assert every category label fits its panel and each chip text is vertically centred.

- [ ] **Step 2: Add failing metric hierarchy tests**

```js
test("metric values remain subordinate to the section heading", () => {
  assert.ok(TYPE.metricValue.size < TYPE.section.size + 3);
});

test("six-digit metrics fit every responsive card", () => {
  const metrics = [{ label: "Contributions", value: "999,999", notes: ["All time"] }];
  for (const variant of ["desktop", "compact", "mobile"]) {
    const result = renderMetricGrid(createContext({ variant, theme: "dark" }), metrics);
    assert.ok(result.text.every((item) => item.width <= item.maxWidth));
  }
});
```

- [ ] **Step 3: Add failing focus-grid tests**

Assert:

- desktop → four columns by two rows;
- compact/mobile → two columns by four rows;
- all labels use the same maximum line count and vertical centre;
- the final row remains within the section box.

- [ ] **Step 4: Implement content-sized technology chips**

```js
const chipWidth = Math.ceil(
  SPACE.sm + 10 + SPACE.xs + measureText(item.label, TYPE.chip) + SPACE.sm,
);
```

Use a row-flow algorithm that moves a chip to the next line when `cursorX + chipWidth > rowRight`. For mobile, place the category label above its chip flow; for desktop and compact, use a measured category column only when the longest category label fits at the minimum font size.

- [ ] **Step 5: Implement metric cards**

Use equal card widths and heights within each variant. Set the number baseline from measured line groups, not absolute copied coordinates. Use 4×2 metrics for desktop, 2×4 for compact and mobile. Permit two note lines, for example `74 open` and `27 closed`.

- [ ] **Step 6: Implement focus cards**

Each focus item receives its own cell with icon, divider and a maximum three-line centred label. Do not render eight labels across a single mobile row.

- [ ] **Step 7: Remove the corresponding legacy fragments from `render-profile.mjs`**

The orchestrator should now compose only component nodes and separators. No section may contain raw copied `x` positions for individual labels.

- [ ] **Step 8: Run tests**

```bash
node --test test/component-layout.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add scripts/profile-layout/components.mjs scripts/render-profile.mjs test/component-layout.test.mjs
git commit -m "feat(profile): align technology metrics and focus grids"
```

---

### Task 7: Collect and validate GitHub contribution levels

**Files:**
- Modify: `scripts/generate-profile.mjs`
- Modify: `scripts/stats-policy.mjs`
- Modify: `test/fixture-stats.json`
- Modify: `test/profile.test.mjs`

**Interfaces:**
- Changes each contribution day from `{ date, count }` to `{ date, count, level }`.
- Allowed levels: `NONE`, `FIRST_QUARTILE`, `SECOND_QUARTILE`, `THIRD_QUARTILE`, `FOURTH_QUARTILE`.

- [ ] **Step 1: Add a failing collector test**

In the existing mocked GraphQL collector test, return:

```js
{ date: "2026-08-30", contributionCount: 12, contributionLevel: "THIRD_QUARTILE" }
```

Assert:

```js
assert.deepEqual(stats.contributions.last365Days.at(-1), {
  date: "2026-08-30",
  count: 12,
  level: "THIRD_QUARTILE",
});
```

- [ ] **Step 2: Add failing policy tests**

```js
const invalid = structuredClone(fixture);
invalid.contributions.last365Days[0].level = "EXTREME";
assert.throws(() => validateStats(invalid), /invalid contribution level/);
```

- [ ] **Step 3: Run tests and confirm failure**

```bash
npm test
```

Expected: FAIL because the collector ignores `contributionLevel` and policy does not require it.

- [ ] **Step 4: Extend the GraphQL query**

Change:

```graphql
contributionDays { date contributionCount }
```

To:

```graphql
contributionDays { date contributionCount contributionLevel }
```

Store both values:

```js
daily.set(day.date, {
  count: Math.max(daily.get(day.date)?.count ?? 0, day.contributionCount),
  level: day.contributionLevel,
});
```

When constructing the 365-day array, use:

```js
const value = daily.get(date) ?? { count: 0, level: "NONE" };
last365Days.push({ date, count: value.count, level: value.level });
```

- [ ] **Step 5: Validate the level in `stats-policy.mjs`**

```js
const CONTRIBUTION_LEVELS = new Set([
  "NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE",
]);

if (!CONTRIBUTION_LEVELS.has(day.level)) {
  throw new Error(`Contribution history contains an invalid contribution level for ${day.date}.`);
}
if ((day.count === 0) !== (day.level === "NONE")) {
  throw new Error(`Contribution count and level do not reconcile for ${day.date}.`);
}
```

- [ ] **Step 6: Update fixture days**

Assign levels from their fixture counts only for fixture construction:

- 0 → `NONE`;
- 1–4 → `FIRST_QUARTILE`;
- 5–14 → `SECOND_QUARTILE`;
- 15–39 → `THIRD_QUARTILE`;
- 40+ → `FOURTH_QUARTILE`.

Runtime rendering must use the GitHub-provided level, not these fixture thresholds.

- [ ] **Step 7: Run tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add scripts/generate-profile.mjs scripts/stats-policy.mjs test/fixture-stats.json test/profile.test.mjs
git commit -m "feat(profile): collect GitHub contribution levels"
```

---

### Task 8: Implement the rolling GitHub-style 53×7 contribution calendar

**Files:**
- Create: `scripts/profile-layout/calendar.mjs`
- Create: `test/calendar-layout.test.mjs`
- Modify: `scripts/render-profile.mjs`

**Interfaces:**
- Produces:
  - `buildCalendarWeeks(days): CalendarWeek[53]`
  - `buildMonthLabels(weeks): MonthLabel[]`
  - `renderContributionCalendar(context, days): LayoutNode`

- [ ] **Step 1: Write failing week-construction tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { buildCalendarWeeks, buildMonthLabels, levelIndex } from "../scripts/profile-layout/calendar.mjs";
import fixture from "./fixture-stats.json" with { type: "json" };

test("365 consecutive days produce exactly 53 Sunday-to-Saturday columns", () => {
  const weeks = buildCalendarWeeks(fixture.contributions.last365Days);
  assert.equal(weeks.length, 53);
  assert.ok(weeks.every((week) => week.days.length === 7));
  assert.equal(weeks[0].days[0].weekday, 0);
  assert.equal(weeks.at(-1).days.at(-1).weekday, 6);
});

test("GitHub contribution levels map directly to five palette indices", () => {
  assert.equal(levelIndex("NONE"), 0);
  assert.equal(levelIndex("FIRST_QUARTILE"), 1);
  assert.equal(levelIndex("FOURTH_QUARTILE"), 4);
});

test("month labels are chronological and anchored to their first visible week", () => {
  const labels = buildMonthLabels(buildCalendarWeeks(fixture.contributions.last365Days));
  assert.ok(labels.every((label, index) => index === 0 || label.column > labels[index - 1].column));
  assert.equal(new Set(labels.map((label) => `${label.year}-${label.month}`)).size, labels.length);
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
node --test test/calendar-layout.test.mjs
```

Expected: FAIL because the calendar module does not exist.

- [ ] **Step 3: Implement calendar week construction**

```js
export function buildCalendarWeeks(days) {
  if (!Array.isArray(days) || days.length !== 365) throw new Error("Calendar requires 365 days.");
  const first = new Date(`${days[0].date}T00:00:00Z`);
  const prefix = first.getUTCDay();
  const cells = [
    ...Array.from({ length: prefix }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push({
      column: weeks.length,
      days: cells.slice(index, index + 7).map((day, weekday) => ({ day, weekday })),
    });
  }
  if (weeks.length !== 53) throw new Error(`Expected 53 contribution weeks, received ${weeks.length}.`);
  return weeks;
}
```

- [ ] **Step 4: Implement month label placement**

Walk columns left to right. Add a label at the first column containing day `1` of a month. If two labels would overlap at the configured label width, suppress the later label rather than shifting it onto unrelated weeks. Include year in the identity so January after December is distinct.

- [ ] **Step 5: Implement the palette mapping**

```js
const LEVELS = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];
export function levelIndex(level) {
  const index = LEVELS.indexOf(level);
  if (index < 0) throw new Error(`Unsupported contribution level: ${level}`);
  return index;
}
```

- [ ] **Step 6: Render each responsive calendar**

Use variant-specific cell sizes, never scale a completed calendar panel:

```js
const geometry = {
  desktop: { cell: 7, gap: 2, left: 34, top: 28 },
  compact: { cell: 8, gap: 2, left: 34, top: 30 },
  mobile: { cell: 4.7, gap: 1.5, left: 28, top: 28 },
}[context.variant.name];
```

For each cell:

```js
const paletteIndex = levelIndex(day?.level ?? "NONE");
const fill = paletteIndex === 0
  ? context.theme.emptyContribution
  : context.theme.contribution[paletteIndex - 1];
```

Render only Monday, Wednesday and Friday labels. Place `Less`, five cells and `More` on one baseline beneath the grid.

- [ ] **Step 7: Add collision and containment assertions**

Tests must assert no month label intersects a cell, the legend is inside the panel and the grid’s right edge is inside the component.

- [ ] **Step 8: Replace the legacy contribution graph in `render-profile.mjs`**

Remove count-threshold colour logic and manually positioned month names. Compose the new calendar node from the same 365-day dataset.

- [ ] **Step 9: Run tests**

```bash
node --test test/calendar-layout.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add scripts/profile-layout/calendar.mjs scripts/render-profile.mjs test/calendar-layout.test.mjs
git commit -m "feat(profile): match GitHub contribution calendar levels"
```

---

### Task 9: Generate six responsive assets and the responsive README

**Files:**
- Modify: `scripts/generate-profile.mjs`
- Modify: `README.template.md`
- Create: `test/responsive-renderer.test.mjs`
- Modify: `test/profile.test.mjs`

**Interfaces:**
- Produces six SVGs:
  - `profile-desktop-light.svg`
  - `profile-desktop-dark.svg`
  - `profile-compact-light.svg`
  - `profile-compact-dark.svg`
  - `profile-mobile-light.svg`
  - `profile-mobile-dark.svg`

- [ ] **Step 1: Write the failing six-asset generation test**

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fixture from "./fixture-stats.json" with { type: "json" };
import { generateFromStats } from "../scripts/generate-profile.mjs";

test("fixture generation publishes all responsive theme variants", async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), "profile-responsive-"));
  try {
    await generateFromStats(fixture, output);
    for (const variant of ["desktop", "compact", "mobile"]) {
      for (const theme of ["light", "dark"]) {
        const svg = await readFile(path.join(output, "assets", `profile-${variant}-${theme}.svg`), "utf8");
        assert.match(svg, new RegExp(`data-variant="${variant}"`));
        assert.match(svg, new RegExp(`data-theme="${theme}"`));
      }
    }
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Add failing README assertions**

Assert all six asset names and all six media conditions occur in the approved order. Assert the fallback is `profile-desktop-light.svg`.

- [ ] **Step 3: Run and confirm failure**

```bash
node --test test/responsive-renderer.test.mjs
```

Expected: FAIL because only two legacy assets are generated.

- [ ] **Step 4: Update `generateFromStats`**

```js
const renders = [];
for (const variant of ["desktop", "compact", "mobile"]) {
  for (const theme of ["light", "dark"]) {
    const rendered = renderProfileWithDiagnostics(stats, theme, variant);
    assertDiagnostics(rendered.diagnostics);
    renders.push({ variant, theme, svg: rendered.svg });
  }
}
```

Write every asset into staging, then atomically rename all six assets, `stats.json` and `README.md` only after every render and verification succeeds.

- [ ] **Step 5: Replace `README.template.md` with the proven source order**

Use the exact media conditions from Task 1 and final asset names. Keep `width="100%"`; responsiveness now comes from selecting a native geometry rather than shrinking one 1,200 px poster.

- [ ] **Step 6: Add metadata to each SVG root**

```svg
<svg ... data-variant="desktop" data-theme="dark">
```

- [ ] **Step 7: Run tests**

```bash
npm test
npm run generate -- --fixture test/fixture-stats.json --output preview-output/fixture
```

Expected: six valid SVGs plus README and stats snapshot.

- [ ] **Step 8: Commit**

```bash
git add scripts/generate-profile.mjs README.template.md test/responsive-renderer.test.mjs test/profile.test.mjs
git commit -m "feat(profile): generate responsive theme variants"
```

---

### Task 10: Update output verification, issue aggregation and workflow publication

**Files:**
- Modify: `scripts/verify-public-output.mjs`
- Modify: `scripts/update-repository-issue-metrics.mjs`
- Modify: `test/repository-issue-metrics.test.mjs`
- Modify: `.github/workflows/update-profile.yml`

**Interfaces:**
- `verifyPublicOutput` validates eight public files: README, six SVGs and stats.
- `updateRepositoryIssueMetrics` replaces the Issues card in all six SVGs.

- [ ] **Step 1: Write failing issue-update coverage**

Generate six minimal SVG fixtures, call `updateRepositoryIssueMetrics`, and assert every asset contains the same total/open/closed values. Assert absence of any one asset fails closed.

- [ ] **Step 2: Write failing public-output coverage**

Assert `verifyPublicOutput` rejects:

- a missing mobile asset;
- a duplicate light/dark asset;
- wrong source ordering;
- a legacy `profile-light.svg` reference;
- a text box marked outside its component in diagnostics metadata;
- Equitable Journeys or any denylisted term.

- [ ] **Step 3: Run and confirm failure**

```bash
node --test test/repository-issue-metrics.test.mjs test/responsive-renderer.test.mjs
```

Expected: FAIL because current code handles only two assets.

- [ ] **Step 4: Centralise the responsive asset list**

Create and export in `scripts/generate-profile.mjs` or a small shared constant in `tokens.mjs`:

```js
export const PROFILE_ASSETS = Object.freeze(
  ["desktop", "compact", "mobile"].flatMap((variant) =>
    ["light", "dark"].map((theme) => `assets/profile-${variant}-${theme}.svg`),
  ),
);
```

Use this exact list in generation, verification, issue replacement and workflow staging.

- [ ] **Step 5: Update public-output verification**

For each asset, require:

- valid SVG root;
- matching `data-variant` and `data-theme`;
- approved theme background;
- all locked content labels;
- no forbidden text;
- no placeholder values;
- no repository URL or credential-shaped material.

Require exactly six `<source>` elements plus one fallback `<img>` in README.

- [ ] **Step 6: Update issue aggregation**

Read and patch every path in `PROFILE_ASSETS`. Preserve the current repository-wide issue aggregation and do not disclose owner or repository names.

- [ ] **Step 7: Update the workflow**

The workflow must:

```bash
git add README.md assets/profile-*-light.svg assets/profile-*-dark.svg assets/stats.json
```

Verification must call `verifyPublicOutput` and retain the current safe rebase/retry publication loop. Keep the hourly schedule unchanged.

- [ ] **Step 8: Run tests**

```bash
npm test
node scripts/generate-profile.mjs --fixture test/fixture-stats.json --output preview-output/fixture
node scripts/verify-public-output.mjs preview-output/fixture
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add scripts/verify-public-output.mjs scripts/update-repository-issue-metrics.mjs test/repository-issue-metrics.test.mjs .github/workflows/update-profile.yml
git commit -m "fix(profile): verify and publish all responsive assets"
```

---

### Task 11: Add raster previews, geometry reports and visual regression evidence

**Files:**
- Modify: `package.json`
- Create: `package-lock.json`
- Create: `scripts/render-responsive-previews.mjs`
- Create: `test/visual-regression.test.mjs`
- Create: `.github/workflows/profile-responsive-preview.yml`

**Interfaces:**
- Produces PNG previews and `layout-diagnostics.json` under `preview-output/`.
- Does not write to `main` or publish profile assets.

- [ ] **Step 1: Add the exact preview dependency**

```bash
npm install --save-dev --save-exact sharp@0.34.3
```

Confirm `package-lock.json` is created and `npm ci` succeeds on Node 24.18.1.

- [ ] **Step 2: Write the failing preview-generation test**

```js
import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { renderPreviews } from "../scripts/render-responsive-previews.mjs";

test("preview generation creates light and dark evidence at all approved widths", async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), "profile-previews-"));
  try {
    await renderPreviews({ source: "preview-output/fixture", output });
    for (const width of [1440, 1024, 768, 430, 375]) {
      for (const theme of ["light", "dark"]) {
        await access(path.join(output, `${width}-${theme}.png`));
      }
    }
    await access(path.join(output, "layout-diagnostics.json"));
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
```

- [ ] **Step 3: Run and confirm failure**

```bash
node --test test/visual-regression.test.mjs
```

Expected: FAIL because the preview renderer does not exist.

- [ ] **Step 4: Implement preview rendering with the intended README content widths**

```js
// scripts/render-responsive-previews.mjs
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CASES = [
  { viewport: 1440, variant: "desktop", contentWidth: 720 },
  { viewport: 1024, variant: "desktop", contentWidth: 600 },
  { viewport: 768, variant: "compact", contentWidth: 560 },
  { viewport: 430, variant: "mobile", contentWidth: 398 },
  { viewport: 375, variant: "mobile", contentWidth: 343 },
];

export async function renderPreviews({ source, output }) {
  await mkdir(output, { recursive: true });
  for (const item of CASES) {
    for (const theme of ["light", "dark"]) {
      const input = path.join(source, "assets", `profile-${item.variant}-${theme}.svg`);
      await sharp(await readFile(input))
        .resize({ width: item.contentWidth, withoutEnlargement: false })
        .png()
        .toFile(path.join(output, `${item.viewport}-${theme}.png`));
    }
  }
}
```

Extend this file to write each renderer’s diagnostics and effective font sizes to `layout-diagnostics.json`.

- [ ] **Step 5: Add package scripts**

```json
"preview": "node scripts/render-responsive-previews.mjs",
"test:visual": "node --test test/visual-regression.test.mjs"
```

- [ ] **Step 6: Add a read-only branch preview workflow**

```yaml
name: Profile responsive preview

on:
  push:
    branches:
      - profile-responsive-layout-20260831
  workflow_dispatch:

permissions:
  contents: read

jobs:
  preview:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: "24.18.1"
          cache: npm
      - run: npm ci
      - run: npm test
      - run: node scripts/generate-profile.mjs --fixture test/fixture-stats.json --output preview-output/fixture
      - run: node scripts/render-responsive-previews.mjs --source preview-output/fixture --output preview-output/screenshots
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: profile-responsive-previews
          path: preview-output/screenshots
          if-no-files-found: error
          retention-days: 14
```

- [ ] **Step 7: Run all tests and generate previews locally**

```bash
npm ci
npm test
rm -rf preview-output
node scripts/generate-profile.mjs --fixture test/fixture-stats.json --output preview-output/fixture
node scripts/render-responsive-previews.mjs --source preview-output/fixture --output preview-output/screenshots
```

Expected: ten PNGs and one diagnostics JSON.

- [ ] **Step 8: Commit and push preview infrastructure**

```bash
git add package.json package-lock.json scripts/render-responsive-previews.mjs test/visual-regression.test.mjs .github/workflows/profile-responsive-preview.yml
git commit -m "test(profile): add responsive visual evidence"
git push origin profile-responsive-layout-20260831
```

- [ ] **Step 9: Human preview gate**

Download the workflow artifact and review all ten images against the approved design. Check specifically:

- pills are centred and fully contained;
- category labels fit;
- PostgreSQL, Supabase and Cloudflare Workers chips have uniform padding;
- metric numbers are subordinate to the section heading;
- no metric note leaves its card;
- every focus label is centred and readable;
- calendar labels, cells and legend align cleanly;
- the compact and mobile assets reflow instead of shrinking the desktop poster.

Do not create baselines or open a PR until Marc explicitly approves these previews.

- [ ] **Step 10: Accept approved visual baselines**

After approval, copy the ten approved PNGs to `test/baselines/`. Update `test/visual-regression.test.mjs` to render current output with `sharp`, compare equal dimensions and compute a raw per-channel difference ratio. Fail when more than 0.5% of channels differ by more than 12 intensity points:

```js
function differenceRatio(actual, baseline) {
  assert.equal(actual.length, baseline.length);
  let changed = 0;
  for (let index = 0; index < actual.length; index += 1) {
    if (Math.abs(actual[index] - baseline[index]) > 12) changed += 1;
  }
  return changed / actual.length;
}

assert.ok(differenceRatio(actual.data, baseline.data) <= 0.005);
```

- [ ] **Step 11: Commit approved baselines**

```bash
git add test/baselines test/visual-regression.test.mjs
git commit -m "test(profile): approve responsive visual baselines"
```

---

### Task 12: Rebuild the runtime archive and verify the branch end to end

**Files:**
- Modify: `source/profile-source.b64.*`
- Modify: `source/profile-source.sha256`
- Modify: `.github/workflows/update-profile.yml` if packaging validation reveals drift

**Interfaces:**
- Produces: the exact runtime package consumed by the hourly workflow.

- [ ] **Step 1: Rebuild the package from reviewed source**

```bash
rm -rf .profile-package
python3 scripts/package-profile-runtime.py --output .profile-package
rm -f source/profile-source.b64.*
cp .profile-package/profile-source.b64.* source/
cp .profile-package/profile-source.sha256 source/
```

- [ ] **Step 2: Independently reconstruct and verify the package**

```bash
rm -rf .profile-runtime .profile-runtime.zip
cat source/profile-source.b64.* | base64 --decode > .profile-runtime.zip
test "$(sha256sum .profile-runtime.zip | cut -d' ' -f1)" = "$(cat source/profile-source.sha256)"
unzip -q .profile-runtime.zip -d .profile-runtime
npm --prefix .profile-runtime test
```

Expected: SHA matches and all packaged tests pass.

- [ ] **Step 3: Run the complete root verification**

```bash
npm ci
npm test
rm -rf preview-output
node scripts/generate-profile.mjs --fixture test/fixture-stats.json --output preview-output/fixture
node scripts/verify-public-output.mjs preview-output/fixture
node scripts/render-responsive-previews.mjs --source preview-output/fixture --output preview-output/screenshots
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Commit the package artefact**

```bash
git add source
git commit -m "build(profile): package responsive renderer runtime"
```

- [ ] **Step 5: Push and verify the branch workflows**

```bash
git push origin profile-responsive-layout-20260831
```

Expected:

- `Profile responsive preview` succeeds;
- no branch workflow writes to `main`;
- preview artefact contains ten approved PNGs and diagnostics;
- no public profile files on `main` change.

- [ ] **Step 6: Compare branch to main**

```bash
git fetch origin
git diff --stat origin/main...HEAD
git diff --check origin/main...HEAD
```

Review the diff and confirm no copy, category, colour or privacy-rule changes outside this plan.

- [ ] **Step 7: Commit any evidence index**

Create `docs/superpowers/evidence/2026-08-31-github-profile-responsive-renderer.md` listing:

- branch head SHA;
- test counts;
- package SHA-256;
- preview workflow run URL;
- artifact name;
- five viewport widths and two themes;
- explicit statement that `main` remained unchanged.

Commit:

```bash
git add docs/superpowers/evidence/2026-08-31-github-profile-responsive-renderer.md
git commit -m "docs(profile): record responsive renderer evidence"
git push origin profile-responsive-layout-20260831
```

---

### Task 13: Open the review PR without changing the live profile

**Files:**
- No additional source changes unless review identifies a defect.

**Interfaces:**
- Produces: a reviewable pull request from `profile-responsive-layout-20260831` to `main`.

- [ ] **Step 1: Re-run the full verification on the final branch head**

```bash
npm ci
npm test
rm -rf preview-output
node scripts/generate-profile.mjs --fixture test/fixture-stats.json --output preview-output/fixture
node scripts/verify-public-output.mjs preview-output/fixture
node scripts/render-responsive-previews.mjs --source preview-output/fixture --output preview-output/screenshots
git diff --check origin/main...HEAD
```

Expected: all commands exit 0 with no uncommitted changes.

- [ ] **Step 2: Open the PR**

Use title:

```text
fix(profile): add responsive approved visual layouts
```

PR body must contain:

- the approved spec and plan paths;
- a statement that the design and colour scheme are unchanged;
- the feasibility probe result;
- all test counts;
- package SHA-256;
- preview artifact link;
- screenshots at 1440, 1024, 768, 430 and 375 px in light and dark;
- confirmation that Equitable Journeys remains absent;
- confirmation that repository identities remain unpublished;
- rollback instruction: revert the merge commit.

- [ ] **Step 3: Stop for final approval**

Do not merge. Marc reviews the PR and previews. Address only evidenced defects against the approved spec; do not redesign or change copy.

---

### Task 14: Merge, refresh once and verify the public profile

**Files:**
- No planned source edits.

**Interfaces:**
- Consumes: an explicitly approved PR.
- Produces: the live responsive GitHub profile and hourly automated refresh.

- [ ] **Step 1: Confirm merge prerequisites**

Require:

- explicit Marc approval;
- successful branch preview workflow;
- successful full tests;
- approved ten-image preview set;
- no unresolved review comments;
- branch current with `main`.

- [ ] **Step 2: Merge through the approved repository method**

Do not bypass branch protections and do not force-update `main`.

- [ ] **Step 3: Trigger one immediate profile refresh**

Use the `workflow_dispatch` action for `Refresh profile activity` once after merge. This is commissioning only; normal updates remain hourly.

- [ ] **Step 4: Verify the workflow**

Require every step to pass:

- checkout current branch tip;
- restore package and match SHA;
- root/package tests;
- GitHub data collection;
- repository issue aggregation;
- six-asset generation;
- public-output verification;
- safe commit/push.

- [ ] **Step 5: Verify the live public profile**

Inspect the public profile at:

- 1,440 px dark and light;
- 1,024 px dark and light;
- 768 px dark and light;
- 430 px dark and light;
- 375 px dark and light.

Confirm the intended asset by its `data-variant`, all text containment, correct rolling calendar, preserved colour scheme and absence of Equitable Journeys.

- [ ] **Step 6: Verify scheduled automation**

Confirm `.github/workflows/update-profile.yml` still contains:

```yaml
schedule:
  - cron: "17 * * * *"
```

Observe the next scheduled run and confirm that unchanged statistics produce no timestamp-only commit.

- [ ] **Step 7: Record final evidence**

Update the evidence file with:

- merge commit;
- commissioning workflow run;
- generated profile commit, if any;
- live verification screenshots;
- next scheduled run result;
- rollback commit reference.

Commit the evidence update only if it contains no confidential repository or product identity.

---

## Plan Self-Review

### Spec coverage

- Responsive source feasibility gate: Task 1.
- Reviewable deterministic source package: Task 2 and Task 12.
- Locked typography and colours: Task 3.
- Measurement, wrapping, centring and containment: Tasks 4–6.
- GitHub contribution levels and rolling calendar: Tasks 7–8.
- Six responsive assets and README source selection: Task 9.
- Public safety, issue totals and hourly publishing: Task 10.
- Five viewport widths, both themes and visual evidence: Task 11.
- Isolated branch verification and evidence: Task 12.
- Human-reviewed PR and no premature live change: Task 13.
- Controlled merge, commissioning and scheduled-run proof: Task 14.

### Placeholder scan

The plan contains no `TBD`, `TODO`, “implement later”, unspecified tests or undefined production interfaces. The human review gates have explicit evidence and stop conditions.

### Type consistency

The plan consistently uses:

- variants: `desktop | compact | mobile`;
- themes: `light | dark`;
- `LayoutNode = { width, height, markup, components, text }`;
- contribution day: `{ date, count, level }`;
- renderer: `renderProfileWithDiagnostics(stats, theme, variant)` and `renderProfile(stats, theme, variant)`;
- asset names: `assets/profile-${variant}-${theme}.svg`.
