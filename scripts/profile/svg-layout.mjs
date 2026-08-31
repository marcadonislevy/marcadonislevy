export function box(x, y, width, height) {
  return { x, y, width, height };
}

export function contains(parent, child, tolerance = 0.01) {
  return child.x >= parent.x - tolerance
    && child.y >= parent.y - tolerance
    && child.x + child.width <= parent.x + parent.width + tolerance
    && child.y + child.height <= parent.y + parent.height + tolerance;
}

export function inset(bounds, amountX, amountY = amountX) {
  return {
    x: bounds.x + amountX,
    y: bounds.y + amountY,
    width: bounds.width - amountX * 2,
    height: bounds.height - amountY * 2,
  };
}

export function translate(bounds, x, y) {
  return {
    x: bounds.x + x,
    y: bounds.y + y,
    width: bounds.width,
    height: bounds.height,
  };
}

export function makeDiagnostic(id, bounds, text = []) {
  return { id, bounds, text };
}

export function assertDiagnostics(width, height, diagnostics) {
  const view = box(0, 0, width, height);
  const errors = [];
  for (const item of diagnostics) {
    if (!contains(view, item.bounds)) errors.push(item.id + " leaves viewBox");
    for (const text of item.text ?? []) {
      if (!contains(item.bounds, text.bbox, 1.5)) {
        errors.push(item.id + "/" + text.id + " overflows");
      }
      if (Number(text.fontSize) < 11.5) {
        errors.push(item.id + "/" + text.id + " is below the minimum font size");
      }
    }
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));
}
