# GitHub Profile Responsive Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the approved GitHub profile design while replacing the single continuously shrinking SVG poster with verified desktop, compact and mobile SVG layouts whose text, cards, chips, metrics and rolling contribution calendar remain aligned and readable.

**Architecture:** Retain the current GitHub API collector, approved content and colour system. Rebuild rendering around deterministic text measurement, layout diagnostics and reusable components, then generate three native geometries in light and dark themes. A branch-only `<picture>` probe must prove GitHub viewport selection before implementation proceeds, and `main` must remain unchanged until preview approval.

**Tech Stack:** Node.js 24.18.1, ECMAScript modules, SVG, GitHub REST and GraphQL APIs, GitHub Actions, Node test runner, Python 3 standard library for deterministic runtime packaging, `sharp@0.34.3` for branch preview rasterisation.

**Spec:** `docs/superpowers/specs/2026-08-31-github-profile-responsive-renderer-design.md`

## Global Constraints

- Preserve the approved navy background and cyan, blue, purple, green, amber, orange and coral accent palette.
- Preserve the ML mark, network graphic, headline, supporting copy, five portfolio pills, nine capability areas, technology ecosystem, eight activity metrics and eight “What I build” categories.
- Equitable Journeys must remain absent.
- Do not add or expose private product, repository, branch or codename identities.
- Do not replace the profile with plain Markdown.
- Generate `desktop`, `compact` and `mobile` geometries in both light and dark themes.
- Use browser viewport breakpoints: mobile below 768 px, compact from 768–1,003 px, desktop at 1,004 px and above.
- Keep hourly automatic refresh at 17 minutes past the hour; manual dispatch remains optional for immediate commissioning only.
- Never force-push generated output over newer work.
- Fail generation when text clips, geometry leaves the view box, contribution data is malformed or public-safety checks fail.
- Do not change `main` until the branch probe, tests, ten preview images and explicit preview approval are complete.

---

## File Map

### Existing files to modify

- `README.template.md` — responsive source ordering.
- `package.json` — complete test and preview scripts.
- `scripts/generate-profile.mjs` — contribution levels and six-asset output.
- `scripts/render-profile.mjs` — renderer orchestration.
- `scripts/stats-policy.mjs` — contribution-level validation.
- `scripts/update-repository-issue-metrics.mjs` — update all six assets.
- `scripts/verify-public-output.mjs` — verify all six assets and accept `--root`.
- `test/fixture-stats.json` — level-bearing contribution fixture and large metrics.
- `test/profile.test.mjs` — end-to-end renderer and collector regression tests.
- `test/repository-issue-metrics.test.mjs` — six-asset issue replacement.
- `.github/workflows/update-profile.yml` — six-asset publication.
- `.gitignore` — packaging and preview output.

### New implementation files

- `scripts/profile-layout/tokens.mjs`
- `scripts/profile-layout/text.mjs`
- `scripts/profile-layout/geometry.mjs`
- `scripts/profile-layout/components.mjs`
- `scripts/profile-layout/calendar.mjs`
- `scripts/package-profile-runtime.py`
- `scripts/render-responsive-previews.mjs`

### New tests and branch evidence

- `test/responsive-picture.test.mjs`
- `test/text-layout.test.mjs`
- `test/component-layout.test.mjs`
- `test/calendar-layout.test.mjs`
- `test/responsive-renderer.test.mjs`
- `test/runtime-package.test.mjs`
- `test/visual-regression.test.mjs`
- `test/baselines/*.png` — added only after preview approval.
- `docs/probes/responsive-picture.md` and six probe SVGs — branch-only, removed before PR.
- `.github/workflows/profile-responsive-preview.yml`
- `docs/superpowers/evidence/2026-08-31-github-profile-responsive-renderer.md`

---

### Task 1: Prove viewport and theme source selection in GitHub

**Files:**
- Create: `docs/probes/responsive-picture.md`
- Create: `docs/probes/assets/profile-probe-{desktop,compact,mobile}-{light,dark}.svg`
- Create: `test/responsive-picture.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: a verified `<picture>` source order for `README.template.md`.

- [ ] **Step 1: Write the failing source-order test**

```js
// test/responsive-picture.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("probe declares mobile, compact and desktop sources in priority order", async () => {
  const markdown = await readFile("docs/probes/responsive-picture.md", "utf8");
  const media = [
    "(prefers-color-scheme: dark) and (max-width: 767px)",
    "(prefers-color-scheme: light) and (max-width: 767px)",
    "(prefers-color-scheme: dark) and (min-width: 768px) and (max-width: 1003px)",
    "(prefers-color-scheme: light) and (min-width: 768px) and (max-width: 1003px)",
    "(prefers-color-scheme: dark) and (min-width: 1004px)",
    "(prefers-color-scheme: light) and (min-width: 1004px)",
  ];
  let cursor = -1;
  for (const value of media) {
    const next = markdown.indexOf(`media="${value}"`);
    assert.ok(next > cursor, `missing or misordered source: ${value}`);
    cursor = next;
  }
  assert.match(markdown, /profile-probe-desktop-light\.svg/);
});
```

- [ ] **Step 2: Run it and confirm failure**

```bash
node --test test/responsive-picture.test.mjs
```

Expected: FAIL because the probe file does not exist.

- [ ] **Step 3: Create six clearly labelled probe assets**

Use native widths that match realistic GitHub README content widths:

- desktop: 600 px;
- compact: 560 px;
- mobile: 343 px.

Example dark desktop file:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="150" viewBox="0 0 600 150">
  <rect width="600" height="150" rx="16" fill="#06131f"/>
  <rect x="8" y="8" width="584" height="134" rx="12" fill="none" stroke="#20c6e8" stroke-width="2"/>
  <text x="300" y="88" text-anchor="middle"
        font-family="ui-sans-serif,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"
        font-size="34" font-weight="700" fill="#f4f7fb">DESKTOP · DARK</text>
</svg>
```

- [ ] **Step 4: Create the probe Markdown**

```html
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

- [ ] **Step 5: Make root tests discover all test files**

Change `package.json`:

```json
"test": "node --test test/*.test.mjs"
```

- [ ] **Step 6: Run, commit and push**

```bash
npm test
git add docs/probes test/responsive-picture.test.mjs package.json
git commit -m "test(profile): add responsive picture feasibility probe"
git push origin profile-responsive-layout-20260831
```

Expected: tests pass; `main` is unchanged.

- [ ] **Step 7: Verify GitHub rendering manually**

In GitHub’s rendered branch file, confirm:

- 375 and 430 px browser width → `MOBILE`;
- 768 px → `COMPACT`;
- 1,024 and 1,440 px → `DESKTOP`;
- GitHub light theme → `LIGHT`;
- GitHub dark theme → `DARK`.

Record screenshots. If viewport selection fails, stop and revise the spec; do not continue with six variants that GitHub cannot select.

- [ ] **Step 8: Record the successful probe**

Append the tested widths, themes and date to `docs/probes/responsive-picture.md`, then commit:

```bash
git add docs/probes/responsive-picture.md
git commit -m "docs(profile): record responsive picture probe result"
```

---

### Task 2: Restore reviewable runtime source and deterministic packaging

**Files:**
- Create: `scripts/render-profile.mjs` from the current archive if absent
- Create: `test/fixture-stats.json` from the current archive if absent
- Create: `test/profile.test.mjs` from the current archive if absent
- Create: `scripts/package-profile-runtime.py`
- Create: `test/runtime-package.test.mjs`
- Create: `source/profile-source.sha256`
- Modify: `.github/workflows/update-profile.yml`
- Modify: `.gitignore`

**Interfaces:**
- Produces: deterministic runtime ZIP, SHA-256 and 7,000-byte base64 chunks.

- [ ] **Step 1: Restore missing root source from the current package**

```bash
rm -rf .profile-runtime .profile-runtime.zip
cat source/profile-source.b64.* | base64 --decode > .profile-runtime.zip
unzip -q .profile-runtime.zip -d .profile-runtime
cp .profile-runtime/scripts/render-profile.mjs scripts/render-profile.mjs
cp .profile-runtime/test/fixture-stats.json test/fixture-stats.json
cp .profile-runtime/test/profile.test.mjs test/profile.test.mjs
node --check scripts/render-profile.mjs
node --test test/profile.test.mjs
```

Expected: existing eight profile tests pass before renderer changes.

- [ ] **Step 2: Write the failing deterministic-package test**

```js
// test/runtime-package.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("runtime packaging is byte-for-byte deterministic", async () => {
  const first = await mkdtemp(path.join(os.tmpdir(), "profile-a-"));
  const second = await mkdtemp(path.join(os.tmpdir(), "profile-b-"));
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

- [ ] **Step 3: Run and confirm failure**

```bash
node --test test/runtime-package.test.mjs
```

Expected: FAIL because the packaging script does not exist.

- [ ] **Step 4: Implement deterministic packaging**

```python
#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import hashlib
import pathlib
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
    "test/repository-issue-metrics.test.mjs",
    "test/text-layout.test.mjs",
    "test/component-layout.test.mjs",
    "test/calendar-layout.test.mjs",
    "test/responsive-renderer.test.mjs",
]
FIXED_TIME = (2026, 1, 1, 0, 0, 0)


def package(output: pathlib.Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    zip_path = output / "profile-runtime.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
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
    for offset in range(0, len(encoded), 7000):
        (output / f"profile-source.b64.{offset // 7000:02d}").write_bytes(encoded[offset:offset + 7000])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=pathlib.Path)
    package(parser.parse_args().output)


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Make the workflow read the generated hash file**

Replace the hard-coded source hash with:

```bash
expected_sha256="$(tr -d '[:space:]' < source/profile-source.sha256)"
actual_sha256="$(sha256sum .profile-runtime.zip | cut -d' ' -f1)"
if [[ "${actual_sha256}" != "${expected_sha256}" ]]; then
  echo "::error::Profile generator source failed its integrity check."
  exit 1
fi
```

- [ ] **Step 6: Ignore local working output**

Add:

```gitignore
.profile-package/
preview-output/
```

- [ ] **Step 7: Generate and verify the package**

```bash
rm -rf .profile-package
python3 scripts/package-profile-runtime.py --output .profile-package
rm -f source/profile-source.b64.*
cp .profile-package/profile-source.b64.* source/
cp .profile-package/profile-source.sha256 source/
cat source/profile-source.b64.* | base64 --decode > .profile-runtime.zip
test "$(sha256sum .profile-runtime.zip | cut -d' ' -f1)" = "$(cat source/profile-source.sha256)"
```

- [ ] **Step 8: Run and commit**

```bash
npm test
git add scripts/render-profile.mjs scripts/package-profile-runtime.py test source .github/workflows/update-profile.yml .gitignore
git commit -m "build(profile): make runtime source reproducible"
```

---

### Task 3: Add locked layout, typography and theme tokens

**Files:**
- Create: `scripts/profile-layout/tokens.mjs`
- Create: `test/text-layout.test.mjs`

**Interfaces:**
- Produces: `SPACE`, `TYPE`, `VARIANTS`, `THEMES`, `getVariant()`, `getTheme()`.

- [ ] **Step 1: Write failing token tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { getTheme, getVariant, TYPE } from "../scripts/profile-layout/tokens.mjs";

test("variants use realistic GitHub content widths", () => {
  assert.equal(getVariant("desktop").width, 600);
  assert.equal(getVariant("compact").width, 560);
  assert.equal(getVariant("mobile").width, 343);
});

test("metric numbers remain smaller than section headings", () => {
  assert.ok(TYPE.metricValue.size < TYPE.section.size);
});

test("approved backgrounds remain locked", () => {
  assert.equal(getTheme("dark").background, "#06131f");
  assert.equal(getTheme("light").background, "#ffffff");
});
```

- [ ] **Step 2: Confirm failure**

```bash
node --test test/text-layout.test.mjs
```

Expected: FAIL because the token module does not exist.

- [ ] **Step 3: Implement tokens**

```js
export const SPACE = Object.freeze({ xs: 6, sm: 8, md: 12, lg: 16, xl: 24 });

export const TYPE = Object.freeze({
  name: { size: 32, weight: 740, lineHeight: 38 },
  username: { size: 19, weight: 520, lineHeight: 24 },
  headline: { size: 16, weight: 620, lineHeight: 21 },
  supporting: { size: 14, weight: 470, lineHeight: 19 },
  section: { size: 22, weight: 720, lineHeight: 27 },
  capability: { size: 16, weight: 650, lineHeight: 20 },
  pill: { size: 14, weight: 560, lineHeight: 18 },
  category: { size: 13.5, weight: 720, lineHeight: 17, letterSpacing: 0.25 },
  chip: { size: 14, weight: 520, lineHeight: 18 },
  metricLabel: { size: 13, weight: 560, lineHeight: 17 },
  metricValue: { size: 21, weight: 720, lineHeight: 25 },
  metricNote: { size: 12.5, weight: 500, lineHeight: 16 },
  focus: { size: 13.5, weight: 560, lineHeight: 17 },
  calendarLabel: { size: 12.5, weight: 550, lineHeight: 16 },
});

export const VARIANTS = Object.freeze({
  desktop: { name: "desktop", width: 600, outer: 14, capabilityColumns: 3, focusColumns: 4 },
  compact: { name: "compact", width: 560, outer: 14, capabilityColumns: 2, focusColumns: 2 },
  mobile: { name: "mobile", width: 343, outer: 10, capabilityColumns: 1, focusColumns: 2 },
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
  const value = VARIANTS[name];
  if (!value) throw new Error(`Unsupported profile variant: ${name}`);
  return value;
}

export function getTheme(name) {
  const value = THEMES[name];
  if (!value) throw new Error(`Unsupported profile theme: ${name}`);
  return value;
}
```

- [ ] **Step 4: Run and commit**

```bash
npm test
git add scripts/profile-layout/tokens.mjs test/text-layout.test.mjs
git commit -m "feat(profile): add responsive layout tokens"
```

---

### Task 4: Implement measured text, wrapping and geometry diagnostics

**Files:**
- Create: `scripts/profile-layout/text.mjs`
- Create: `scripts/profile-layout/geometry.mjs`
- Modify: `test/text-layout.test.mjs`

**Interfaces:**
- Produces:
  - `measureText(text, style): number`
  - `wrapText(text, options): { lines, width, height }`
  - `box(x, y, width, height, owner, kind): Box`
  - `createDiagnostics(viewBox): Diagnostics`
  - `assertDiagnostics(diagnostics): void`

- [ ] **Step 1: Add failing text-fit tests**

```js
import { measureText, wrapText } from "../scripts/profile-layout/text.mjs";

const style = { size: 14, weight: 520, lineHeight: 18, letterSpacing: 0 };

test("long technology labels measure wider than short labels", () => {
  assert.ok(measureText("Cloudflare Workers", style) > measureText("D1", style));
});

test("wrapping preserves complete words", () => {
  assert.deepEqual(
    wrapText("Public-interest Technology", { maxWidth: 115, maxLines: 2, style }).lines,
    ["Public-interest", "Technology"],
  );
});

test("unbreakable overflow fails instead of shrinking", () => {
  assert.throws(
    () => wrapText("AnUnbreakableLabelThatCannotFit", { maxWidth: 40, maxLines: 2, style }),
    /cannot fit/,
  );
});
```

- [ ] **Step 2: Confirm failure**

```bash
node --test test/text-layout.test.mjs
```

- [ ] **Step 3: Implement conservative measurement and wrapping**

```js
const NARROW = /[ilI1|!.,:'`]/;
const WIDE = /[MW@#%&]/;
const UPPER = /[A-Z]/;
const DIGIT = /[0-9]/;

function glyphEm(character) {
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
  const width = [...source].reduce((sum, character) => sum + glyphEm(character), 0);
  return width * Number(style.size) * weightFactor
    + Math.max(0, source.length - 1) * Number(style.letterSpacing ?? 0)
    + 1.5;
}

export function wrapText(text, { maxWidth, maxLines, style }) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (measureText(word, style) > maxWidth) throw new Error(`Text cannot fit: ${word}`);
    const candidate = current ? `${current} ${word}` : word;
    if (measureText(candidate, style) <= maxWidth) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) throw new Error(`Text cannot fit within ${maxLines} lines: ${text}`);
  return {
    lines,
    width: Math.max(0, ...lines.map((line) => measureText(line, style))),
    height: lines.length * style.lineHeight,
  };
}
```

- [ ] **Step 4: Implement containment diagnostics**

```js
export function box(x, y, width, height, owner, kind = "component") {
  return { x, y, width, height, owner, kind };
}

export function contains(parent, child, tolerance = 0.01) {
  return child.x >= parent.x - tolerance
    && child.y >= parent.y - tolerance
    && child.x + child.width <= parent.x + parent.width + tolerance
    && child.y + child.height <= parent.y + parent.height + tolerance;
}

export function createDiagnostics(viewBox) {
  return { viewBox, components: [], text: [] };
}

export function assertDiagnostics(diagnostics) {
  const errors = [];
  for (const item of [...diagnostics.components, ...diagnostics.text]) {
    if (!contains(diagnostics.viewBox, item)) errors.push(`${item.owner} leaves the SVG view box.`);
  }
  for (const text of diagnostics.text) {
    const owner = diagnostics.components.find((item) => item.owner === text.owner);
    if (!owner || !contains(owner, text)) errors.push(`${text.owner} text leaves its component.`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
}
```

- [ ] **Step 5: Add one-line and multiline vertical-centre tests**

Create equal-height cards and assert the centre of each measured text group differs from the card centre by no more than 0.5 px.

- [ ] **Step 6: Run and commit**

```bash
npm test
git add scripts/profile-layout/text.mjs scripts/profile-layout/geometry.mjs test/text-layout.test.mjs
git commit -m "feat(profile): add measured text and layout diagnostics"
```

---

### Task 5: Rebuild all non-calendar sections from reusable components

**Files:**
- Create: `scripts/profile-layout/components.mjs`
- Create: `test/component-layout.test.mjs`
- Modify: `scripts/render-profile.mjs`

**Interfaces:**
- Produces:
  - `createContext({ variant, theme })`
  - `renderHero(context, content)`
  - `renderPillGroup(context, labels)`
  - `renderCapabilityGrid(context, items)`
  - `renderTechnologySection(context, groups)`
  - `renderMetricGrid(context, metrics)`
  - `renderFocusGrid(context, items)`
- Every renderer returns `LayoutNode = { width, height, markup, components, text, columns }`.

- [ ] **Step 1: Write failing component geometry tests**

Use the exact approved labels. For each variant assert:

```js
const expectedColumns = { desktop: 3, compact: 2, mobile: 1 }[variant];
assert.equal(capabilities.columns, expectedColumns);
assert.ok(capabilities.text.every((item) => item.width <= item.maxWidth));
assert.ok(capabilities.text.every((item) => item.lines.length <= 2));
```

For technology chips assert:

```js
const postgres = result.components.find((item) => item.owner === "technology:PostgreSQL");
const d1 = result.components.find((item) => item.owner === "technology:D1");
assert.ok(postgres.width > d1.width);
assert.equal(postgres.paddingLeft, d1.paddingLeft);
assert.equal(postgres.paddingRight, d1.paddingRight);
```

For metrics assert a six-digit value fits all variants and `TYPE.metricValue.size < TYPE.section.size`.

For focus items assert desktop is 4×2, compact/mobile are 2×4 and all labels remain inside equal-height cells.

- [ ] **Step 2: Confirm failure**

```bash
node --test test/component-layout.test.mjs
```

- [ ] **Step 3: Implement shared context and node shape**

```js
import { getTheme, getVariant, SPACE, TYPE } from "./tokens.mjs";
import { measureText, wrapText } from "./text.mjs";

export function createContext({ variant, theme }) {
  return { variant: getVariant(variant), theme: getTheme(theme), SPACE, TYPE };
}

function node({ width, height, markup, components = [], text = [], columns = 1 }) {
  return { width, height, markup, components, text, columns };
}
```

- [ ] **Step 4: Implement content-sized pills**

```js
const pillWidth = Math.ceil(measureText(label, TYPE.pill) + SPACE.lg * 2 + 14);
```

Flow pills into centred rows. Use one shared height and padding token; do not assign five unrelated widths.

- [ ] **Step 5: Implement equal capability cards**

```js
const columns = context.variant.capabilityColumns;
const gap = context.variant.name === "mobile" ? 8 : 10;
const innerWidth = context.variant.width - context.variant.outer * 2;
const cardWidth = (innerWidth - gap * (columns - 1)) / columns;
const cardHeight = context.variant.name === "mobile" ? 72 : 82;
const text = wrapText(label, {
  maxWidth: cardWidth - 58 - SPACE.lg,
  maxLines: 2,
  style: TYPE.capability,
});
const textTop = cardY + (cardHeight - text.height) / 2;
```

- [ ] **Step 6: Implement technology category and chip flow**

```js
const chipWidth = Math.ceil(
  SPACE.sm + 10 + SPACE.xs + measureText(label, TYPE.chip) + SPACE.sm,
);
```

Move a chip to the next row when it exceeds the available right edge. On mobile place each category heading above its chips; on desktop/compact use a category column only when the measured heading fits.

- [ ] **Step 7: Implement metrics and focus items**

- desktop metric grid: 4×2;
- compact/mobile metric grid: 2×4;
- desktop focus grid: 4×2;
- compact/mobile focus grid: 2×4.

Numbers use 21 px source type and up to two 12.5 px notes. Focus labels allow three centred lines. Register every component and text box.

- [ ] **Step 8: Refactor `render-profile.mjs` to orchestration**

```js
export function renderProfileWithDiagnostics(stats, themeName, variantName = "desktop") {
  const context = createContext({ variant: variantName, theme: themeName });
  // Compose measured nodes vertically; calendar is added in Task 7.
  return { svg, diagnostics };
}

export function renderProfile(stats, themeName, variantName = "desktop") {
  return renderProfileWithDiagnostics(stats, themeName, variantName).svg;
}
```

Remove per-label absolute coordinates from migrated sections. Keep icons, copy and colours unchanged.

- [ ] **Step 9: Run and commit**

```bash
node --test test/component-layout.test.mjs
npm test
git add scripts/profile-layout/components.mjs scripts/render-profile.mjs test/component-layout.test.mjs
git commit -m "feat(profile): align measured profile components"
```

---

### Task 6: Collect and validate GitHub contribution levels

**Files:**
- Modify: `scripts/generate-profile.mjs`
- Modify: `scripts/stats-policy.mjs`
- Modify: `test/fixture-stats.json`
- Modify: `test/profile.test.mjs`

**Interfaces:**
- Contribution day becomes `{ date, count, level }`.
- Levels: `NONE`, `FIRST_QUARTILE`, `SECOND_QUARTILE`, `THIRD_QUARTILE`, `FOURTH_QUARTILE`.

- [ ] **Step 1: Add failing collector and policy tests**

Mock:

```js
{ date: "2026-08-30", contributionCount: 12, contributionLevel: "THIRD_QUARTILE" }
```

Assert the collected day contains all three fields. Set one fixture level to `EXTREME` and assert `validateStats` rejects it.

- [ ] **Step 2: Confirm failure**

```bash
npm test
```

- [ ] **Step 3: Extend the GraphQL query**

```graphql
contributionDays { date contributionCount contributionLevel }
```

Store:

```js
daily.set(day.date, { count: day.contributionCount, level: day.contributionLevel });
```

Fill absent days with `{ count: 0, level: "NONE" }`.

- [ ] **Step 4: Validate levels and count reconciliation**

```js
const LEVELS = new Set([
  "NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE",
]);
if (!LEVELS.has(day.level)) throw new Error(`Contribution history contains an invalid contribution level for ${day.date}.`);
if ((day.count === 0) !== (day.level === "NONE")) {
  throw new Error(`Contribution count and level do not reconcile for ${day.date}.`);
}
```

- [ ] **Step 5: Update fixture data**

Fixture-only mapping:

- 0 → `NONE`;
- 1–4 → `FIRST_QUARTILE`;
- 5–14 → `SECOND_QUARTILE`;
- 15–39 → `THIRD_QUARTILE`;
- 40+ → `FOURTH_QUARTILE`.

Runtime rendering uses GitHub’s returned level, not these fixture thresholds.

- [ ] **Step 6: Run and commit**

```bash
npm test
git add scripts/generate-profile.mjs scripts/stats-policy.mjs test/fixture-stats.json test/profile.test.mjs
git commit -m "feat(profile): collect GitHub contribution levels"
```

---

### Task 7: Build the GitHub-style rolling 53×7 calendar

**Files:**
- Create: `scripts/profile-layout/calendar.mjs`
- Create: `test/calendar-layout.test.mjs`
- Modify: `scripts/render-profile.mjs`

**Interfaces:**
- Produces: `buildCalendarWeeks()`, `buildMonthLabels()`, `levelIndex()`, `renderContributionCalendar()`.

- [ ] **Step 1: Write failing calendar tests**

```js
const weeks = buildCalendarWeeks(fixture.contributions.last365Days);
assert.equal(weeks.length, 53);
assert.ok(weeks.every((week) => week.days.length === 7));
assert.equal(levelIndex("NONE"), 0);
assert.equal(levelIndex("FOURTH_QUARTILE"), 4);

const labels = buildMonthLabels(weeks);
assert.ok(labels.every((label, index) => index === 0 || label.column > labels[index - 1].column));
assert.equal(new Set(labels.map((label) => `${label.year}-${label.month}`)).size, labels.length);
```

Also assert month labels do not intersect cells and the legend remains inside its panel.

- [ ] **Step 2: Confirm failure**

```bash
node --test test/calendar-layout.test.mjs
```

- [ ] **Step 3: Implement week construction**

```js
export function buildCalendarWeeks(days) {
  if (!Array.isArray(days) || days.length !== 365) throw new Error("Calendar requires 365 days.");
  const prefix = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const cells = [...Array.from({ length: prefix }, () => null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push({
      column: weeks.length,
      days: cells.slice(index, index + 7).map((day, weekday) => ({ day, weekday })),
    });
  }
  if (weeks.length !== 53) throw new Error(`Expected 53 weeks, received ${weeks.length}.`);
  return weeks;
}
```

- [ ] **Step 4: Implement direct level mapping**

```js
const LEVELS = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];
export function levelIndex(level) {
  const index = LEVELS.indexOf(level);
  if (index < 0) throw new Error(`Unsupported contribution level: ${level}`);
  return index;
}
```

- [ ] **Step 5: Position month labels from actual dates**

Add a label at the first week containing day `1` of each month. Suppress a label only when its measured box would collide with the previous label. Do not force January or December to an arbitrary edge.

- [ ] **Step 6: Render variant-specific grids**

```js
const geometry = {
  desktop: { cell: 7, gap: 2, left: 34, top: 30 },
  compact: { cell: 7.5, gap: 2, left: 34, top: 30 },
  mobile: { cell: 4.6, gap: 1.4, left: 27, top: 29 },
}[context.variant.name];
```

Use the theme’s GitHub-compatible four green levels plus its empty colour. Show Monday, Wednesday and Friday only. Align `Less`, five legend cells and `More` on one baseline.

- [ ] **Step 7: Replace the legacy graph**

Remove locally invented count thresholds and copied month coordinates from `render-profile.mjs`. Compose the calendar node and register all label/cell boxes.

- [ ] **Step 8: Run and commit**

```bash
node --test test/calendar-layout.test.mjs
npm test
git add scripts/profile-layout/calendar.mjs scripts/render-profile.mjs test/calendar-layout.test.mjs
git commit -m "feat(profile): render GitHub-level contribution calendar"
```

---

### Task 8: Generate six assets and the responsive README

**Files:**
- Modify: `scripts/generate-profile.mjs`
- Modify: `README.template.md`
- Create: `test/responsive-renderer.test.mjs`
- Modify: `test/profile.test.mjs`

**Interfaces:**
- Produces:
  - `assets/profile-desktop-{light,dark}.svg`
  - `assets/profile-compact-{light,dark}.svg`
  - `assets/profile-mobile-{light,dark}.svg`

- [ ] **Step 1: Write failing six-asset tests**

```js
for (const variant of ["desktop", "compact", "mobile"]) {
  for (const theme of ["light", "dark"]) {
    const svg = await readFile(path.join(output, "assets", `profile-${variant}-${theme}.svg`), "utf8");
    assert.match(svg, new RegExp(`data-variant="${variant}"`));
    assert.match(svg, new RegExp(`data-theme="${theme}"`));
  }
}
```

Assert all six `<source>` conditions occur in the proven order and the fallback is desktop light.

- [ ] **Step 2: Confirm failure**

```bash
node --test test/responsive-renderer.test.mjs
```

- [ ] **Step 3: Generate and validate all variants before publishing any file**

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

Write all six assets, `stats.json` and `README.md` to staging. Rename them into the output only after every render succeeds.

- [ ] **Step 4: Add SVG metadata**

```svg
<svg ... data-variant="desktop" data-theme="dark">
```

- [ ] **Step 5: Replace `README.template.md`**

Use the exact source order proven in Task 1, final asset names and desktop-light fallback. Keep `width="100%"`; the selected native geometry now prevents continuous poster shrinkage.

- [ ] **Step 6: Run and commit**

```bash
npm test
rm -rf preview-output/fixture
node scripts/generate-profile.mjs --fixture test/fixture-stats.json --output preview-output/fixture
git add scripts/generate-profile.mjs README.template.md test/responsive-renderer.test.mjs test/profile.test.mjs
git commit -m "feat(profile): generate responsive theme variants"
```

---

### Task 9: Verify and update all responsive public assets

**Files:**
- Modify: `scripts/verify-public-output.mjs`
- Modify: `scripts/update-repository-issue-metrics.mjs`
- Modify: `test/repository-issue-metrics.test.mjs`
- Modify: `.github/workflows/update-profile.yml`

**Interfaces:**
- `verifyPublicOutput(root, denylist)` validates README, six SVGs and stats.
- CLI accepts `--root <directory>`.
- Issue aggregation replaces the Issues card in all six SVGs.

- [ ] **Step 1: Add failing six-asset issue tests**

Create six fixture SVGs, run `updateRepositoryIssueMetrics`, and assert each contains identical total/open/closed values. Delete one file and assert the operation fails closed.

- [ ] **Step 2: Add failing output-verification tests**

Reject:

- missing mobile asset;
- identical light/dark asset;
- wrong README source order;
- legacy `profile-light.svg` reference;
- forbidden copy, repository URL, credential pattern or placeholder;
- malformed contribution levels.

- [ ] **Step 3: Confirm failure**

```bash
node --test test/repository-issue-metrics.test.mjs test/responsive-renderer.test.mjs
```

- [ ] **Step 4: Centralise asset names**

```js
export const PROFILE_ASSETS = Object.freeze(
  ["desktop", "compact", "mobile"].flatMap((variant) =>
    ["light", "dark"].map((theme) => `assets/profile-${variant}-${theme}.svg`),
  ),
);
```

Use the same constant for generation, issue replacement and verification.

- [ ] **Step 5: Add `--root` to verifier CLI**

```js
const rootIndex = process.argv.indexOf("--root");
const root = rootIndex >= 0 ? path.resolve(process.argv[rootIndex + 1]) : profileRoot;
verifyPublicOutput(root)
  .then(({ files }) => console.log(`Verified ${files} public profile files.`))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
```

- [ ] **Step 6: Update workflow staging and verification**

```bash
git add README.md assets/profile-*-light.svg assets/profile-*-dark.svg assets/stats.json
```

Retain current hourly schedule and safe fetch/rebase/retry logic. Verification runs after repository-wide issue aggregation and before commit.

- [ ] **Step 7: Run and commit**

```bash
npm test
node scripts/generate-profile.mjs --fixture test/fixture-stats.json --output preview-output/fixture
node scripts/verify-public-output.mjs --root preview-output/fixture
git add scripts/verify-public-output.mjs scripts/update-repository-issue-metrics.mjs test/repository-issue-metrics.test.mjs .github/workflows/update-profile.yml
git commit -m "fix(profile): verify and publish responsive assets"
```

---

### Task 10: Produce ten branch previews and visual regression evidence

**Files:**
- Modify: `package.json`
- Create: `package-lock.json`
- Create: `scripts/render-responsive-previews.mjs`
- Create: `test/visual-regression.test.mjs`
- Create: `.github/workflows/profile-responsive-preview.yml`

**Interfaces:**
- Produces ten PNGs plus `layout-diagnostics.json` under `preview-output/screenshots`.
- Preview workflow is read-only and branch-scoped.

- [ ] **Step 1: Install the exact preview dependency**

```bash
npm install --save-dev --save-exact sharp@0.34.3
npm ci
```

- [ ] **Step 2: Write the failing preview test**

```js
for (const width of [1440, 1024, 768, 430, 375]) {
  for (const theme of ["light", "dark"]) {
    await access(path.join(output, `${width}-${theme}.png`));
  }
}
await access(path.join(output, "layout-diagnostics.json"));
```

- [ ] **Step 3: Confirm failure**

```bash
node --test test/visual-regression.test.mjs
```

- [ ] **Step 4: Implement preview rendering and CLI**

```js
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

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
  await writeFile(path.join(output, "layout-diagnostics.json"), `${JSON.stringify({ cases: CASES }, null, 2)}\n`);
}

if (process.argv[1]?.endsWith("render-responsive-previews.mjs")) {
  const source = process.argv[process.argv.indexOf("--source") + 1];
  const output = process.argv[process.argv.indexOf("--output") + 1];
  if (!source || !output) throw new Error("--source and --output are required.");
  await renderPreviews({ source: path.resolve(source), output: path.resolve(output) });
}
```

Extend diagnostics output with the renderer’s component/text boxes and effective font sizes.

- [ ] **Step 5: Add scripts**

```json
"preview": "node scripts/render-responsive-previews.mjs",
"test:visual": "node --test test/visual-regression.test.mjs"
```

- [ ] **Step 6: Add branch-only preview workflow**

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
      - run: node scripts/verify-public-output.mjs --root preview-output/fixture
      - run: node scripts/render-responsive-previews.mjs --source preview-output/fixture --output preview-output/screenshots
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: profile-responsive-previews
          path: preview-output/screenshots
          if-no-files-found: error
          retention-days: 14
```

- [ ] **Step 7: Run locally and push**

```bash
npm ci
npm test
rm -rf preview-output
node scripts/generate-profile.mjs --fixture test/fixture-stats.json --output preview-output/fixture
node scripts/verify-public-output.mjs --root preview-output/fixture
node scripts/render-responsive-previews.mjs --source preview-output/fixture --output preview-output/screenshots
git add package.json package-lock.json scripts/render-responsive-previews.mjs test/visual-regression.test.mjs .github/workflows/profile-responsive-preview.yml
git commit -m "test(profile): add responsive visual evidence"
git push origin profile-responsive-layout-20260831
```

- [ ] **Step 8: Human preview gate**

Review all ten images for pill centring, category fit, chip padding, metric hierarchy, focus alignment and calendar accuracy. Do not add baselines or open a PR until Marc explicitly approves the preview set.

- [ ] **Step 9: Accept approved baselines**

Copy approved PNGs to `test/baselines/`. Compare rendered and baseline raw pixel buffers; fail when more than 0.5% of channels differ by more than 12 intensity points:

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

- [ ] **Step 10: Commit approved baselines**

```bash
git add test/baselines test/visual-regression.test.mjs
git commit -m "test(profile): approve responsive visual baselines"
```

---

### Task 11: Rebuild runtime package and prove branch completion

**Files:**
- Modify: `source/profile-source.b64.*`
- Modify: `source/profile-source.sha256`
- Create: `docs/superpowers/evidence/2026-08-31-github-profile-responsive-renderer.md`
- Delete before PR: `docs/probes/` and `test/responsive-picture.test.mjs`

**Interfaces:**
- Produces: final deployable runtime and completion evidence while `main` remains unchanged.

- [ ] **Step 1: Remove branch-only probe files**

The responsive README tests now cover source ordering. Remove probe-only content before PR:

```bash
git rm -r docs/probes test/responsive-picture.test.mjs
```

Remove `test/responsive-picture.test.mjs` from the packaging file list if it was temporarily present.

- [ ] **Step 2: Rebuild the runtime package**

```bash
rm -rf .profile-package
python3 scripts/package-profile-runtime.py --output .profile-package
rm -f source/profile-source.b64.*
cp .profile-package/profile-source.b64.* source/
cp .profile-package/profile-source.sha256 source/
```

- [ ] **Step 3: Independently reconstruct and test the package**

```bash
rm -rf .profile-runtime .profile-runtime.zip
cat source/profile-source.b64.* | base64 --decode > .profile-runtime.zip
test "$(sha256sum .profile-runtime.zip | cut -d' ' -f1)" = "$(cat source/profile-source.sha256)"
unzip -q .profile-runtime.zip -d .profile-runtime
npm --prefix .profile-runtime test
```

- [ ] **Step 4: Run full root verification**

```bash
npm ci
npm test
rm -rf preview-output
node scripts/generate-profile.mjs --fixture test/fixture-stats.json --output preview-output/fixture
node scripts/verify-public-output.mjs --root preview-output/fixture
node scripts/render-responsive-previews.mjs --source preview-output/fixture --output preview-output/screenshots
git diff --check
```

- [ ] **Step 5: Write evidence**

Record:

- branch head SHA;
- test counts;
- runtime SHA-256;
- preview workflow run URL and artifact name;
- all five widths and both themes;
- explicit confirmation that `main` was unchanged;
- explicit confirmation that Equitable Journeys and confidential names are absent.

- [ ] **Step 6: Commit and push**

```bash
git add source scripts/package-profile-runtime.py docs/superpowers/evidence test package.json package-lock.json .github/workflows
git commit -m "build(profile): package verified responsive renderer"
git push origin profile-responsive-layout-20260831
```

Expected: preview workflow succeeds and publishes only an artifact.

---

### Task 12: Open the review PR and stop before merge

**Files:**
- No planned source changes.

**Interfaces:**
- Produces: reviewable PR from `profile-responsive-layout-20260831` to `main`.

- [ ] **Step 1: Verify final branch head**

```bash
npm ci
npm test
rm -rf preview-output
node scripts/generate-profile.mjs --fixture test/fixture-stats.json --output preview-output/fixture
node scripts/verify-public-output.mjs --root preview-output/fixture
node scripts/render-responsive-previews.mjs --source preview-output/fixture --output preview-output/screenshots
git fetch origin
git diff --check origin/main...HEAD
git status --short
```

Expected: all commands exit 0 and working tree is clean.

- [ ] **Step 2: Open PR**

Title:

```text
fix(profile): add responsive approved visual layouts
```

Body includes spec, plan, probe result, test counts, package hash, preview artifact, ten screenshots, confidentiality confirmation and rollback by merge-commit revert.

- [ ] **Step 3: Stop for explicit final approval**

Do not merge. Fix only evidenced defects against the approved spec; do not alter colours, content or visual identity.

---

### Task 13: Merge, commission once and verify hourly operation

**Files:**
- No planned source changes.

**Interfaces:**
- Consumes: explicitly approved PR.
- Produces: live responsive profile with automatic hourly refresh.

- [ ] **Step 1: Confirm prerequisites**

Require approved previews, successful preview workflow, clean tests, no unresolved comments and branch current with `main`.

- [ ] **Step 2: Merge through normal repository controls**

Do not bypass protections or force-update `main`.

- [ ] **Step 3: Trigger one commissioning dispatch**

Run `Refresh profile activity` once after merge. This is not the normal update mechanism; subsequent refreshes remain scheduled.

- [ ] **Step 4: Verify generated output**

Require successful checkout, package SHA validation, tests, GitHub data collection, issue aggregation, six-asset generation, public-output verification and safe push.

- [ ] **Step 5: Verify the live profile**

Inspect 1,440, 1,024, 768, 430 and 375 px in both themes. Confirm selected variant metadata, no clipping, correct rolling calendar, preserved palette and absent Equitable Journeys.

- [ ] **Step 6: Verify the next scheduled run**

Confirm:

```yaml
schedule:
  - cron: "17 * * * *"
```

Observe the next scheduled run. Unchanged metrics must produce no timestamp-only commit.

- [ ] **Step 7: Update final evidence**

Add merge SHA, commissioning run, generated profile commit if present, live screenshots, next scheduled result and rollback reference.

---

## Self-Review Results

### Spec coverage

- GitHub source-selection feasibility: Task 1.
- Reviewable and deterministic runtime source: Task 2 and Task 11.
- Locked colours, typography and geometry: Tasks 3–5.
- GitHub contribution levels and rolling calendar: Tasks 6–7.
- Six responsive assets and README: Task 8.
- Public safety, issue aggregation and hourly publication: Task 9.
- Ten preview renders and visual regression: Task 10.
- Isolated branch evidence and no premature live change: Task 11.
- Human-reviewed PR: Task 12.
- Controlled merge and scheduled-run proof: Task 13.

### Interface consistency

- Variants: `desktop | compact | mobile`.
- Themes: `light | dark`.
- Contribution day: `{ date, count, level }`.
- Renderer: `renderProfileWithDiagnostics(stats, theme, variant)` and `renderProfile(stats, theme, variant)`.
- Layout node: `{ width, height, markup, components, text, columns }`.
- Assets: `assets/profile-${variant}-${theme}.svg`.
- Public files: README, six SVGs and stats JSON.

### Scope check

The plan changes the renderer, data needed by that renderer, validation, packaging and branch preview evidence only. It does not change profile copy, product disclosure, repository naming, GitHub account settings or unrelated automation.
