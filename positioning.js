export const clamp = (value, min, max) => Math.min(Math.max(min, max), Math.max(min, value));

/** All coordinates use the layout viewport; visualViewport supplies its visible rectangle. */
export function anchorPanel(button, panel, viewport, gap = 10) {
  const m = 10;
  const left = viewport.left + m;
  const top = viewport.top + m;
  const right = viewport.left + viewport.width - m;
  const bottom = viewport.top + viewport.height - m;
  const w = Math.min(panel.width, Math.max(1, right - left));
  const h = Math.min(panel.height, Math.max(1, bottom - top));
  const centered = button.x + button.width / 2 - w / 2;
  const candidates = [
    { x: button.x - w - gap, y: button.y, side: 'left' },
    { x: button.x + button.width + gap, y: button.y, side: 'right' },
    { x: centered, y: button.y + button.height + gap, side: 'below' },
    { x: centered, y: button.y - h - gap, side: 'above' },
  ];
  for (const item of candidates) {
    const x = clamp(item.x, left, right - w);
    const vertical = item.side === 'below' || item.side === 'above';
    if (!vertical && item.x >= left && item.x + w <= right) {
      return { x: item.x, y: clamp(item.y, top, bottom - h), side: item.side };
    }
    if (vertical && item.y >= top && item.y + h <= bottom) {
      return { x, y: item.y, side: item.side };
    }
  }
  // Small screens: keep the full window reachable even when no side has enough space.
  return {
    x: clamp(centered, left, right - w),
    y: clamp(button.y, top, bottom - h),
    side: 'clamped',
  };
}
