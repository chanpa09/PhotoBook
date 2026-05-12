import { afterEach, describe, expect, it } from 'vitest';
import type { FrameLayoutDefinition, PageData } from '@/types';
import {
  applyLayoutToPage,
  getExportGroups,
  getPageSpreads,
  getSpreadStartIndex,
  isTwoPageSpread,
  setImportedFrameLayouts,
} from './layout';

const twoPageLayout: FrameLayoutDefinition = {
  id: 'imported-two-page',
  sourceId: 'sample',
  templateType: 'page',
  variationName: 'two-page',
  label: 'Two Page',
  pageCount: 2,
  photoFrameCount: 1,
  textFrameCount: 0,
  isUserSelectable: true,
  isObjectLayer: false,
  isDefault: false,
  sourceWidth: 1588,
  sourceHeight: 1123,
  frames: [{ x: 0, y: 0, width: 1588, height: 1123 }],
};

const createPage = (id: string, updates: Partial<PageData> = {}): PageData => ({
  id,
  layout: '1',
  photos: [],
  stamps: [],
  ...updates,
});

describe('layout spreads', () => {
  afterEach(() => {
    setImportedFrameLayouts([]);
  });

  it('keeps the cover as a single spread and pairs body pages', () => {
    const pages = [
      createPage('cover', { layout: 'cover' }),
      createPage('page-1'),
      createPage('page-2'),
      createPage('page-3'),
    ];

    expect(getSpreadStartIndex(0)).toBe(0);
    expect(getSpreadStartIndex(2)).toBe(1);
    expect(getPageSpreads(pages).map((spread) => spread.pageIndexes)).toEqual([[0], [1, 2], [3]]);
  });

  it('exports regular body spreads as individual pages', () => {
    const pages = [
      createPage('cover', { layout: 'cover' }),
      createPage('page-1'),
      createPage('page-2'),
    ];

    expect(getExportGroups(pages).map((group) => group.pageIndexes)).toEqual([[0], [1], [2]]);
  });

  it('exports imported two-page spreads as one grouped image', () => {
    setImportedFrameLayouts([twoPageLayout]);
    const pages = [
      createPage('cover', { layout: 'cover' }),
      createPage('left'),
      createPage('right'),
    ];

    const nextPages = applyLayoutToPage(pages, 1, 'imported-two-page');

    expect(isTwoPageSpread(nextPages.slice(1, 3))).toBe(true);
    expect(getExportGroups(nextPages).map((group) => group.pageIndexes)).toEqual([[0], [1, 2]]);
  });
});
