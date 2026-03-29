export const LINE_CHART_LAYOUT = {
  defaultPlotWidth: 240,
  windowSize: 6,
  verticalPadding: 6,
  yAxisWidth: 44,
  xLabelWidth: 40,
} as const;

export function getLineChartInnerWidth(_pointCount: number, plotAreaWidth: number): number {
  return Math.max(plotAreaWidth, LINE_CHART_LAYOUT.defaultPlotWidth);
}

export function getLineChartPointX(
  index: number,
  innerWidth: number,
  slotCount = LINE_CHART_LAYOUT.windowSize,
): number {
  if (slotCount <= 1) {
    return innerWidth / 2;
  }

  const startX = LINE_CHART_LAYOUT.xLabelWidth / 2;
  const endX = innerWidth - LINE_CHART_LAYOUT.xLabelWidth / 2;
  return startX + ((endX - startX) / (slotCount - 1)) * index;
}

export function getLineChartPointY(value: number, maxValue: number, height: number): number {
  const safeMaxValue = Math.max(maxValue, 1);
  const normalizedValue = Math.max(0, Math.min(value, safeMaxValue));
  const drawableHeight = Math.max(height - LINE_CHART_LAYOUT.verticalPadding * 2, 1);

  return height - LINE_CHART_LAYOUT.verticalPadding - (normalizedValue / safeMaxValue) * drawableHeight;
}

export function getLineChartLabelLeft(x: number): number {
  return x - LINE_CHART_LAYOUT.xLabelWidth / 2;
}
