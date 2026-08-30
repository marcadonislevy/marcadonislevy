# GitHub Profile Responsive Renderer Design

**Status:** Approved design, awaiting implementation plan  
**Date:** 31 August 2026  
**Branch:** `profile-responsive-layout-20260831`

## 1. Purpose

Correct the existing GitHub profile README renderer so that the approved visual identity remains intact while text, cards, chips, metrics, contribution cells and focus areas remain professionally aligned and readable at desktop, compact and mobile viewport widths.

This is a renderer and layout correction. It is not a redesign.

## 2. Locked visual and content requirements

The implementation must preserve:

- the approved navy background;
- the cyan, blue, purple, green, amber, orange and coral accent palette;
- the circular ML identity mark;
- the network graphic;
- the existing headline, supporting copy and portfolio positioning;
- the five portfolio pills;
- the nine capability areas;
- the technology ecosystem categories and technologies;
- the GitHub activity metrics;
- the contribution-calendar concept;
- the eight “What I build” categories;
- automatic light and dark variants;
- hourly automated data refresh;
- public-safe aggregation without publishing private repository identities.

The implementation must not:

- restore the Equitable Journeys feature section;
- add or remove portfolio categories;
- change the approved colour scheme;
- expose private product, repository, branch or codename identities;
- replace the profile with plain Markdown;
- force-push generated output over newer work;
- require normal manual reruns.

## 3. Problem statement

The current README embeds one 1,200-pixel-wide SVG at `width="100%"`. GitHub scales that complete image to the width of the README column. Every text element, card, icon and calendar cell therefore shrinks together.

At ordinary desktop widths, several labels already render below professional reading size. At compact and mobile widths, text becomes illegible because the image continues to scale down rather than rearranging its components. Fixed-position text also causes inconsistent padding, alignment, wrapping and clipping within pills, category boxes, technology chips, metric cards and focus items.

The contribution calendar also uses custom label positioning and intensity thresholds that do not adequately reproduce GitHub’s own rolling-year presentation.

## 4. Chosen approach

Generate three responsive layout geometries, each in light and dark variants:

| Variant | Intended rendered width | Primary layout |
|---|---:|---|
| Desktop | 720 px and above | Three-column capability grid, full activity composition |
| Compact | 480–719 px | Two-column cards and stacked activity layout |
| Mobile | Below 480 px | Single-column cards, two-column metrics, wrapped content |

The README will use a `<picture>` element with viewport and colour-scheme media conditions to select one of six generated SVG assets:

- `profile-desktop-light.svg`
- `profile-desktop-dark.svg`
- `profile-compact-light.svg`
- `profile-compact-dark.svg`
- `profile-mobile-light.svg`
- `profile-mobile-dark.svg`

The approved visual language will be shared through one component system. Each geometry will reflow the same components rather than scaling one large poster.

## 5. Responsive selection

The generated README will select assets in this order:

1. dark mobile;
2. light mobile;
3. dark compact;
4. light compact;
5. dark desktop;
6. light desktop;
7. desktop-light fallback image.

The target media conditions are:

```html
<picture>
  <source media="(prefers-color-scheme: dark) and (max-width: 479px)" srcset="./assets/profile-mobile-dark.svg">
  <source media="(prefers-color-scheme: light) and (max-width: 479px)" srcset="./assets/profile-mobile-light.svg">
  <source media="(prefers-color-scheme: dark) and (min-width: 480px) and (max-width: 719px)" srcset="./assets/profile-compact-dark.svg">
  <source media="(prefers-color-scheme: light) and (min-width: 480px) and (max-width: 719px)" srcset="./assets/profile-compact-light.svg">
  <source media="(prefers-color-scheme: dark)" srcset="./assets/profile-desktop-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/profile-desktop-light.svg">
  <img src="./assets/profile-desktop-light.svg" width="100%" alt="Marc Levy — technology portfolio and GitHub activity">
</picture>
```

No separate README theme button will be added because GitHub README content cannot control the site theme. The selected asset follows the viewer’s GitHub appearance setting.

## 6. Typography system

Typography will be defined as rendered target sizes, then converted to source SVG sizes for each geometry so the effective displayed size remains consistent.

| Element | Target rendered size | Weight | Alignment |
|---|---:|---:|---|
| Main name | 30–34 px | 740 | Left |
| Username | 18–20 px | 520 | Left |
| Headline | 15–16 px | 620 | Left |
| Supporting copy | 13–14 px | 470 | Left |
| Section heading | 20–22 px | 720 | Left |
| Capability label | 15–16 px | 650 | Left, vertically centred |
| Portfolio pill | 13–14 px | 560 | Centred |
| Category label | 12–13 px | 720 | Left or centred by geometry |
| Technology chip | 13–14 px | 520 | Left, vertically centred |
| Metric label | 12–13 px | 560 | Left |
| Metric number | 21–24 px | 720 | Left |
| Metric note | 11.5–12.5 px | 500 | Left |
| Focus label | 12.5–13.5 px | 560 | Centred |
| Calendar label | 11.5–12.5 px | 550 | Left or centred as appropriate |

The metric values must remain visibly subordinate to the “GitHub activity” section heading.

## 7. Layout engine

### 7.1 Component model

The renderer will use typed components rather than large concatenated SVG fragments:

- `Hero`
- `PortfolioPillGroup`
- `CapabilityCardGrid`
- `TechnologyCategory`
- `TechnologyChipFlow`
- `MetricCardGrid`
- `ContributionCalendar`
- `FocusGrid`

Each component returns:

- its measured width and height;
- its SVG markup;
- its text bounding boxes;
- its visual bounding box;
- geometry diagnostics used by tests.

### 7.2 Text measurement

A shared text measurement service will calculate line widths before elements are placed. It will use the same font family, size, weight and letter spacing as the generated SVG.

Text-fitting rules:

1. Preserve whole words.
2. Prefer one line when it fits within the available inner width.
3. Wrap to a second line at a word boundary when required.
4. Never reduce below the minimum target rendered font size.
5. If two lines still do not fit, widen or increase the component height according to its layout contract.
6. Fail generation rather than clip or silently shrink below the minimum.

### 7.3 Vertical centring

Multiline text will be centred as a group. Baselines will be calculated from:

- line count;
- line height;
- component content height;
- icon alignment axis.

No component may centre only its first line while leaving subsequent lines below the visual centre.

### 7.4 Padding tokens

All same-type components will use shared spacing tokens:

- extra-small: 6 px rendered;
- small: 8 px rendered;
- medium: 12 px rendered;
- large: 16 px rendered;
- extra-large: 24 px rendered.

Pills, chips, category panels, metric cards and capability cards must not define arbitrary local padding.

## 8. Geometry by variant

### 8.1 Desktop

- Hero: ML mark left, copy centre-left, network graphic right.
- Pills: one or two centred rows depending on measured width.
- Capabilities: 3 columns × 3 rows.
- Technology: category label column plus wrapping chip flow.
- Activity: metric grid on the left, contribution calendar on the right when the measured width supports the minimum cell and label sizes; otherwise calendar below metrics.
- Focus: 4 columns × 2 rows.

### 8.2 Compact

- Hero: ML mark and copy share the first region; network graphic scales within a constrained decorative area.
- Pills: wrapped centred rows.
- Capabilities: 2 columns.
- Technology: category label in a dedicated row or compact label column, selected by measured fit.
- Activity: 2-column metric grid; calendar full width below.
- Focus: 2 columns × 4 rows.

### 8.3 Mobile

- Hero: ML mark and name row, supporting copy beneath, compact network graphic retained only where it does not reduce text width below minimum.
- Pills: centred multi-row flow.
- Capabilities: 1 column.
- Technology: category heading above a wrapping chip flow.
- Activity: 2-column metric grid.
- Calendar: full width below metrics.
- Focus: 2 columns × 4 rows.

The mobile asset will be rendered at a native width chosen so that GitHub does not scale its contents below the target typography sizes at 375–430 px viewport widths.

## 9. Contribution-calendar design

The calendar will use the same rolling 365-day period as the collected contribution data.

### 9.1 Grid

- 53 week columns;
- 7 day rows;
- constant square cell size within each responsive variant;
- constant horizontal and vertical gap;
- small, consistent corner radius;
- clean rectangular panel with uniform internal padding.

### 9.2 Month labels

Month labels will be derived from the actual date of the first visible contribution day in each week. A month label is placed at the first week column whose visible days enter that month, subject to collision avoidance.

The calendar remains rolling-year data. December is not forced to the right edge, but labels must be chronologically correct and positioned over the corresponding weeks.

### 9.3 Contribution levels

The collector will request GitHub’s `contributionLevel` for each day in addition to the numerical count.

Cells map as follows:

- `NONE` → level 0;
- `FIRST_QUARTILE` → level 1;
- `SECOND_QUARTILE` → level 2;
- `THIRD_QUARTILE` → level 3;
- `FOURTH_QUARTILE` → level 4.

This removes custom local thresholding and makes the profile pattern correspond to GitHub’s authoritative classification.

The cell palette will use GitHub-compatible green intensity relationships adapted to the approved dark and light panels. The panel background, border and typography remain part of the approved visual identity.

### 9.4 Labels and legend

- Monday, Wednesday and Friday labels only;
- “Less” and “More” aligned on one baseline;
- five legend cells including level zero;
- labels never overlap the grid;
- calendar never compresses below the minimum cell and label size.

## 10. Data and refresh flow

The existing hourly GitHub Actions workflow remains the source of live data.

Data flow:

1. Collect GitHub activity, repository aggregates and contribution days.
2. Collect repository-wide issue totals across selected owners.
3. Validate the statistics schema.
4. Render six responsive SVG assets.
5. Generate the responsive `<picture>` README.
6. Run geometry, text-fit, content-safety and SVG-validation tests.
7. Commit only when metric or rendered content changes.
8. Rebase and retry safely if the branch advances; never force-push.

Normal profile updates occur hourly at 17 minutes past the hour. Manual dispatch remains available for immediate refresh only.

## 11. Automated validation

### 11.1 Unit tests

- text measurement and word wrapping;
- multiline vertical centring;
- pill sizing;
- category label sizing;
- technology-chip sizing;
- metric hierarchy;
- focus-card wrapping;
- rolling calendar week construction;
- month-label placement;
- contribution-level mapping;
- viewport asset selection;
- confidentiality checks.

### 11.2 Geometry assertions

For every generated asset:

- every text bounding box is inside its owning component;
- every component is inside the SVG view box;
- components of the same type use equal dimensions where the layout requires equality;
- no visual bounding boxes overlap unexpectedly;
- no effective text size falls below 11.5 px;
- no calendar label overlaps a cell;
- the legend remains inside the calendar panel;
- the final focus row remains inside the SVG.

### 11.3 Visual regression renders

Render and inspect screenshots at:

- 1440 px desktop;
- 1024 px desktop;
- 768 px compact;
- 430 px mobile;
- 375 px mobile.

Light and dark renders must be produced for each target width.

### 11.4 Content invariants

Every asset must contain:

- the approved headline and positioning;
- all five portfolio pills;
- all nine capability labels;
- all technology categories and approved technology names;
- all eight activity metrics;
- all eight focus areas.

Every asset must exclude:

- Equitable Journeys;
- private repository identities;
- confidential names from the denylist;
- placeholder or pending values;
- “Detected” as the language-card note.

## 12. Deployment and rollback

Implementation remains isolated on `profile-responsive-layout-20260831` until the generated previews and tests pass.

Deployment sequence:

1. Implement renderer and collector changes on the branch.
2. Generate all six assets using fixture data.
3. Run the full automated test suite.
4. Render light and dark previews at all five target widths.
5. Review the previews against this specification and the approved original design.
6. Open a pull request to `main` with the verification evidence.
7. Merge only after approval.
8. Trigger the live profile workflow and verify the public profile.

Rollback is a normal revert of the merge commit. The current desktop light and dark assets remain available in history and must not be overwritten before the responsive branch is approved.

## 13. Acceptance criteria

The correction is accepted only when all of the following are true:

1. The approved design and colour scheme are recognisably unchanged.
2. Equitable Journeys remains absent.
3. At 1440, 1024, 768, 430 and 375 px, no text clips, overflows or becomes illegible.
4. The page selects desktop, compact and mobile geometries rather than continuously shrinking one poster.
5. Pills, category panels, chips, metric cards and focus items are internally aligned and uniform.
6. Metric values are subordinate to the activity section heading.
7. The contribution graph uses GitHub contribution levels and correct rolling-year month placement.
8. Light and dark theme selection works through GitHub appearance settings.
9. Hourly automatic refresh remains functional.
10. Repository names and confidential product identities remain unpublished.
11. All unit, geometry, content-safety and visual-regression checks pass.
12. The live profile is not changed until the responsive preview has been reviewed and approved.
