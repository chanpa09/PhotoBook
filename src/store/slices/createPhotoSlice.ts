import type { StateCreator } from 'zustand';
import type { Photo } from '@/store/types';
import { getSpreadPartnerIndex } from '@/utils/layout';
import { normalizePages } from '@/store/storeUtils';
import type { PhotoSlice, ProjectState } from '@/store/types';

export const createPhotoSlice: StateCreator<ProjectState, [], [], PhotoSlice> = (set, get) => ({
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
});
