import type { StateCreator } from 'zustand';
import localforage from 'localforage';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY_PAGES,
  STORAGE_KEY_SETTINGS,
} from '../../constants';
import type { PageData, ProjectSettings } from '@/store/types';
import {
  fetchImportedFrameLayouts,
  setImportedFrameLayouts,
} from '../../utils/layout';
import { collectImageIdsFromPages, deleteUnusedImages, restoreImageUrls, saveImage } from '@/utils/imageStore';
import {
  clampPageIndex,
  normalizePages,
  pagesContainImportedLayout,
} from '../storeUtils';
import type { ProjectSlice, ProjectState } from '@/store/types';

export const createProjectSlice: StateCreator<ProjectState, [], [], ProjectSlice> = (set, get) => ({
  isLoaded: false,
  importedLayouts: [],
  importedLayoutStatus: 'idle',
  importedLayoutError: null,
  settings: DEFAULT_SETTINGS,

  setIsLoaded: (isLoaded) => set({ isLoaded }),

  setSettings: (settings) => set({ settings }),

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

  replaceProject: async (project) => {
    await Promise.all(project.images.map((image) => saveImage(image.id, image.blob)));

    const nextPages = normalizePages(project.pages);
    const restoredPages = await restoreImageUrls(nextPages);
    const nextSettings = {
      ...DEFAULT_SETTINGS,
      ...project.settings,
    };

    set({
      pages: restoredPages,
      settings: nextSettings,
      currentPageIndex: clampPageIndex(project.currentPageIndex, restoredPages.length),
    });

    await deleteUnusedImages(collectImageIdsFromPages(restoredPages));

    if (pagesContainImportedLayout(restoredPages)) {
      await get().loadImportedLayouts();
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
});
