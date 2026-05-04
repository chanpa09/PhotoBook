import type { FrameLayoutDefinition, ImportedLayoutType, LayoutType, PageData } from '../types';
import { IMPORTED_LAYOUTS_PATH, IMPORTED_LAYOUT_ALIASES } from '../data/importedLayouts';

type LayoutBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TextLayoutBox = LayoutBox & {
  slotIndex: number;
  textType?: string;
  isVertical?: boolean;
};

export type DisplayPhotoFrame = LayoutBox & {
  slotIndex: number;
  originalWidth: number;
  originalHeight: number;
  clipOffsetX: number;
  clipOffsetY: number;
};

export type DisplayFrameLayout = {
  sourceWidth: number;
  sourceHeight: number;
  frames: DisplayPhotoFrame[];
  textFrames: TextLayoutBox[];
};

export type PageSpread = {
  id: string;
  pageIndexes: number[];
  pages: PageData[];
  kind: 'cover' | 'body';
};

let importedFrameLayouts: FrameLayoutDefinition[] = [];
let importedFrameLayoutMap = new Map<ImportedLayoutType, FrameLayoutDefinition>();

export function setImportedFrameLayouts(layouts: FrameLayoutDefinition[]) {
  importedFrameLayouts = layouts;
  importedFrameLayoutMap = new Map(layouts.map((layout) => [layout.id, layout]));
}

export function getImportedFrameLayouts() {
  return importedFrameLayouts;
}

export async function fetchImportedFrameLayouts() {
  const response = await fetch(IMPORTED_LAYOUTS_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load imported layouts: ${response.status}`);
  }

  return await response.json() as FrameLayoutDefinition[];
}

export function getSlotCount(layout: LayoutType): number {
  const frameLayout = getFrameLayout(layout);
  if (frameLayout) return frameLayout.photoFrameCount;

  switch (layout) {
    case 'cover': return 1;
    case '1': return 1;
    case '2-row': return 2;
    case '2-col': return 2;
    case '3-row': return 3;
    case '3-top': return 3;
    case '4-grid': return 4;
    case '4-top': return 4;
    case '5-grid': return 5;
    case '6-grid': return 6;
    default: return 1;
  }
}

export function isImportedLayout(layout: LayoutType): layout is ImportedLayoutType {
  return layout.startsWith('imported-');
}

export function resolveLayoutId(layout: LayoutType): LayoutType {
  if (!isImportedLayout(layout)) return layout;
  const aliases = IMPORTED_LAYOUT_ALIASES as Partial<Record<ImportedLayoutType, ImportedLayoutType>>;
  return aliases[layout] ?? layout;
}

export function getFrameLayout(layout: LayoutType): FrameLayoutDefinition | null {
  const resolvedLayout = resolveLayoutId(layout);
  if (!isImportedLayout(resolvedLayout)) return null;
  return importedFrameLayoutMap.get(resolvedLayout) ?? null;
}

export function getSpreadStartIndex(index: number) {
  if (index <= 0) return 0;
  return index % 2 === 1 ? index : index - 1;
}

export function getPageSpreads(pages: PageData[]): PageSpread[] {
  if (pages.length === 0) return [];

  const spreads: PageSpread[] = [{
    id: pages[0].id,
    pageIndexes: [0],
    pages: [pages[0]],
    kind: 'cover',
  }];

  for (let index = 1; index < pages.length; index += 2) {
    const spreadPages = pages.slice(index, index + 2);
    spreads.push({
      id: spreadPages.map((page) => page.id).join(':'),
      pageIndexes: spreadPages.map((_, offset) => index + offset),
      pages: spreadPages,
      kind: 'body',
    });
  }

  return spreads;
}

export function getVisibleSpread(pages: PageData[], currentPageIndex: number): PageSpread {
  const spreads = getPageSpreads(pages);
  const startIndex = getSpreadStartIndex(currentPageIndex);
  return spreads.find((spread) => spread.pageIndexes.includes(startIndex)) ?? spreads[0] ?? {
    id: 'empty',
    pageIndexes: [],
    pages: [],
    kind: 'body',
  };
}

export function isTwoPageSpread(pages: PageData[]) {
  if (pages.length !== 2) return false;
  const [left, right] = pages;
  const frameLayout = getFrameLayout(left.layout);
  return Boolean(
    frameLayout?.pageCount === 2
    && left.layout === right.layout
    && left.spreadSide === 'left'
    && right.spreadSide === 'right',
  );
}

export function getExportGroups(pages: PageData[]) {
  return getPageSpreads(pages).flatMap((spread) => {
    if (spread.kind === 'cover') return [spread];
    if (isTwoPageSpread(spread.pages)) return [spread];

    return spread.pages.map((page, offset) => ({
      id: page.id,
      pageIndexes: [spread.pageIndexes[offset]],
      pages: [page],
      kind: 'body' as const,
    }));
  });
}

const clipPhotoFramesToSpreadSide = (
  boxes: LayoutBox[],
  sourceWidth: number,
  side: NonNullable<PageData['spreadSide']>,
) => {
  const splitX = sourceWidth / 2;
  const minX = side === 'left' ? 0 : splitX;
  const maxX = side === 'left' ? splitX : sourceWidth;

  return boxes.flatMap((box, slotIndex) => {
    const clippedLeft = Math.max(box.x, minX);
    const clippedRight = Math.min(box.x + box.width, maxX);
    if (clippedRight <= clippedLeft) return [];

    return [{
      x: clippedLeft - minX,
      y: box.y,
      width: clippedRight - clippedLeft,
      height: box.height,
      slotIndex,
      originalWidth: box.width,
      originalHeight: box.height,
      clipOffsetX: clippedLeft - box.x,
      clipOffsetY: 0,
    }];
  });
};

const clipTextFramesToSpreadSide = (
  boxes: NonNullable<FrameLayoutDefinition['textFrames']>,
  sourceWidth: number,
  side: NonNullable<PageData['spreadSide']>,
) => {
  const splitX = sourceWidth / 2;
  const minX = side === 'left' ? 0 : splitX;
  const maxX = side === 'left' ? splitX : sourceWidth;

  return boxes.flatMap((box, slotIndex) => {
    const clippedLeft = Math.max(box.x, minX);
    const clippedRight = Math.min(box.x + box.width, maxX);
    if (clippedRight <= clippedLeft) return [];

    return [{
      x: clippedLeft - minX,
      y: box.y,
      width: clippedRight - clippedLeft,
      height: box.height,
      slotIndex,
      textType: box.textType,
      isVertical: box.isVertical,
    }];
  });
};

export function getDisplayFrameLayout(
  frameLayout: FrameLayoutDefinition,
  spreadSide?: PageData['spreadSide'],
): DisplayFrameLayout {
  if (frameLayout.pageCount !== 2 || !spreadSide) {
    return {
      sourceWidth: frameLayout.sourceWidth,
      sourceHeight: frameLayout.sourceHeight,
      frames: frameLayout.frames.map((frame, slotIndex) => ({
        ...frame,
        slotIndex,
        originalWidth: frame.width,
        originalHeight: frame.height,
        clipOffsetX: 0,
        clipOffsetY: 0,
      })),
      textFrames: (frameLayout.textFrames ?? []).map((frame, slotIndex) => ({
        ...frame,
        slotIndex,
      })),
    };
  }

  return {
    sourceWidth: frameLayout.sourceWidth / 2,
    sourceHeight: frameLayout.sourceHeight,
    frames: clipPhotoFramesToSpreadSide(frameLayout.frames, frameLayout.sourceWidth, spreadSide),
    textFrames: clipTextFramesToSpreadSide(frameLayout.textFrames ?? [], frameLayout.sourceWidth, spreadSide),
  };
}

export function getDisplayPhotoFrameImageStyle(frame: DisplayPhotoFrame) {
  return {
    left: `${-(frame.clipOffsetX / frame.width) * 100}%`,
    top: `${-(frame.clipOffsetY / frame.height) * 100}%`,
    width: `${(frame.originalWidth / frame.width) * 100}%`,
    height: `${(frame.originalHeight / frame.height) * 100}%`,
  };
}

export function getGridClass(layout: LayoutType) {
  switch (layout) {
    case 'cover': return 'flex';
    case '1': return 'grid-rows-1';
    case '2-row': return 'grid-rows-2';
    case '2-col': return 'grid-cols-2';
    case '3-row': return 'grid-rows-3';
    case '3-top': return 'grid-rows-2 grid-cols-2 [&>*:first-child]:col-span-2';
    case '4-grid': return 'grid-rows-2 grid-cols-2';
    case '4-top': return 'grid-rows-2 grid-cols-3 [&>*:first-child]:col-span-3';
    case '5-grid': return 'grid-rows-3 grid-cols-2 [&>*:nth-child(3)]:col-span-2';
    case '6-grid': return 'grid-rows-3 grid-cols-2';
    default: return 'grid-rows-1';
  }
}
