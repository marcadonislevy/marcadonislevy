const NARROW = /[ilI1|!.,:'\x60]/;
const WIDE = /[MW@#%&]/;
const UPPER = /[A-Z]/;
const DIGIT = /[0-9]/;

function glyphEm(character) {
  if (character === " ") return 0.30;
  if (NARROW.test(character)) return 0.32;
  if (WIDE.test(character)) return 0.88;
  if (UPPER.test(character)) return 0.66;
  if (DIGIT.test(character)) return 0.58;
  if (character === "·") return 0.36;
  return 0.56;
}

export function measureText(text, style) {
  const source = String(text);
  const weightFactor = Number(style.weight) >= 650 ? 1.035 : 1;
  const emWidth = [...source].reduce((sum, character) => sum + glyphEm(character), 0);
  return emWidth * Number(style.size) * weightFactor
    + Math.max(0, source.length - 1) * Number(style.letterSpacing ?? 0)
    + 1.5;
}

export function wrapText(text, { maxWidth, maxLines = 2, style }) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: [], width: 0, height: 0 };
  const lines = [];
  let current = "";

  for (const word of words) {
    if (measureText(word, style) > maxWidth) {
      throw new Error("Text cannot fit without breaking a word: " + word);
    }
    const candidate = current ? current + " " + word : word;
    if (measureText(candidate, style) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    throw new Error("Text cannot fit within " + maxLines + " lines: " + text);
  }
  return {
    lines,
    width: Math.max(...lines.map((line) => measureText(line, style))),
    height: lines.length * Number(style.lineHeight),
  };
}

export function fitText(text, { maxWidth, maxLines = 2, style, minSize = 11.5 }) {
  let candidate = { ...style };
  while (candidate.size >= minSize - 0.001) {
    try {
      return { ...wrapText(text, { maxWidth, maxLines, style: candidate }), style: candidate };
    } catch {
      candidate = {
        ...candidate,
        size: Number((candidate.size - 0.25).toFixed(2)),
        lineHeight: Number((candidate.lineHeight - 0.25).toFixed(2)),
      };
    }
  }
  throw new Error("Text cannot fit at the minimum size: " + text);
}

export function textBounds({ x, top, layout, align = "start", availableWidth = layout.width }) {
  const width = layout.width;
  let left = x;
  if (align === "middle") left = x + (availableWidth - width) / 2;
  if (align === "end") left = x + availableWidth - width;
  return {
    x: left,
    y: top,
    width,
    height: layout.height,
  };
}
