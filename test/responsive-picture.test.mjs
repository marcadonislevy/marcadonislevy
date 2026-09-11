import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production README declares mobile, compact and desktop sources in priority order", async () => {
  const markdown = await readFile("README.template.md", "utf8");
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
  assert.match(markdown, /profile-desktop-light\.svg/);
});

test("production README leads with the responsive website-services banner", async () => {
  const markdown = await readFile("README.template.md", "utf8");
  const serviceLink = "https://marcadonislevy.github.io/website-design-services/";
  const bannerPosition = markdown.indexOf("services-banner-approved.png");
  const profilePosition = markdown.indexOf("profile-mobile-dark.svg");

  assert.match(markdown, new RegExp(`href="${serviceLink}"`));
  assert.match(markdown, /services-banner-approved\.png/);
  assert.ok(bannerPosition >= 0, "missing desktop services banner");
  assert.ok(bannerPosition < profilePosition, "services banner must appear before the profile artwork");
});

test("approved top-section artwork and Learn proportions remain stable", async () => {
  const [markdown, desktop, mobile, generator] = await Promise.all([
    readFile("README.template.md", "utf8"),
    readFile("assets/microsoft-learn-desktop.svg", "utf8"),
    readFile("assets/microsoft-learn-mobile.svg", "utf8"),
    readFile(".github/scripts/update-microsoft-learn.mjs", "utf8"),
  ]);

  assert.doesNotMatch(markdown, /services-banner-(?:desktop|mobile)\.svg/);
  assert.match(desktop, /width="1200" height="98" viewBox="0 0 1200 98"/);
  assert.match(mobile, /width="680" height="178" viewBox="0 0 680 178"/);
  assert.match(generator, /height="98" viewBox="0 0 1200 98"/);
  assert.match(generator, /height="178" viewBox="0 0 680 178"/);
  assert.match(generator, /endpoint\.includes\("\/achievements\/user\/"\)/);
});
