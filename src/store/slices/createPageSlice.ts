import type { StateCreator } from 'zustand';
import { createDefaultPages } from '@/constants';
import {
  applyLayoutToPage,
} from '../../utils/layout';
import {
  clampPageIndex,
  createBlankPage,
  getSpreadStartIndex,
  isAllowedBodyPageCount,
  normalizePages,
} from '../storeUtils';
import type { PageSlice, ProjectState } from '@/store/types';

export const createPageSlice: StateCreator<ProjectState, [], [], PageSlice> = (set, get) => ({
  pages: createDefaultPages(),
  currentPageIndex: 0,

  setPages: (update) => {
    const nextPages = normalizePages(typeof update === 'function' ? update(get().pages) : update);
    set({
      pages: nextPages,
      currentPageIndex: clampPageIndex(get().currentPageIndex, nextPages.length),
    });
  },

  setCurrentPageIndex: (update) => {
    const nextIndex = typeof update === 'function' ? update(get().currentPageIndex) : update;
    set({ currentPageIndex: clampPageIndex(nextIndex, get().pages.length) });
  },

  setBodyPageCount: (count) => {
    if (!isAllowedBodyPageCount(count)) return;

    const normalizedPages = normalizePages(get().pages);
    const bodyPages = normalizedPages.slice(1, count + 1);
    while (bodyPages.length < count) {
      bodyPages.push(createBlankPage());
    }

    const nextPages = normalizePages([normalizedPages[0], ...bodyPages]);
    set({
      pages: nextPages,
      currentPageIndex: clampPageIndex(get().currentPageIndex, nextPages.length),
    });
  },

  movePage: (direction) => {
    const { pages, currentPageIndex } = get();
    const normalizedPages = normalizePages(pages);
    const safePageIndex = getSpreadStartIndex(clampPageIndex(currentPageIndex, normalizedPages.length));
    if (safePageIndex === 0) return;

    const pairStart = safePageIndex;
    const pairEnd = Math.min(pairStart + 1, normalizedPages.length - 1);
    if (direction === 'up' && pairStart <= 1) return;
    if (direction === 'down' && pairEnd >= normalizedPages.length - 1) return;

    const movingPages = normalizedPages.slice(pairStart, pairEnd + 1);
    const remainingPages = [
      ...normalizedPages.slice(0, pairStart),
      ...normalizedPages.slice(pairEnd + 1),
    ];
    const insertIndex = direction === 'up' ? pairStart - 2 : pairStart + 2;
    const nextPages = [
      ...remainingPages.slice(0, insertIndex),
      ...movingPages,
      ...remainingPages.slice(insertIndex),
    ];
    
    set({
      pages: nextPages,
      currentPageIndex: insertIndex,
    });
  },

  updatePageData: (pageId, updates) => {
    const nextPages = get().pages.map((page) => (
      page.id === pageId ? { ...page, ...updates } : page
    ));
    set({ pages: nextPages });
  },

  updateLayout: (layout) => {
    const { pages, currentPageIndex } = get();
    const normalizedPages = normalizePages(pages);
    const safePageIndex = clampPageIndex(currentPageIndex, normalizedPages.length);

    const nextPages = applyLayoutToPage(normalizedPages, safePageIndex, layout);
    
    set({
      pages: nextPages,
      currentPageIndex: safePageIndex === 0 ? 0 : safePageIndex,
    });
  },

  reorderPages: (activeId, overId) => {
    const { pages, currentPageIndex } = get();
    const normalizedPages = normalizePages(pages);
    const safePageIndex = clampPageIndex(currentPageIndex, normalizedPages.length);
    const oldIndex = normalizedPages.findIndex((page) => page.id === activeId);
    const newIndex = normalizedPages.findIndex((page) => page.id === overId);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const oldStart = getSpreadStartIndex(oldIndex);
      const newStart = getSpreadStartIndex(newIndex);
      if (oldStart === 0 || newStart === 0 || oldStart === newStart) return;

      const movingPages = normalizedPages.slice(oldStart, oldStart + 2);
      const remainingPages = [
        ...normalizedPages.slice(0, oldStart),
        ...normalizedPages.slice(oldStart + movingPages.length),
      ];
      const insertIndex = oldStart < newStart ? newStart - movingPages.length : newStart;
      const nextPages = normalizePages([
        ...remainingPages.slice(0, insertIndex),
        ...movingPages,
        ...remainingPages.slice(insertIndex),
      ]);
      const currentWasMoved = safePageIndex >= oldStart && safePageIndex < oldStart + movingPages.length;
      const nextPageIndex = currentWasMoved
        ? insertIndex
        : getSpreadStartIndex(clampPageIndex(safePageIndex, nextPages.length));

      set({
        pages: nextPages,
        currentPageIndex: nextPageIndex,
      });
    }
  },
});
