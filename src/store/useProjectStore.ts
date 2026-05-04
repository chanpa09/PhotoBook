import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import localforage from 'localforage';
import {
  BODY_PAGE_COUNT_OPTIONS,
  createDefaultPages,
  DEFAULT_SETTINGS,
  STORAGE_KEY_PAGES,
  STORAGE_KEY_SETTINGS,
} from '../constants';
import type {
  FrameLayoutDefinition,
  LayoutText,
  LayoutType,
  PageData,
  Photo,
  ProjectSettings,
  StampAsset,
  StampInstance,
} from '../types';
import {
  fetchImportedFrameLayouts,
  getFrameLayout,
  getSpreadStartIndex,
  isImportedLayout,
  resolveLayoutId,
  setImportedFrameLayouts,
} from '../utils/layout';
import { restoreImageUrls } from '../utils/imageStore';
import { A4_PAGE_HEIGHT, A4_PAGE_WIDTH, DEFAULT_STAMP_SIZE } from '../utils/stamps';

type ImportedLayoutStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Strip runtime-only `url` from photos before persisting to avoid saving base64/ObjectURLs */
const stripPhotoUrls = (pages: PageData[]): PageData[] =>
  pages.map((page) => ({
    ...page,
    photos: page.photos.map((photo) =>
      photo ? { ...photo, url: '' } : null,
    ),
  }));

const clampPageIndex = (index: number, pageCount: number) => {
  if (pageCount <= 0) return 0;
  return Math.min(Math.max(0, index), pageCount - 1);
};

const createBlankPage = (): PageData => ({
  id: crypto.randomUUID(),
  layout: '1',
  photos: [],
  stamps: [],
});

const ensureEvenBodyPages = (pages: PageData[]): PageData[] => {
  const nextPages = [...pages];
  const bodyCount = Math.max(0, nextPages.length - 1);
  if (bodyCount === 0) {
    nextPages.push(createBlankPage(), createBlankPage());
  } else if (bodyCount % 2 === 1) {
    nextPages.push(createBlankPage());
  }
  return nextPages;
};

const resetSpreadPage = (page: PageData): PageData => ({
  ...page,
  layout: '1',
  spreadSide: undefined,
});

const getSpreadPartnerIndex = (pages: PageData[], index: number) => {
  const page = pages[index];
  if (!page?.spreadSide) return null;

  const frameLayout = getFrameLayout(page.layout);
  if (!frameLayout && !isImportedLayout(page.layout)) return null;
  if (frameLayout && frameLayout.pageCount !== 2) return null;

  const partnerIndex = page.spreadSide === 'left' ? index + 1 : index - 1;
  const partner = pages[partnerIndex];
  if (!partner || partner.layout !== page.layout) return null;
  if (page.spreadSide === 'left' && partner.spreadSide !== 'right') return null;
  if (page.spreadSide === 'right' && partner.spreadSide !== 'left') return null;

  return partnerIndex;
};

const detachSpreadPair = (pages: PageData[], index: number) => {
  const partnerIndex = getSpreadPartnerIndex(pages, index);
  if (partnerIndex !== null) {
    pages[partnerIndex] = resetSpreadPage(pages[partnerIndex]);
  }

  if (pages[index]?.spreadSide) {
    pages[index] = {
      ...pages[index],
      spreadSide: undefined,
    };
  }
};

const normalizeSpreadPairs = (pages: PageData[]): PageData[] =>
  pages.map((page, index) => {
    if (!page.spreadSide) return page;
    return getSpreadPartnerIndex(pages, index) === null ? resetSpreadPage(page) : page;
  });

const normalizePages = (pages?: PageData[] | null): PageData[] => {
  const sourcePages = pages && pages.length > 0 ? pages : createDefaultPages();

  return ensureEvenBodyPages(normalizeSpreadPairs(sourcePages.map((page) => ({
    ...page,
    layout: resolveLayoutId(page.layout),
    photos: Array.from(page.photos ?? [], (photo) => photo ?? null),
    stamps: Array.from(page.stamps ?? []),
  }))));
};

const pagesContainImportedLayout = (pages: PageData[]) =>
  pages.some((page) => isImportedLayout(resolveLayoutId(page.layout)));

const isAllowedBodyPageCount = (count: number) =>
  BODY_PAGE_COUNT_OPTIONS.some((option) => option === count);

const getCoverLayoutTexts = (page: PageData, frameLayout: FrameLayoutDefinition): LayoutText[] =>
  Array.from({ length: frameLayout.textFrameCount }, (_, index) => {
    const currentText = page.layoutTexts?.[index];
    const frame = frameLayout.textFrames?.[index];
    const fallbackValue = frame?.textType === 'title'
      ? page.coverTitle ?? ''
      : frame?.textType === 'subtitle'
        ? page.coverDate ?? ''
        : '';

    return {
      ...currentText,
      value: currentText?.value ?? fallbackValue,
    };
  });

const getCoverTextValues = (page: PageData) => {
  const frameLayout = getFrameLayout(page.layout);
  const titleIndex = frameLayout?.textFrames?.findIndex((frame) => frame.textType === 'title') ?? -1;
  const subtitleIndex = frameLayout?.textFrames?.findIndex((frame) => frame.textType === 'subtitle') ?? -1;

  return {
    coverTitle: titleIndex >= 0 ? page.layoutTexts?.[titleIndex]?.value ?? page.coverTitle : page.coverTitle,
    coverDate: subtitleIndex >= 0 ? page.layoutTexts?.[subtitleIndex]?.value ?? page.coverDate : page.coverDate,
  };
};

interface ProjectState {
  isLoaded: boolean;
  importedLayouts: FrameLayoutDefinition[];
  importedLayoutStatus: ImportedLayoutStatus;
  importedLayoutError: string | null;
  pages: PageData[];
  settings: ProjectSettings;
  currentPageIndex: number;
  
  // Actions
  setIsLoaded: (isLoaded: boolean) => void;
  setPages: (pages: PageData[] | ((current: PageData[]) => PageData[])) => void;
  setSettings: (settings: ProjectSettings) => void;
  setCurrentPageIndex: (index: number | ((current: number) => number)) => void;
  setBodyPageCount: (count: number) => void;
  
  movePage: (direction: 'up' | 'down') => void;
  updatePhoto: (pageId: string, index: number, photo: Partial<Photo> | null) => void;
  updateLayoutText: (pageId: string, textIndex: number, updates: Partial<LayoutText>) => void;
  updatePageData: (pageId: string, updates: Partial<PageData>) => void;
  updateLayout: (layout: LayoutType) => void;
  updatePhotoTransform: (pageId: string, index: number, transform: { scale?: number; offset?: { x: number; y: number } }) => void;
  addStamp: (pageId: string, stamp: StampAsset) => void;
  addStampAt: (pageId: string, stamp: StampAsset, position: { x: number; y: number }) => void;
  updateStamp: (pageId: string, instanceId: string, updates: Partial<StampInstance>) => void;
  removeStamp: (pageId: string, instanceId: string) => void;
  bringStampForward: (pageId: string, instanceId: string) => void;
  reorderPages: (activeId: string, overId: string) => void;
  loadImportedLayouts: () => Promise<void>;
  
  // Storage Migration
  loadLegacyData: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>()(
  temporal(
    persist(
      (set, get) => ({
        isLoaded: false,
        importedLayouts: [],
        importedLayoutStatus: 'idle',
        importedLayoutError: null,
        pages: createDefaultPages(),
        settings: DEFAULT_SETTINGS,
        currentPageIndex: 0,

        setIsLoaded: (isLoaded) => set({ isLoaded }),

        setPages: (update) => {
          const nextPages = normalizePages(typeof update === 'function' ? update(get().pages) : update);
          set({
            pages: nextPages,
            currentPageIndex: clampPageIndex(get().currentPageIndex, nextPages.length),
          });
        },

        setSettings: (settings) => set({ settings }),

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

        updatePhoto: (pageId, index, photoUpdate) => {
          const pages = normalizePages(get().pages);
          const pageIndex = pages.findIndex((page) => page.id === pageId);
          if (pageIndex === -1) return;

          const nextPages = [...pages];
          const page = nextPages[pageIndex];
          const newPhotos = [...page.photos];
          let nextPhoto: Photo | null = null;

          if (photoUpdate === null) {
            newPhotos[index] = null;
          } else {
            nextPhoto = { ...(newPhotos[index] ?? {}), ...photoUpdate } as Photo;
            newPhotos[index] = nextPhoto;
          }

          nextPages[pageIndex] = { ...page, photos: newPhotos };

          const partnerIndex = getSpreadPartnerIndex(nextPages, pageIndex);
          if (partnerIndex !== null) {
            const partnerPhotos = [...nextPages[partnerIndex].photos];
            partnerPhotos[index] = nextPhoto;
            nextPages[partnerIndex] = { ...nextPages[partnerIndex], photos: partnerPhotos };
          }

          set({ pages: nextPages });
        },

        updatePageData: (pageId, updates) => {
          const nextPages = get().pages.map((page) => (
            page.id === pageId ? { ...page, ...updates } : page
          ));
          set({ pages: nextPages });
        },

        updateLayoutText: (pageId, textIndex, updates) => {
          const pages = normalizePages(get().pages);
          const pageIndex = pages.findIndex((page) => page.id === pageId);
          if (pageIndex === -1) return;

          const nextPages = [...pages];
          const applyTextUpdate = (index: number) => {
            const page = nextPages[index];
            const layoutTexts = [...(page.layoutTexts ?? [])];
            const currentText = layoutTexts[textIndex] ?? { value: '' };
            layoutTexts[textIndex] = {
              ...currentText,
              ...updates,
              style: updates.style ?? currentText.style,
            };
            nextPages[index] = { ...page, layoutTexts };
          };

          applyTextUpdate(pageIndex);

          const partnerIndex = getSpreadPartnerIndex(nextPages, pageIndex);
          if (partnerIndex !== null) {
            applyTextUpdate(partnerIndex);
          }

          set({ pages: nextPages });
        },

        updateLayout: (layout) => {
          const { pages, currentPageIndex } = get();
          const normalizedPages = normalizePages(pages);
          const safePageIndex = clampPageIndex(currentPageIndex, normalizedPages.length);

          const resolvedLayout = resolveLayoutId(layout);
          const frameLayout = getFrameLayout(resolvedLayout);
          const nextPages = [...normalizedPages];

          if (safePageIndex === 0) {
            if (resolvedLayout === 'cover') {
              const coverTextValues = getCoverTextValues(nextPages[0]);
              nextPages[0] = {
                ...nextPages[0],
                ...coverTextValues,
                layout: resolvedLayout,
                spreadSide: undefined,
                photos: [nextPages[0].photos[0] ?? null],
                layoutTexts: undefined,
              };
              set({ pages: nextPages, currentPageIndex: 0 });
            }

            if (frameLayout?.templateType !== 'cover' || frameLayout.pageCount !== 1) return;

            const sourcePhotos = nextPages[0].photos.filter((photo) => photo !== null);
            nextPages[0] = {
              ...nextPages[0],
              layout: resolvedLayout,
              spreadSide: undefined,
              photos: Array.from(
                { length: frameLayout.photoFrameCount },
                (_, index) => sourcePhotos[index] ?? null,
              ),
              layoutTexts: getCoverLayoutTexts(nextPages[0], frameLayout),
            };
            set({ pages: nextPages, currentPageIndex: 0 });
            return;
          }

          if (frameLayout?.templateType === 'cover') return;

          if (frameLayout?.pageCount === 2) {
            const spreadStartIndex = getSpreadStartIndex(safePageIndex);
            detachSpreadPair(nextPages, spreadStartIndex);
            if (spreadStartIndex + 1 < nextPages.length) {
              detachSpreadPair(nextPages, spreadStartIndex + 1);
            }
            const nextPage = nextPages[spreadStartIndex + 1] ?? {
              id: crypto.randomUUID(),
              layout: resolvedLayout,
              photos: [],
            };
            const sourcePhotos = [
              ...nextPages[spreadStartIndex].photos,
              ...nextPage.photos,
            ].filter((photo) => photo !== null);
            const spreadPhotos = Array.from(
              { length: frameLayout.photoFrameCount },
              (_, index) => sourcePhotos[index] ?? null,
            );
            const sourceLayoutTexts = [...(nextPages[spreadStartIndex].layoutTexts ?? [])];
            (nextPage.layoutTexts ?? []).forEach((layoutText, index) => {
              if (!sourceLayoutTexts[index]) {
                sourceLayoutTexts[index] = layoutText;
              }
            });
            const spreadLayoutTexts = Array.from(
              { length: frameLayout.textFrameCount },
              (_, index) => sourceLayoutTexts[index] ?? { value: '' },
            );

            nextPages[spreadStartIndex] = {
              ...nextPages[spreadStartIndex],
              layout: resolvedLayout,
              spreadSide: 'left',
              photos: spreadPhotos,
              layoutTexts: spreadLayoutTexts,
            };
            nextPages[spreadStartIndex + 1] = {
              ...nextPage,
              layout: resolvedLayout,
              spreadSide: 'right',
              photos: spreadPhotos,
              layoutTexts: spreadLayoutTexts,
            };

            set({ pages: nextPages, currentPageIndex: safePageIndex });
            return;
          }

          detachSpreadPair(nextPages, safePageIndex);
          nextPages[safePageIndex] = {
            ...nextPages[safePageIndex],
            layout: resolvedLayout,
            spreadSide: undefined,
          };
          set({ pages: nextPages, currentPageIndex: safePageIndex });
        },

        updatePhotoTransform: (pageId, index, transform) => {
          const pages = normalizePages(get().pages);
          const pageIndex = pages.findIndex((page) => page.id === pageId);
          if (pageIndex === -1) return;

          const nextPages = [...pages];
          const page = nextPages[pageIndex];
          const newPhotos = [...page.photos];
          const currentPhoto = newPhotos[index];
          if (!currentPhoto) return;

          const nextPhoto = {
            ...currentPhoto,
            scale: transform.scale ?? currentPhoto.scale ?? 1,
            offset: transform.offset ?? currentPhoto.offset ?? { x: 0, y: 0 },
          };
          newPhotos[index] = nextPhoto;
          nextPages[pageIndex] = { ...page, photos: newPhotos };

          const partnerIndex = getSpreadPartnerIndex(nextPages, pageIndex);
          if (partnerIndex !== null) {
            const partnerPhotos = [...nextPages[partnerIndex].photos];
            partnerPhotos[index] = nextPhoto;
            nextPages[partnerIndex] = { ...nextPages[partnerIndex], photos: partnerPhotos };
          }

          set({ pages: nextPages });
        },

        addStamp: (pageId, stamp) => {
          const defaultSize = stamp.minSize ?? DEFAULT_STAMP_SIZE;
          get().addStampAt(pageId, stamp, {
            x: (A4_PAGE_WIDTH - defaultSize) / 2,
            y: (A4_PAGE_HEIGHT - defaultSize) / 2,
          });
        },

        addStampAt: (pageId, stamp, position) => {
          const nextPages = get().pages.map((page) => {
            if (page.id !== pageId) return page;

            const stamps = page.stamps ?? [];
            const nextZIndex = Math.max(0, ...stamps.map((item) => item.zIndex)) + 1;
            const defaultSize = stamp.minSize ?? DEFAULT_STAMP_SIZE;
            const nextStamp: StampInstance = {
              instanceId: crypto.randomUUID(),
              stampId: stamp.id,
              imageUrl: stamp.imageUrl,
              x: position.x,
              y: position.y,
              size: defaultSize,
              scale: 1,
              rotate: 0,
              zIndex: nextZIndex,
            };

            return {
              ...page,
              stamps: [...stamps, nextStamp],
            };
          });

          set({ pages: nextPages });
        },

        updateStamp: (pageId, instanceId, updates) => {
          const nextPages = get().pages.map((page) => {
            if (page.id !== pageId) return page;

            return {
              ...page,
              stamps: (page.stamps ?? []).map((stamp) => (
                stamp.instanceId === instanceId ? { ...stamp, ...updates } : stamp
              )),
            };
          });

          set({ pages: nextPages });
        },

        removeStamp: (pageId, instanceId) => {
          const nextPages = get().pages.map((page) => (
            page.id === pageId
              ? { ...page, stamps: (page.stamps ?? []).filter((stamp) => stamp.instanceId !== instanceId) }
              : page
          ));

          set({ pages: nextPages });
        },

        bringStampForward: (pageId, instanceId) => {
          const nextPages = get().pages.map((page) => {
            if (page.id !== pageId) return page;

            const stamps = page.stamps ?? [];
            const currentStamp = stamps.find((stamp) => stamp.instanceId === instanceId);
            if (!currentStamp) return page;

            const nextZIndex = Math.max(0, ...stamps.map((stamp) => stamp.zIndex)) + 1;
            if (currentStamp.zIndex === nextZIndex - 1) return page;

            return {
              ...page,
              stamps: stamps.map((stamp) => (
                stamp.instanceId === instanceId ? { ...stamp, zIndex: nextZIndex } : stamp
              )),
            };
          });

          set({ pages: nextPages });
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

        loadImportedLayouts: async () => {
          const status = get().importedLayoutStatus;
          if (status === 'loading' || status === 'ready') return;

          set({ importedLayoutStatus: 'loading', importedLayoutError: null });

          try {
            const importedLayouts = await fetchImportedFrameLayouts();
            setImportedFrameLayouts(importedLayouts);

            const nextPages = normalizePages(get().pages);
            set({
              importedLayouts,
              importedLayoutStatus: 'ready',
              pages: nextPages,
              currentPageIndex: clampPageIndex(get().currentPageIndex, nextPages.length),
            });
          } catch (error) {
            console.error('Failed to load imported layouts', error);
            set({
              importedLayoutStatus: 'error',
              importedLayoutError: error instanceof Error ? error.message : 'Failed to load imported layouts',
            });
          }
        },

        loadLegacyData: async () => {
          try {
            const savedPages = await localforage.getItem<PageData[]>(STORAGE_KEY_PAGES);
            const savedSettings = await localforage.getItem<ProjectSettings>(STORAGE_KEY_SETTINGS);
            const nextPages = normalizePages(savedPages);

            set({
              pages: nextPages,
              settings: savedSettings ?? get().settings,
              currentPageIndex: clampPageIndex(get().currentPageIndex, nextPages.length),
            });

            if (pagesContainImportedLayout(nextPages)) {
              await get().loadImportedLayouts();
            }
          } catch (error) {
            console.error('Failed to load legacy save data', error);
            set({
              pages: normalizePages(get().pages),
              currentPageIndex: clampPageIndex(get().currentPageIndex, get().pages.length),
            });
          } finally {
            set({ isLoaded: true });
          }
        },
      }),
      {
        name: 'photobook_storage_v2',
        storage: createJSONStorage(() => localforage),
        // Persist only current state, exclude actions and isLoaded.
        // Strip Photo.url to avoid persisting base64/ObjectURLs.
        partialize: (state) => ({
          pages: stripPhotoUrls(state.pages),
          settings: state.settings,
          currentPageIndex: state.currentPageIndex,
        }),
        onRehydrateStorage: (state) => {
          return async (rehydratedState, error) => {
            if (error) {
              console.error('Failed to rehydrate project storage', error);
            }
            // If no rehydrated state (first time), load legacy or set loaded
            if (!rehydratedState || !rehydratedState.pages || rehydratedState.pages.length === 0) {
              state.loadLegacyData();
            } else {
              const nextPages = normalizePages(rehydratedState.pages);
              // Restore image URLs from Blob storage
              const restoredPages = await restoreImageUrls(nextPages);
              rehydratedState.setPages(restoredPages);
              rehydratedState.setCurrentPageIndex(
                clampPageIndex(rehydratedState.currentPageIndex, restoredPages.length)
              );
              if (pagesContainImportedLayout(restoredPages)) {
                await rehydratedState.loadImportedLayouts();
              }
              rehydratedState.setIsLoaded(true);
            }
          };
        },
      }
    ),
    {
      // Zundo options
      limit: 50, // Limit undo history to 50 steps
      partialize: (state) => ({
        pages: stripPhotoUrls(state.pages),
        settings: state.settings,
        currentPageIndex: state.currentPageIndex,
      }),
    }
  )
);
