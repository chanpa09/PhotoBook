import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import { arrayMove } from '@dnd-kit/sortable';
import localforage from 'localforage';
import {
  createDefaultPages,
  DEFAULT_SETTINGS,
  STORAGE_KEY_PAGES,
  STORAGE_KEY_SETTINGS,
} from '../constants';
import type { LayoutType, PageData, Photo, ProjectSettings } from '../types';
import { restoreImageUrls } from '../utils/imageStore';

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

const normalizePages = (pages?: PageData[] | null): PageData[] => {
  const sourcePages = pages && pages.length > 0 ? pages : createDefaultPages();

  return sourcePages.map((page) => ({
    ...page,
    photos: Array.from(page.photos ?? [], (photo) => photo ?? null),
  }));
};

interface ProjectState {
  isLoaded: boolean;
  pages: PageData[];
  settings: ProjectSettings;
  currentPageIndex: number;
  
  // Actions
  setIsLoaded: (isLoaded: boolean) => void;
  setPages: (pages: PageData[] | ((current: PageData[]) => PageData[])) => void;
  setSettings: (settings: ProjectSettings) => void;
  setCurrentPageIndex: (index: number | ((current: number) => number)) => void;
  
  addPage: () => void;
  removePage: () => void;
  movePage: (direction: 'up' | 'down') => void;
  updatePhoto: (pageId: string, index: number, photo: Partial<Photo> | null) => void;
  updatePageData: (pageId: string, updates: Partial<PageData>) => void;
  updateLayout: (layout: LayoutType) => void;
  updatePhotoTransform: (pageId: string, index: number, transform: { scale?: number; offset?: { x: number; y: number } }) => void;
  reorderPages: (activeId: string, overId: string) => void;
  
  // Storage Migration
  loadLegacyData: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>()(
  temporal(
    persist(
      (set, get) => ({
        isLoaded: false,
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

        addPage: () => {
          const pages = normalizePages(get().pages);
          const newPage: PageData = {
            id: crypto.randomUUID(),
            layout: '1',
            photos: [],
          };
          const nextPages = [...pages, newPage];
          set({
            pages: nextPages,
            currentPageIndex: nextPages.length - 1,
          });
        },

        removePage: () => {
          const { pages, currentPageIndex } = get();
          const normalizedPages = normalizePages(pages);
          if (normalizedPages.length <= 1) return;
          
          const safePageIndex = clampPageIndex(currentPageIndex, normalizedPages.length);
          const nextPages = normalizedPages.filter((_, index) => index !== safePageIndex);
          set({
            pages: nextPages,
            currentPageIndex: clampPageIndex(safePageIndex - 1, nextPages.length),
          });
        },

        movePage: (direction) => {
          const { pages, currentPageIndex } = get();
          const normalizedPages = normalizePages(pages);
          const safePageIndex = clampPageIndex(currentPageIndex, normalizedPages.length);
          const targetIndex = direction === 'up' ? safePageIndex - 1 : safePageIndex + 1;
          
          if (targetIndex < 0 || targetIndex >= normalizedPages.length) return;

          const nextPages = [...normalizedPages];
          [nextPages[safePageIndex], nextPages[targetIndex]] = [
            nextPages[targetIndex],
            nextPages[safePageIndex],
          ];
          
          set({
            pages: nextPages,
            currentPageIndex: targetIndex,
          });
        },

        updatePhoto: (pageId, index, photoUpdate) => {
          const nextPages = get().pages.map((page) => {
            if (page.id !== pageId) return page;

            const newPhotos = [...page.photos];
            if (photoUpdate === null) {
              newPhotos[index] = null;
            } else {
              newPhotos[index] = { ...(newPhotos[index] ?? {}), ...photoUpdate } as Photo;
            }

            return { ...page, photos: newPhotos };
          });
          set({ pages: nextPages });
        },

        updatePageData: (pageId, updates) => {
          const nextPages = get().pages.map((page) => (
            page.id === pageId ? { ...page, ...updates } : page
          ));
          set({ pages: nextPages });
        },

        updateLayout: (layout) => {
          const { pages, currentPageIndex } = get();
          const safePageIndex = clampPageIndex(currentPageIndex, pages.length);
          const nextPages = pages.map((page, index) => (
            index === safePageIndex ? { ...page, layout } : page
          ));
          set({ pages: nextPages, currentPageIndex: safePageIndex });
        },

        updatePhotoTransform: (pageId, index, transform) => {
          const nextPages = get().pages.map((page) => {
            if (page.id !== pageId) return page;

            const newPhotos = [...page.photos];
            if (newPhotos[index]) {
              newPhotos[index] = {
                ...newPhotos[index],
                scale: transform.scale ?? newPhotos[index].scale ?? 1,
                offset: transform.offset ?? newPhotos[index].offset ?? { x: 0, y: 0 },
              };
            }

            return { ...page, photos: newPhotos };
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
            const nextPages = arrayMove(normalizedPages, oldIndex, newIndex);
            
            // If the current page was moved, update its index
            let nextPageIndex = safePageIndex;
            if (safePageIndex === oldIndex) {
              nextPageIndex = newIndex;
            } else if (
              oldIndex < safePageIndex &&
              newIndex >= safePageIndex
            ) {
              nextPageIndex = safePageIndex - 1;
            } else if (
              oldIndex > safePageIndex &&
              newIndex <= safePageIndex
            ) {
              nextPageIndex = safePageIndex + 1;
            }

            set({
              pages: nextPages,
              currentPageIndex: clampPageIndex(nextPageIndex, nextPages.length),
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
