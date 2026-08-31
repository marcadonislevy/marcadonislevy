export const SPACE = Object.freeze({
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
});

export const TYPE = Object.freeze({
  name: { size: 32, weight: 740, lineHeight: 38 },
  username: { size: 18, weight: 520, lineHeight: 23 },
  headline: { size: 15.5, weight: 620, lineHeight: 21 },
  supporting: { size: 13.5, weight: 470, lineHeight: 19 },
  section: { size: 22, weight: 720, lineHeight: 27 },
  capability: { size: 15.5, weight: 650, lineHeight: 20 },
  pill: { size: 13, weight: 560, lineHeight: 18 },
  category: { size: 12.5, weight: 720, lineHeight: 17, letterSpacing: 0.25 },
  chip: { size: 13, weight: 520, lineHeight: 18 },
  metricLabel: { size: 12.5, weight: 560, lineHeight: 17 },
  metricValue: { size: 21, weight: 720, lineHeight: 25 },
  metricNote: { size: 11.5, weight: 500, lineHeight: 15 },
  focus: { size: 13, weight: 560, lineHeight: 17 },
  calendarLabel: { size: 11.5, weight: 550, lineHeight: 15 },
});

export const VARIANTS = Object.freeze({
  desktop: {
    name: "desktop",
    width: 600,
    outer: 12,
    capabilityColumns: 3,
    metricColumns: 4,
    focusColumns: 4,
    splitCalendar: false,
  },
  compact: {
    name: "compact",
    width: 560,
    outer: 12,
    capabilityColumns: 2,
    metricColumns: 2,
    focusColumns: 2,
    splitCalendar: false,
  },
  mobile: {
    name: "mobile",
    width: 360,
    outer: 10,
    capabilityColumns: 1,
    metricColumns: 2,
    focusColumns: 2,
    splitCalendar: true,
  },
});

export const THEMES = Object.freeze({
  dark: {
    background: "#06131f",
    panel: "#0a1d2b",
    panelAlt: "#0c2232",
    chip: "#0d2231",
    chipBorder: "#233b4b",
    text: "#f4f7fb",
    muted: "#9ba8b6",
    border: "#243c4b",
    outerBorder: "#123148",
    separator: "#294352",
    networkLine: "#1a5a74",
    gridEmpty: "#161b22",
    gridText: "#aeb8c2",
    contributions: ["#0e4429", "#006d32", "#26a641", "#39d353"],
    shadow: "#000000",
  },
  light: {
    background: "#ffffff",
    panel: "#f6f8fa",
    panelAlt: "#ffffff",
    chip: "#ffffff",
    chipBorder: "#d0d7de",
    text: "#1f2328",
    muted: "#59636e",
    border: "#d0d7de",
    outerBorder: "#d8dee4",
    separator: "#d8dee4",
    networkLine: "#b6d8ea",
    gridEmpty: "#ebedf0",
    gridText: "#4b5563",
    contributions: ["#9be9a8", "#40c463", "#30a14e", "#216e39"],
    shadow: "#afb8c1",
  },
});

export const ACCENTS = Object.freeze([
  "#17c7b5",
  "#4d8df7",
  "#a75de8",
  "#12c8bb",
  "#70c842",
  "#f0a62b",
  "#ed9b24",
  "#9a58d6",
  "#4284db",
]);

export function getVariant(name) {
  const variant = VARIANTS[name];
  if (!variant) throw new Error("Unsupported profile variant: " + name);
  return variant;
}

export function getTheme(name) {
  const theme = THEMES[name];
  if (!theme) throw new Error("Unsupported profile theme: " + name);
  return theme;
}
