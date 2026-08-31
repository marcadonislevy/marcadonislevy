# GitHub Profile Responsive Renderer Evidence

**Delivery:** Completed after merge `584a1e0a2f2d8545ab9ac9f293952aa50a953073` left the responsive payload unapplied
**Specification:** `docs/superpowers/specs/2026-08-31-github-profile-responsive-renderer-design.md`
**Implementation plan:** `docs/superpowers/plans/2026-08-31-github-profile-responsive-renderer.md`

## Implemented outcome

The approved navy, cyan, blue, purple, green, amber, orange and coral visual system is preserved. The renderer now generates three native geometries, each in light and dark mode:

- desktop, 600 px native width;
- compact, 560 px native width;
- mobile, 360 px native width.

GitHub selects the correct geometry using `<picture>` media conditions rather than continuously shrinking a 1,200 px poster. Text is measured before placement, wraps at word boundaries, and is rejected if it leaves its owning component. Capability cards, technology categories and chips, metric cards and “What I build” cards use shared dimensions and spacing tokens.

The rolling contribution calendar uses 53 week columns, seven day rows, chronological month placement and GitHub `contributionLevel` values. Repository issue totals remain aggregated without publishing repository identities. Equitable Journeys remains absent.

## Automated verification

Commands:

```bash
npm test
npm run preview
node scripts/verify-public-output.mjs --root preview-output
# Browser viewport capture: 1440, 1024, 768, 430 and 375 px in both themes
```

Results:

- 17 tests passed, 0 failed;
- six responsive SVG assets generated;
- eight public profile files verified;
- ten light/dark viewport previews generated;
- every measured text box remained inside its owning component;
- same-type component dimensions were uniform;
- minimum effective text size was enforced;
- metric values remained subordinate to the activity heading;
- removed and confidential public content checks passed.

## Preview matrix

| Browser viewport | Selected geometry | Themes verified |
|---:|---|---|
| 1,440 px | desktop | light, dark |
| 1,024 px | desktop | light, dark |
| 768 px | compact | light, dark |
| 430 px | mobile | light, dark |
| 375 px | mobile | light, dark |

The responsive `<picture>` feasibility probe was also rendered through GitHub’s Markdown API and browser-tested at the same viewport classes before renderer implementation proceeded.
