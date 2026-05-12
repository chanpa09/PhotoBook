import {
  BODY_PAGE_COUNT_OPTIONS,
  createDefaultPages,
} from '../constants';
import type {
  PageData,
} from '../types';
import {
  getSpreadPartnerIndex,
  getSpreadStartIndex,
  isImportedLayout,
  resolveLayoutId,
} from '../utils/layout';

/** Strip runtime-only `url` from photos before persisting to avoid saving base64/ObjectURLs */
export const stripPhotoUrls = (pages: PageData[]): PageData[] =>
  pages.map((page) => ({
    ...page,
    photos: page.photos.map((photo) =>
      photo ? { ...photo, url: '' } : null,
    ),
  }));

export const clampPageIndex = (index: number, pageCount: number) => {
  if (pageCount <= 0) return 0;
  return Math.min(Math.max(0, index), pageCount - 1);
};

export const createBlankPage = (): PageData => ({
  id: crypto.randomUUID(),
  layout: '1',
  photos: [],
  stamps: [],
});

export const ensureEvenBodyPages = (pages: PageData[]): PageData[] => {
  const nextPages = [...pages];
  const bodyCount = Math.max(0, nextPages.length - 1);
  if (bodyCount === 0) {
    nextPages.push(createBlankPage(), createBlankPage());
  } else if (bodyCount % 2 === 1) {
    nextPages.push(createBlankPage());
  }
  return nextPages;
};

export const normalizeSpreadPairs = (pages: PageData[]): PageData[] =>
  pages.map((page, index) => {
    if (!page.spreadSide) return page;
    return getSpreadPartnerIndex(pages, index) === null ? { ...page, layout: '1', spreadSide: undefined } : page;
  });

export const normalizePages = (pages?: PageData[] | null): PageData[] => {
  const sourcePages = pages && pages.length > 0 ? pages : createDefaultPages();

  return ensureEvenBodyPages(normalizeSpreadPairs(sourcePages.map((page) => ({
    ...page,
    layout: resolveLayoutId(page.layout),
    photos: Array.from(page.photos ?? [], (photo) => photo ?? null),
    stamps: Array.from(page.stamps ?? []),
  }))));
};

export const pagesContainImportedLayout = (pages: PageData[]) =>
  pages.some((page) => isImportedLayout(resolveLayoutId(page.layout)));

export const isAllowedBodyPageCount = (count: number) =>
  BODY_PAGE_COUNT_OPTIONS.some((option) => option === count);

export { getSpreadStartIndex };
