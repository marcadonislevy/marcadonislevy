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
  const bannerPosition = markdown.indexOf("services-banner-desktop.svg");
  const profilePosition = markdown.indexOf("profile-mobile-dark.svg");

  assert.match(markdown, new RegExp(`href="${serviceLink}"`));
  assert.match(markdown, /services-banner-mobile\.svg/);
  assert.ok(bannerPosition >= 0, "missing desktop services banner");
  assert.ok(bannerPosition < profilePosition, "services banner must appear before the profile artwork");
});
