import type { FileActionMenuAnchor } from '@/types/file';

export interface FileMenuSize {
  width: number;
  height: number;
}

export interface FileMenuViewport {
  width: number;
  height: number;
  safeTop?: number;
  safeBottom?: number;
  safeLeft?: number;
  safeRight?: number;
}

export interface FileMenuPosition {
  left: number;
  top: number;
  placement: 'top' | 'bottom';
}

const DEFAULT_MENU_GAP = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function resolveFileActionMenuPosition(
  anchor: FileActionMenuAnchor,
  menuSize: FileMenuSize,
  viewport: FileMenuViewport,
): FileMenuPosition {
  const safeTop = viewport.safeTop ?? 0;
  const safeBottom = viewport.safeBottom ?? 0;
  const safeLeft = viewport.safeLeft ?? 0;
  const safeRight = viewport.safeRight ?? 0;
  const minLeft = safeLeft;
  const maxLeft = Math.max(safeLeft, viewport.width - safeRight - menuSize.width);
  const preferredLeft = anchor.x - menuSize.width / 2;
  const belowTop = anchor.y + DEFAULT_MENU_GAP;
  const aboveTop = anchor.y - menuSize.height - DEFAULT_MENU_GAP;
  const maxTop = Math.max(safeTop, viewport.height - safeBottom - menuSize.height);
  const hasBottomSpace = belowTop + menuSize.height <= viewport.height - safeBottom;
  const placement = hasBottomSpace ? 'bottom' : 'top';

  return {
    left: clamp(preferredLeft, minLeft, maxLeft),
    top: clamp(placement === 'bottom' ? belowTop : aboveTop, safeTop, maxTop),
    placement,
  };
}
