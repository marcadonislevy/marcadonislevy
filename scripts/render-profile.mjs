import { normaliseCalendar, contributionLevelIndex, deriveMonthLabels, splitCalendarWeeks } from "./profile/calendar.mjs";
import { renderIcon } from "./profile/icons.mjs";
import { assertDiagnostics, box, makeDiagnostic } from "./profile/svg-layout.mjs";
import { fitText, measureText, textBounds, wrapText } from "./profile/text-layout.mjs";
import { ACCENTS, SPACE, TYPE, getTheme, getVariant } from "./profile/tokens.mjs";

export const RESPONSIVE_ASSET_NAMES = Object.freeze([
  "profile-desktop-light.svg",
  "profile-desktop-dark.svg",
  "profile-compact-light.svg",
  "profile-compact-dark.svg",
  "profile-mobile-light.svg",
  "profile-mobile-dark.svg",
]);

const capabilities = Object.freeze([
  ["brain", "AI & Intelligent Systems", ACCENTS[0]],
  ["monitor", "Websites & Digital Experiences", ACCENTS[1]],
  ["cloud", "Web Applications & SaaS", ACCENTS[2]],
  ["puzzle", "APIs, MCP Servers & Plugins", ACCENTS[3]],
  ["server", "Hosting & Edge Platforms", ACCENTS[4]],
  ["database", "Data & Backend Systems", ACCENTS[5]],
  ["gear", "Workflow & Automation", ACCENTS[6]],
  ["people", "Public-interest Technology", ACCENTS[7]],
  ["flask", "Applied R&D", ACCENTS[8]],
]);

const technologyRows = Object.freeze([
  ["LANGUAGES", ["TypeScript", "JavaScript", "Python", "SQL", "Bash", "PowerShell"]],
  ["WEB & FRAMEWORKS", ["React", "Next.js", "Remix", "Vite", "Astro", "SvelteKit", "Express.js", "NestJS"]],
  ["DATA & INFRASTRUCTURE", ["PostgreSQL", "Supabase", "Cloudflare Workers", "Redis", "D1", "KV", "Docker", "Vercel"]],
  ["WORKFLOW & TOOLS", ["GitHub Actions", "Tailwind CSS", "Shadcn/UI", "ESLint", "Prettier", "Vitest", "Playwright"]],
  ["INTEGRATIONS & APIS", ["REST APIs", "GraphQL", "WebSockets", "MCP", "CI/CD", "Codex"]],
]);

const focusAreas = Object.freeze([
  ["brain", "AI applications and agent systems", "#15c6ba"],
  ["hosting", "Web hosting platforms", "#3e8ff6"],
  ["app", "SaaS and web applications", "#12a8f4"],
  ["database", "Data systems and APIs", "#7d5ce5"],
  ["construction", "Construction and infrastructure software R&D", "#d75fa6"],
  ["leaf", "Renewable technology R&D", "#69c33e"],
  ["shield", "Defence applications R&D", "#5085c7"],
  ["community", "Community and social-impact technology", "#f08c66"],
]);

const portfolioPills = Object.freeze([
  "Portfolio-first",
  "AI systems",
  "Hosting & edge",
  "Open to collaborate",
  "Public-interest tech",
]);

const techColours = Object.freeze({
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3776ab",
  SQL: "#8f52c7",
  Bash: "#45b82f",
  PowerShell: "#2671be",
  React: "#22b8cf",
  "Next.js": "#111827",
  Remix: "#56616f",
  Vite: "#8b5cf6",
  Astro: "#ef476f",
  SvelteKit: "#ff3e00",
  "Express.js": "#6b7280",
  NestJS: "#e0234e",
  PostgreSQL: "#336791",
  Supabase: "#3ecf8e",
  "Cloudflare Workers": "#f38020",
  Redis: "#d82c20",
  D1: "#5b6770",
  KV: "#45ad38",
  Docker: "#2496ed",
  Vercel: "#111827",
  "GitHub Actions": "#4f75ed",
  "Tailwind CSS": "#06b6d4",
  "Shadcn/UI": "#6b7280",
  ESLint: "#4b32c3",
  Prettier: "#d48a18",
  Vitest: "#94c843",
  Playwright: "#2ead33",
  "REST APIs": "#4388d6",
  GraphQL: "#e535ab",
  WebSockets: "#657383",
  MCP: "#6b7280",
  "CI/CD": "#7c6f64",
  Codex: "#00a6a6",
});

const headline = "Building apps, websites, web applications, plugins, products, platforms and experiments across AI, software, hosting, automation and digital experiences.";
const supporting = "Portfolio-first builder focused on useful systems and public-interest outcomes.";

export function renderAllProfiles(stats) {
  const outputs = {};
  for (const variant of ["desktop", "compact", "mobile"]) {
    for (const theme of ["light", "dark"]) {
      const name = `profile-${variant}-${theme}.svg`;
      outputs[name] = renderProfile(stats, variant, theme);
    }
  }
  return outputs;
}

export function renderProfile(stats, variantName = "desktop", themeName = "light") {
  const variant = getVariant(variantName);
  const theme = getTheme(themeName);
  const width = variant.width;
  const contentX = variant.outer;
  const contentWidth = width - variant.outer * 2;
  const markup = [];
  const diagnostics = [];
  let y = variant.outer + SPACE.xs;

  const hero = renderHero({ variant, theme, x: contentX, y, width: contentWidth });
  markup.push(hero.markup);
  diagnostics.push(...hero.diagnostics);
  y += hero.height + SPACE.lg;

  markup.push(separator(contentX, y, contentWidth, theme));
  y += SPACE.xl;

  const capabilityHeading = renderHeading("GitHub profile capabilities", "Capabilities", contentX, y, contentWidth, theme);
  markup.push(capabilityHeading.markup);
  diagnostics.push(capabilityHeading.diagnostic);
  y += capabilityHeading.height + SPACE.md;

  const capabilityGrid = renderCapabilities({ variant, theme, x: contentX, y, width: contentWidth });
  markup.push(capabilityGrid.markup);
  diagnostics.push(...capabilityGrid.diagnostics);
  y += capabilityGrid.height + SPACE.lg;

  markup.push(separator(contentX, y, contentWidth, theme));
  y += SPACE.xl;

  const technologyHeading = renderHeading("Technology ecosystem heading", "Technology ecosystem", contentX, y, contentWidth, theme);
  markup.push(technologyHeading.markup);
  diagnostics.push(technologyHeading.diagnostic);
  y += technologyHeading.height + SPACE.md;

  const technology = renderTechnology({ variant, theme, x: contentX, y, width: contentWidth });
  markup.push(technology.markup);
  diagnostics.push(...technology.diagnostics);
  y += technology.height + SPACE.lg;

  markup.push(separator(contentX, y, contentWidth, theme));
  y += SPACE.xl;

  const activityHeading = renderHeading("GitHub activity heading", "GitHub activity", contentX, y, contentWidth, theme);
  markup.push(activityHeading.markup);
  diagnostics.push(activityHeading.diagnostic);
  y += activityHeading.height + SPACE.md;

  const activity = renderActivity({ stats, variant, theme, x: contentX, y, width: contentWidth });
  markup.push(activity.markup);
  diagnostics.push(...activity.diagnostics);
  y += activity.height + SPACE.lg;

  markup.push(separator(contentX, y, contentWidth, theme));
  y += SPACE.xl;

  const focusHeading = renderHeading("What I build heading", "What I build", contentX, y, contentWidth, theme);
  markup.push(focusHeading.markup);
  diagnostics.push(focusHeading.diagnostic);
  y += focusHeading.height + SPACE.md;

  const focus = renderFocusAreas({ variant, theme, x: contentX, y, width: contentWidth });
  markup.push(focus.markup);
  diagnostics.push(...focus.diagnostics);
  y += focus.height + variant.outer + SPACE.sm;

  const height = Math.ceil(y);
  assertDiagnostics(width, height, diagnostics);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    "<title id=\"title\">Marc Levy technology portfolio and GitHub activity</title>",
    `<desc id="desc">A ${themeName} ${variantName} portfolio dashboard showing technology areas, tools, activity totals and a rolling GitHub contribution calendar.</desc>`,
    `<defs>${renderDefs(theme)}</defs>`,
    `<rect width="${width}" height="${height}" rx="18" fill="${theme.background}"/>`,
    `<rect x="4" y="4" width="${width - 8}" height="${height - 8}" rx="15" fill="none" stroke="${theme.outerBorder}"/>`,
    ...markup,
    "</svg>",
  ].join("\n");
  return { svg, width, height, diagnostics };
}

function renderHero({ variant, theme, x, y, width }) {
  const parts = [];
  const diagnostics = [];
  const copyText = [];
  const markRadius = variant.name === "mobile" ? 30 : 35;
  const markX = x + markRadius + 4;
  const markY = y + markRadius + 5;
  const nameX = x + markRadius * 2 + 18;
  const nameTop = y + (variant.name === "mobile" ? 10 : 11);
  const nameWidth = width - (nameX - x) - SPACE.sm;

  parts.push(renderMark(markX, markY, markRadius, theme));

  const name = renderTextBlock({
    id: "name",
    text: "Marc Levy",
    style: TYPE.name,
    bounds: box(nameX, nameTop, nameWidth, TYPE.name.lineHeight),
    maxLines: 1,
    fill: theme.text,
  });
  parts.push(name.markup);
  copyText.push(...name.text);

  const username = renderTextBlock({
    id: "username",
    text: "@marcadonislevy",
    style: TYPE.username,
    bounds: box(nameX, nameTop + TYPE.name.lineHeight + 1, nameWidth, TYPE.username.lineHeight),
    maxLines: 1,
    fill: theme.muted,
  });
  parts.push(username.markup);
  copyText.push(...username.text);

  if (variant.name !== "mobile") {
    parts.push(renderNetwork(x + width - 146, y + 4, 140, 88, theme));
  } else {
    parts.push(renderNetwork(x + width - 90, y + 10, 80, 50, theme));
  }

  const headlineTop = y + (variant.name === "mobile" ? 93 : 103);
  const headlineLayout = fitText(headline, {
    maxWidth: width,
    maxLines: variant.name === "mobile" ? 5 : 3,
    style: TYPE.headline,
  });
  const headlineBlock = renderPreparedText({
    id: "headline",
    layout: headlineLayout,
    bounds: box(x, headlineTop, width, headlineLayout.height),
    fill: theme.text,
  });
  parts.push(headlineBlock.markup);
  copyText.push(...headlineBlock.text);

  const supportTop = headlineTop + headlineLayout.height + SPACE.xs;
  const supportLayout = fitText(supporting, {
    maxWidth: width,
    maxLines: 3,
    style: TYPE.supporting,
  });
  const supportBlock = renderPreparedText({
    id: "supporting",
    layout: supportLayout,
    bounds: box(x, supportTop, width, supportLayout.height),
    fill: theme.muted,
  });
  parts.push(supportBlock.markup);
  copyText.push(...supportBlock.text);

  const pillsTop = supportTop + supportLayout.height + SPACE.md;
  const pills = renderPills({ x, y: pillsTop, width, theme });
  parts.push(pills.markup);
  diagnostics.push(...pills.diagnostics);
  const height = pillsTop + pills.height - y;
  diagnostics.unshift(makeDiagnostic("hero-copy", box(x, y, width, height), copyText));

  return {
    markup: `<g id="hero">${parts.join("")}</g>`,
    diagnostics,
    height,
  };
}

function renderMark(x, y, radius, theme) {
  return `
    <g aria-hidden="true">
      <circle cx="${x}" cy="${y}" r="${radius}" fill="${theme.panelAlt}" stroke="#4d77ff" stroke-width="2.3"/>
      <circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="#20c6e8" stroke-width="2.3" stroke-linecap="round" stroke-dasharray="84 140" transform="rotate(112 ${x} ${y})"/>
      <circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="#a85ce7" stroke-width="2.3" stroke-linecap="round" stroke-dasharray="72 152" transform="rotate(-38 ${x} ${y})"/>
      <text x="${x}" y="${y + radius * 0.28}" text-anchor="middle" font-family="Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="${radius * 0.82}" font-weight="760" fill="url(#mlGradient)">ML</text>
    </g>`;
}

function renderNetwork(x, y, width, height, theme) {
  const points = [
    [0.04, 0.18], [0.27, 0.04], [0.52, 0.19], [0.78, 0.03], [0.96, 0.32],
    [0.72, 0.45], [0.39, 0.45], [0.10, 0.55], [0.34, 0.74], [0.65, 0.73],
    [0.92, 0.67], [0.74, 0.96], [0.43, 0.91], [0.08, 0.94],
  ].map(([px, py]) => [x + px * width, y + py * height]);
  const edges = [
    [0, 1], [0, 6], [0, 7], [1, 2], [1, 6], [2, 3], [2, 5], [2, 6],
    [3, 4], [3, 5], [4, 5], [4, 10], [5, 6], [5, 9], [5, 10], [6, 7],
    [6, 8], [6, 9], [7, 8], [7, 13], [8, 9], [8, 12], [8, 13], [9, 10],
    [9, 11], [9, 12], [10, 11], [11, 12], [12, 13],
  ];
  const lines = edges.map(([a, b]) => `<line x1="${points[a][0]}" y1="${points[a][1]}" x2="${points[b][0]}" y2="${points[b][1]}" stroke="${theme.networkLine}" stroke-width="1" opacity="0.65"/>`).join("");
  const colours = ["#19b9c8", "#4d81cc", "#8c5aba", "#b05bc3"];
  const nodes = points.map(([px, py], index) => `<circle cx="${px}" cy="${py}" r="${index % 4 === 0 ? 3.4 : 2.2}" fill="${colours[index % colours.length]}" opacity="0.8"/>`).join("");
  return `<g aria-hidden="true">${lines}${nodes}</g>`;
}

function renderPills({ x, y, width, theme }) {
  const gap = SPACE.xs;
  const height = 32;
  const rows = [];
  let row = [];
  let rowWidth = 0;
  for (const label of portfolioPills) {
    const pillWidth = Math.ceil(measureText(label, TYPE.pill) + 34);
    if (row.length > 0 && rowWidth + gap + pillWidth > width) {
      rows.push({ items: row, width: rowWidth });
      row = [];
      rowWidth = 0;
    }
    row.push({ label, width: pillWidth });
    rowWidth += (row.length > 1 ? gap : 0) + pillWidth;
  }
  rows.push({ items: row, width: rowWidth });

  const parts = [];
  const diagnostics = [];
  let index = 0;
  rows.forEach((current, rowIndex) => {
    let cursor = x + (width - current.width) / 2;
    for (const item of current.items) {
      const bounds = box(cursor, y + rowIndex * (height + gap), item.width, height);
      const text = renderTextBlock({
        id: `pill-${index}-text`,
        text: item.label,
        style: TYPE.pill,
        bounds: box(bounds.x + 22, bounds.y, bounds.width - 30, bounds.height),
        maxLines: 1,
        align: "middle",
        valign: "middle",
        fill: theme.text,
      });
      parts.push(`<g><rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" rx="8" fill="${theme.chip}" stroke="${theme.chipBorder}"/><circle cx="${bounds.x + 14}" cy="${bounds.y + height / 2}" r="3.5" fill="none" stroke="#66788b" stroke-width="1.3"/>${text.markup}</g>`);
      diagnostics.push(makeDiagnostic(`pill-${index}`, bounds, text.text));
      cursor += item.width + gap;
      index += 1;
    }
  });
  return {
    markup: parts.join(""),
    diagnostics,
    height: rows.length * height + (rows.length - 1) * gap,
  };
}

function renderCapabilities({ variant, theme, x, y, width }) {
  const columns = variant.capabilityColumns;
  const gap = SPACE.sm;
  const cardWidth = (width - gap * (columns - 1)) / columns;
  const cardHeight = variant.name === "desktop" ? 84 : variant.name === "compact" ? 78 : 72;
  const rows = Math.ceil(capabilities.length / columns);
  const parts = [];
  const diagnostics = [];

  capabilities.forEach(([icon, label, colour], index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const bounds = box(
      x + column * (cardWidth + gap),
      y + row * (cardHeight + gap),
      cardWidth,
      cardHeight,
    );
    const iconX = bounds.x + 31;
    const textArea = box(bounds.x + 57, bounds.y + SPACE.sm, bounds.width - 65, bounds.height - SPACE.lg);
    const text = renderTextBlock({
      id: `capability-${index}-text`,
      text: label,
      style: TYPE.capability,
      bounds: textArea,
      maxLines: 3,
      valign: "middle",
      fill: theme.text,
    });
    parts.push(`<g><rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" rx="9" fill="${theme.panelAlt}" stroke="${theme.border}"/><circle cx="${iconX}" cy="${bounds.y + bounds.height / 2}" r="21" fill="${colour}" fill-opacity="0.08" stroke="${colour}" stroke-opacity="0.55"/>${renderIcon(icon, iconX, bounds.y + bounds.height / 2, colour, 1.12)}${text.markup}</g>`);
    diagnostics.push(makeDiagnostic(`capability-${index}`, bounds, text.text));
  });
  return {
    markup: `<g id="capabilities">${parts.join("")}</g>`,
    diagnostics,
    height: rows * cardHeight + (rows - 1) * gap,
  };
}

function renderTechnology({ variant, theme, x, y, width }) {
  const parts = [];
  const diagnostics = [];
  const desktop = variant.name === "desktop";
  const gap = SPACE.xs;
  const chipHeight = 30;
  let cursorY = y;
  let chipIndex = 0;

  technologyRows.forEach(([category, items], rowIndex) => {
    const labelWidth = desktop ? 136 : width;
    const flowX = desktop ? x + labelWidth + SPACE.sm : x;
    const flowY = desktop ? cursorY + SPACE.xs : cursorY + 34;
    const flowWidth = desktop ? width - labelWidth - SPACE.sm : width;
    const placements = flowChips(items, flowWidth, chipHeight, gap);
    const rowHeight = desktop
      ? Math.max(34, placements.height + SPACE.md)
      : 34 + placements.height + SPACE.xs;
    const rowBounds = box(x, cursorY, width, rowHeight);
    const labelBounds = desktop
      ? box(x, cursorY, labelWidth, rowHeight)
      : box(x, cursorY, width, 28);
    const label = renderTextBlock({
      id: `technology-category-${rowIndex}-text`,
      text: category,
      style: TYPE.category,
      bounds: box(labelBounds.x + SPACE.sm, labelBounds.y, labelBounds.width - SPACE.lg, labelBounds.height),
      maxLines: 2,
      valign: "middle",
      align: desktop ? "start" : "middle",
      fill: theme.text,
    });
    parts.push(`<rect x="${labelBounds.x}" y="${labelBounds.y}" width="${labelBounds.width}" height="${labelBounds.height}" rx="7" fill="${theme.panelAlt}" stroke="${theme.border}"/>${label.markup}`);
    diagnostics.push(makeDiagnostic(`technology-category-${rowIndex}`, labelBounds, label.text));

    placements.items.forEach((placement) => {
      const bounds = box(flowX + placement.x, flowY + placement.y, placement.width, chipHeight);
      const colour = techColours[placement.label] ?? "#6b7280";
      const text = renderTextBlock({
        id: `chip-${chipIndex}-text`,
        text: placement.label,
        style: TYPE.chip,
        bounds: box(bounds.x + 27, bounds.y, bounds.width - 34, bounds.height),
        maxLines: 1,
        valign: "middle",
        fill: theme.text,
      });
      parts.push(`<g><rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" rx="7" fill="${theme.chip}" stroke="${theme.chipBorder}"/><rect x="${bounds.x + 9}" y="${bounds.y + 8}" width="14" height="14" rx="4" fill="${colour}" fill-opacity="0.17"/><circle cx="${bounds.x + 16}" cy="${bounds.y + 15}" r="3.8" fill="${colour}"/>${text.markup}</g>`);
      diagnostics.push(makeDiagnostic(`chip-${chipIndex}`, bounds, text.text));
      chipIndex += 1;
    });
    diagnostics.push(makeDiagnostic(`technology-row-${rowIndex}`, rowBounds, []));
    cursorY += rowHeight + SPACE.sm;
  });

  return {
    markup: `<g id="technology">${parts.join("")}</g>`,
    diagnostics,
    height: cursorY - y - SPACE.sm,
  };
}

function flowChips(items, maxWidth, height, gap) {
  const placements = [];
  let x = 0;
  let y = 0;
  for (const label of items) {
    const width = Math.ceil(measureText(label, TYPE.chip) + 39);
    if (x > 0 && x + width > maxWidth) {
      x = 0;
      y += height + gap;
    }
    if (width > maxWidth) throw new Error("Technology chip cannot fit: " + label);
    placements.push({ label, x, y, width });
    x += width + gap;
  }
  return { items: placements, height: y + height };
}

function renderActivity({ stats, variant, theme, x, y, width }) {
  const metrics = buildMetrics(stats);
  const columns = variant.metricColumns;
  const gap = SPACE.sm;
  const cardWidth = (width - gap * (columns - 1)) / columns;
  const cardHeight = 88;
  const rows = Math.ceil(metrics.length / columns);
  const parts = [];
  const diagnostics = [];

  metrics.forEach((metric, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const bounds = box(
      x + column * (cardWidth + gap),
      y + row * (cardHeight + gap),
      cardWidth,
      cardHeight,
    );
    const label = renderTextBlock({
      id: `metric-${index}-label`,
      text: metric.label,
      style: TYPE.metricLabel,
      bounds: box(bounds.x + 10, bounds.y + 7, bounds.width - 20, 18),
      maxLines: 1,
      fill: theme.muted,
    });
    const value = renderTextBlock({
      id: `metric-${index}-value`,
      text: metric.value,
      style: TYPE.metricValue,
      bounds: box(bounds.x + 10, bounds.y + 27, bounds.width - 20, 27),
      maxLines: 1,
      fill: theme.text,
    });
    const note = renderTextBlock({
      id: `metric-${index}-note`,
      text: metric.note,
      style: TYPE.metricNote,
      bounds: box(bounds.x + 10, bounds.y + 57, bounds.width - 20, 25),
      maxLines: 2,
      fill: theme.muted,
    });
    const accent = ACCENTS[index % ACCENTS.length];
    parts.push(`<g><rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" rx="8" fill="${theme.panelAlt}" stroke="${theme.border}"/><circle cx="${bounds.x + bounds.width - 15}" cy="${bounds.y + 15}" r="4.5" fill="none" stroke="${accent}" stroke-width="1.7"/>${label.markup}${value.markup}${note.markup}</g>`);
    diagnostics.push(makeDiagnostic(`metric-${index}`, bounds, [...label.text, ...value.text, ...note.text]));
  });

  const metricHeight = rows * cardHeight + (rows - 1) * gap;
  const calendarY = y + metricHeight + SPACE.md;
  const calendar = renderCalendar({
    days: stats.contributions.last365Days,
    variant,
    theme,
    x,
    y: calendarY,
    width,
  });
  parts.push(calendar.markup);
  diagnostics.push(calendar.diagnostic);
  return {
    markup: `<g id="activity">${parts.join("")}</g>`,
    diagnostics,
    height: metricHeight + SPACE.md + calendar.height,
  };
}

function renderCalendar({ days, variant, theme, x, y, width }) {
  const { weeks } = normaliseCalendar(days);
  const padding = 10;
  const labelWidth = 25;
  const segments = variant.splitCalendar
    ? splitCalendarWeeks(weeks)
    : [{ start: 0, weeks }];
  const segmentGap = variant.splitCalendar ? 14 : 0;
  const segmentParts = [];
  const textDiagnostics = [];
  let cursorY = y + padding;
  let lastSegmentBottom = cursorY;

  segments.forEach((segment, segmentIndex) => {
    const columns = segment.weeks.length;
    const cellGap = variant.splitCalendar ? 2 : 1.5;
    const gridWidth = width - padding * 2 - labelWidth;
    const rawCell = (gridWidth - cellGap * (columns - 1)) / columns;
    const cell = Math.max(variant.splitCalendar ? 8 : 7, Math.min(8, Math.floor(rawCell * 2) / 2));
    const usedWidth = columns * cell + (columns - 1) * cellGap;
    const gridX = x + padding + labelWidth + (gridWidth - usedWidth) / 2;
    const monthTop = cursorY;
    const gridY = cursorY + 18;
    const gridHeight = 7 * cell + 6 * cellGap;
    const labels = deriveMonthLabels(weeks, segment.start, segment.start + columns);
    let lastLabelRight = -Infinity;

    for (const label of labels) {
      const labelX = gridX + label.column * (cell + cellGap);
      const labelWidthMeasured = measureText(label.label, TYPE.calendarLabel);
      if (labelX < lastLabelRight + 4 || labelX + labelWidthMeasured > x + width - padding + 1) continue;
      const item = renderPlainText({
        id: `calendar-month-${segmentIndex}-${label.column}`,
        text: label.label,
        x: labelX,
        top: monthTop,
        style: TYPE.calendarLabel,
        fill: theme.gridText,
      });
      segmentParts.push(item.markup);
      textDiagnostics.push(...item.text);
      lastLabelRight = labelX + labelWidthMeasured;
    }

    [["Mon", 1], ["Wed", 3], ["Fri", 5]].forEach(([label, row]) => {
      const item = renderPlainText({
        id: `calendar-day-${segmentIndex}-${row}`,
        text: label,
        x: x + padding,
        top: gridY + row * (cell + cellGap) + Math.max(0, (cell - TYPE.calendarLabel.lineHeight) / 2),
        style: TYPE.calendarLabel,
        fill: theme.gridText,
      });
      segmentParts.push(item.markup);
      textDiagnostics.push(...item.text);
    });

    segment.weeks.forEach((week, localColumn) => {
      week.forEach((day, row) => {
        const level = contributionLevelIndex(day?.level, day?.count ?? 0);
        const fill = contributionColour(level, theme);
        const globalColumn = segment.start + localColumn;
        const dateAttribute = day ? ` data-date="${escapeXml(day.date)}"` : "";
        segmentParts.push(`<rect data-week="${globalColumn}" data-day="${row}"${dateAttribute} x="${gridX + localColumn * (cell + cellGap)}" y="${gridY + row * (cell + cellGap)}" width="${cell}" height="${cell}" rx="1.5" fill="${fill}"/>`);
      });
    });

    lastSegmentBottom = gridY + gridHeight;
    cursorY = lastSegmentBottom + segmentGap;
  });

  const legendTop = lastSegmentBottom + 10;
  const legendCell = 9;
  const legendGap = 3;
  const moreWidth = measureText("More", TYPE.calendarLabel);
  const lessWidth = measureText("Less", TYPE.calendarLabel);
  const legendWidth = lessWidth + 8 + legendCell * 5 + legendGap * 4 + 8 + moreWidth;
  const legendX = x + width - padding - legendWidth;
  const less = renderPlainText({
    id: "calendar-legend-less",
    text: "Less",
    x: legendX,
    top: legendTop,
    style: TYPE.calendarLabel,
    fill: theme.gridText,
  });
  segmentParts.push(less.markup);
  textDiagnostics.push(...less.text);
  const cellsX = legendX + lessWidth + 8;
  for (let level = 0; level <= 4; level += 1) {
    segmentParts.push(`<rect x="${cellsX + level * (legendCell + legendGap)}" y="${legendTop + 2}" width="${legendCell}" height="${legendCell}" rx="1.5" fill="${contributionColour(level, theme)}"/>`);
  }
  const more = renderPlainText({
    id: "calendar-legend-more",
    text: "More",
    x: cellsX + legendCell * 5 + legendGap * 4 + 8,
    top: legendTop,
    style: TYPE.calendarLabel,
    fill: theme.gridText,
  });
  segmentParts.push(more.markup);
  textDiagnostics.push(...more.text);

  const height = legendTop + TYPE.calendarLabel.lineHeight + padding - y;
  const bounds = box(x, y, width, height);
  return {
    markup: `<g id="contribution-calendar"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="9" fill="${theme.panel}" stroke="${theme.border}"/>${segmentParts.join("")}</g>`,
    diagnostic: makeDiagnostic("contribution-calendar", bounds, textDiagnostics),
    height,
  };
}

function renderFocusAreas({ variant, theme, x, y, width }) {
  const columns = variant.focusColumns;
  const gap = SPACE.sm;
  const cardWidth = (width - gap * (columns - 1)) / columns;
  const cardHeight = 96;
  const rows = Math.ceil(focusAreas.length / columns);
  const parts = [];
  const diagnostics = [];

  focusAreas.forEach(([icon, label, colour], index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const bounds = box(
      x + column * (cardWidth + gap),
      y + row * (cardHeight + gap),
      cardWidth,
      cardHeight,
    );
    const text = renderTextBlock({
      id: `focus-${index}-text`,
      text: label,
      style: TYPE.focus,
      bounds: box(bounds.x + SPACE.xs, bounds.y + 47, bounds.width - SPACE.md, bounds.height - 53),
      maxLines: 3,
      align: "middle",
      valign: "middle",
      fill: theme.text,
    });
    parts.push(`<g><rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" rx="8" fill="${theme.panelAlt}" stroke="${theme.border}"/>${renderIcon(icon, bounds.x + bounds.width / 2, bounds.y + 27, colour, 1.05)}${text.markup}</g>`);
    diagnostics.push(makeDiagnostic(`focus-${index}`, bounds, text.text));
  });
  return {
    markup: `<g id="focus">${parts.join("")}</g>`,
    diagnostics,
    height: rows * cardHeight + (rows - 1) * gap,
  };
}

function renderHeading(id, text, x, y, width, theme) {
  const bounds = box(x, y, width, TYPE.section.lineHeight);
  const block = renderTextBlock({
    id,
    text,
    style: TYPE.section,
    bounds,
    maxLines: 1,
    fill: theme.text,
  });
  return {
    markup: block.markup,
    diagnostic: makeDiagnostic(id, bounds, block.text),
    height: TYPE.section.lineHeight,
  };
}

function renderTextBlock({ id, text, style, bounds, maxLines, align = "start", valign = "start", fill }) {
  const layout = fitText(text, {
    maxWidth: bounds.width,
    maxLines,
    style,
  });
  return renderPreparedText({ id, layout, bounds, align, valign, fill });
}

function renderPreparedText({ id, layout, bounds, align = "start", valign = "start", fill }) {
  const top = valign === "middle"
    ? bounds.y + (bounds.height - layout.height) / 2
    : bounds.y;
  const anchor = align === "middle" ? "middle" : align === "end" ? "end" : "start";
  const textX = align === "middle"
    ? bounds.x + bounds.width / 2
    : align === "end"
      ? bounds.x + bounds.width
      : bounds.x;
  const bbox = textBounds({
    x: bounds.x,
    top,
    layout,
    align,
    availableWidth: bounds.width,
  });
  const tspans = layout.lines.map((line, index) => `<tspan x="${textX}" dy="${index === 0 ? 0 : layout.style.lineHeight}">${escapeXml(line)}</tspan>`).join("");
  const markup = `<text x="${textX}" y="${top + layout.style.size}" text-anchor="${anchor}" font-family="Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="${layout.style.size}" font-weight="${layout.style.weight}"${layout.style.letterSpacing ? ` letter-spacing="${layout.style.letterSpacing}"` : ""} fill="${fill}">${tspans}</text>`;
  return {
    markup,
    text: [{ id, bbox, fontSize: layout.style.size }],
  };
}

function renderPlainText({ id, text, x, top, style, fill }) {
  const layout = wrapText(text, { maxWidth: 200, maxLines: 1, style });
  return renderPreparedText({
    id,
    layout: { ...layout, style },
    bounds: box(x, top, layout.width, layout.height),
    fill,
  });
}

function buildMetrics(stats) {
  return [
    { label: "Contributions", value: formatNumber(stats.contributions.total), note: "All time" },
    { label: "Commits", value: formatNumber(stats.contributions.commits), note: "All time" },
    { label: "Pull Requests", value: formatNumber(stats.pullRequests.authored), note: `${formatNumber(stats.pullRequests.open)} open · ${formatNumber(stats.pullRequests.closed)} closed` },
    { label: "Merged PRs", value: formatNumber(stats.pullRequests.merged), note: `${formatNumber(stats.pullRequests.closedUnmerged)} closed unmerged` },
    { label: "Reviews", value: formatNumber(stats.pullRequests.reviewed), note: "Distinct PRs" },
    { label: "Issues", value: formatNumber(stats.issues.authored), note: `${formatNumber(stats.issues.open)} open · ${formatNumber(stats.issues.closed)} closed` },
    { label: "Stars", value: formatNumber(stats.stars.total), note: "Total" },
    { label: "Languages", value: formatNumber(stats.languages.detectedCount), note: "Total" },
  ];
}

function contributionColour(level, theme) {
  if (level <= 0) return theme.gridEmpty;
  return theme.contributions[Math.min(4, level) - 1];
}

function separator(x, y, width, theme) {
  return `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y}" stroke="${theme.separator}"/>`;
}

function renderDefs(theme) {
  return `
    <linearGradient id="mlGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#20c6e8"/>
      <stop offset="0.52" stop-color="#4d87f7"/>
      <stop offset="1" stop-color="#a85ce7"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="${theme.shadow}" flood-opacity="0.15"/>
    </filter>`;
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-US");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
