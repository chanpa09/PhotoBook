import type { StampAsset, StampInstance } from '../types';

export const A4_PAGE_WIDTH = 794;
export const A4_PAGE_HEIGHT = 1123;
export const DEFAULT_STAMP_SIZE = 240;
export const MIN_STAMP_SCALE = 0.35;
export const MAX_STAMP_SCALE = 2.6;
export const STAMP_DRAG_MIME_TYPE = 'application/x-photobook-stamp';

export const getStampBoxStyle = (stamp: StampInstance) => ({
  left: `${stamp.x}px`,
  top: `${stamp.y}px`,
  width: `${(stamp.size ?? DEFAULT_STAMP_SIZE) * stamp.scale}px`,
  transform: `rotate(${stamp.rotate}deg)`,
  zIndex: stamp.zIndex,
});

export const clampStampScale = (scale: number) =>
  Math.min(MAX_STAMP_SCALE, Math.max(MIN_STAMP_SCALE, scale));

export const serializeStampDragData = (stamp: StampAsset) => JSON.stringify(stamp);

export const parseStampDragData = (dataTransfer: DataTransfer): StampAsset | null => {
  const rawData = dataTransfer.getData(STAMP_DRAG_MIME_TYPE);
  if (!rawData) return null;

  try {
    return JSON.parse(rawData) as StampAsset;
  } catch {
    return null;
  }
};

export const hasStampDragData = (dataTransfer: DataTransfer) =>
  Array.from(dataTransfer.types).includes(STAMP_DRAG_MIME_TYPE);
