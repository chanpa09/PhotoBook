import type { StateCreator } from 'zustand';
import type { StampInstance } from '@/store/types';
import { A4_PAGE_HEIGHT, A4_PAGE_WIDTH, DEFAULT_STAMP_SIZE } from '@/utils/stamps';
import type { StampSlice, ProjectState } from '@/store/types';

export const createStampSlice: StateCreator<ProjectState, [], [], StampSlice> = (set, get) => ({
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

  addStampInstance: (pageId, stamp, position) => {
    const nextPages = get().pages.map((page) => {
      if (page.id !== pageId) return page;

      const stamps = page.stamps ?? [];
      const nextZIndex = Math.max(0, ...stamps.map((item) => item.zIndex)) + 1;
      const nextStamp: StampInstance = {
        ...stamp,
        instanceId: crypto.randomUUID(),
        x: position?.x ?? stamp.x + 20,
        y: position?.y ?? stamp.y + 20,
        zIndex: nextZIndex,
      };

      return {
        ...page,
        stamps: [...stamps, nextStamp],
      };
    });

    set({ pages: nextPages });
  },

  duplicateStamp: (pageId, instanceId, position) => {
    const page = get().pages.find((item) => item.id === pageId);
    const sourceStamp = page?.stamps?.find((stamp) => stamp.instanceId === instanceId);
    if (!sourceStamp) return;

    get().addStampInstance(pageId, sourceStamp, position);
  },

  bringStampToFront: (pageId, instanceId) => {
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

  bringStampForward: (pageId, instanceId) => {
    const nextPages = get().pages.map((page) => {
      if (page.id !== pageId) return page;

      const stamps = page.stamps ?? [];
      const currentStamp = stamps.find((stamp) => stamp.instanceId === instanceId);
      if (!currentStamp) return page;

      const higherStamps = stamps.filter((stamp) => stamp.zIndex > currentStamp.zIndex);
      if (higherStamps.length === 0) return page;

      const nextStamp = higherStamps.reduce((prev, curr) => (prev.zIndex < curr.zIndex ? prev : curr));

      return {
        ...page,
        stamps: stamps.map((stamp) => {
          if (stamp.instanceId === currentStamp.instanceId) return { ...stamp, zIndex: nextStamp.zIndex };
          if (stamp.instanceId === nextStamp.instanceId) return { ...stamp, zIndex: currentStamp.zIndex };
          return stamp;
        }),
      };
    });

    set({ pages: nextPages });
  },

  sendStampBackward: (pageId, instanceId) => {
    const nextPages = get().pages.map((page) => {
      if (page.id !== pageId) return page;

      const stamps = page.stamps ?? [];
      const currentStamp = stamps.find((stamp) => stamp.instanceId === instanceId);
      if (!currentStamp) return page;

      const lowerStamps = stamps.filter((stamp) => stamp.zIndex < currentStamp.zIndex);
      if (lowerStamps.length === 0) return page;

      const prevStamp = lowerStamps.reduce((prev, curr) => (prev.zIndex > curr.zIndex ? prev : curr));

      return {
        ...page,
        stamps: stamps.map((stamp) => {
          if (stamp.instanceId === currentStamp.instanceId) return { ...stamp, zIndex: prevStamp.zIndex };
          if (stamp.instanceId === prevStamp.instanceId) return { ...stamp, zIndex: currentStamp.zIndex };
          return stamp;
        }),
      };
    });

    set({ pages: nextPages });
  },

  sendStampToBack: (pageId, instanceId) => {
    const nextPages = get().pages.map((page) => {
      if (page.id !== pageId) return page;

      const stamps = page.stamps ?? [];
      const currentStamp = stamps.find((stamp) => stamp.instanceId === instanceId);
      if (!currentStamp) return page;

      const prevZIndex = Math.min(0, ...stamps.map((stamp) => stamp.zIndex)) - 1;
      if (currentStamp.zIndex === prevZIndex + 1) return page;

      return {
        ...page,
        stamps: stamps.map((stamp) => (
          stamp.instanceId === instanceId ? { ...stamp, zIndex: prevZIndex } : stamp
        )),
      };
    });

    set({ pages: nextPages });
  },
});
