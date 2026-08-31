const LEVELS = Object.freeze([
  "NONE",
  "FIRST_QUARTILE",
  "SECOND_QUARTILE",
  "THIRD_QUARTILE",
  "FOURTH_QUARTILE",
]);

export function contributionLevelIndex(level, count = 0) {
  const index = LEVELS.indexOf(String(level ?? "").toUpperCase());
  if (index >= 0) return index;
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

export function normaliseCalendar(days) {
  if (!Array.isArray(days) || days.length !== 365) {
    throw new Error("Contribution calendar requires exactly 365 days.");
  }
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const first = parseDate(ordered[0].date);
  const firstSunday = new Date(first);
  firstSunday.setUTCDate(firstSunday.getUTCDate() - firstSunday.getUTCDay());
  const weeks = Array.from({ length: 53 }, () => Array(7).fill(null));

  for (const day of ordered) {
    const date = parseDate(day.date);
    const delta = Math.round((date - firstSunday) / 86400000);
    const week = Math.floor(delta / 7);
    const row = date.getUTCDay();
    if (week < 0 || week >= weeks.length) {
      throw new Error("Contribution day falls outside the rolling 53-week grid: " + day.date);
    }
    weeks[week][row] = {
      date: day.date,
      count: day.count,
      level: LEVELS[contributionLevelIndex(day.level, day.count)],
    };
  }
  return { weeks, firstSunday };
}

export function deriveMonthLabels(weeks, startColumn = 0, endColumn = weeks.length) {
  const labels = [];
  let priorMonth = null;
  for (let column = startColumn; column < endColumn; column += 1) {
    const visible = weeks[column].filter(Boolean);
    if (visible.length === 0) continue;
    const first = parseDate(visible[0].date);
    const month = first.getUTCMonth();
    if (month !== priorMonth) {
      labels.push({
        column: column - startColumn,
        label: first.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      });
      priorMonth = month;
    }
  }
  return labels;
}

export function splitCalendarWeeks(weeks) {
  return [
    { start: 0, weeks: weeks.slice(0, 27) },
    { start: 27, weeks: weeks.slice(27) },
  ];
}

function parseDate(value) {
  const date = new Date(String(value) + "T00:00:00Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Invalid contribution date: " + value);
  }
  return date;
}
