import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import localforage from 'localforage';
import {
  clampPageIndex,
  normalizePages,
  pagesContainImportedLayout,
  stripPhotoUrls,
} from './storeUtils';
import { restoreImageUrls } from '@/utils/imageStore';
import type { ProjectState } from '@/store/types';
import { createPageSlice } from '@/store/slices/createPageSlice';
import { createPhotoSlice } from '@/store/slices/createPhotoSlice';
import { createStampSlice } from '@/store/slices/createStampSlice';
import { createProjectSlice } from '@/store/slices/createProjectSlice';
import { ProjectStoreSchema, type ValidatedProjectStore } from '@/store/schemas/projectSchema';
import type { PageData } from '@/types';

export const useProjectStore = create<ProjectState>()(
  temporal(
    persist(
      (...a) => ({
        ...createPageSlice(...a),
        ...createPhotoSlice(...a),
        ...createStampSlice(...a),
        ...createProjectSlice(...a),
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
              state.loadLegacyData();
              return;
            }
            // If no rehydrated state (first time), load legacy or set loaded
            if (!rehydratedState || !rehydratedState.pages || rehydratedState.pages.length === 0) {
              state.loadLegacyData();
              return;
            }

            try {
              // Runtime validation of rehydrated state using Zod
              const validated = ProjectStoreSchema.parse(rehydratedState) as ValidatedProjectStore;

              const nextPages = normalizePages(validated.pages as PageData[]);
              // Restore image URLs from Blob storage
              const restoredPages = await restoreImageUrls(nextPages);
              rehydratedState.setPages(restoredPages);
              rehydratedState.setCurrentPageIndex(
                clampPageIndex(validated.currentPageIndex, restoredPages.length)
              );
              if (pagesContainImportedLayout(restoredPages)) {
                await rehydratedState.loadImportedLayouts();
              }
              rehydratedState.setIsLoaded(true);
            } catch (validationError) {
              console.error('Project data validation failed. Storage might be corrupted.', validationError);
              // Fallback: set as loaded but with empty/default state to prevent white screen
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
