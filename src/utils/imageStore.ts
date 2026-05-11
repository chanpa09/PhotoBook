import localforage from 'localforage';

const imageStore = localforage.createInstance({
  name: 'photobook',
  storeName: 'images',
});

// In-memory cache of object URLs to avoid re-creating them
const objectUrlCache = new Map<string, string>();

export async function saveImage(id: string, blob: Blob): Promise<void> {
  const cached = objectUrlCache.get(id);
  if (cached) {
    URL.revokeObjectURL(cached);
    objectUrlCache.delete(id);
  }
  await imageStore.setItem(id, blob);
}

export async function loadImageUrl(id: string): Promise<string | null> {
  const cached = objectUrlCache.get(id);
  if (cached) return cached;

  const blob = await imageStore.getItem<Blob>(id);
  if (!blob) return null;

  const url = URL.createObjectURL(blob);
  objectUrlCache.set(id, url);
  return url;
}

export async function loadImageBlob(id: string): Promise<Blob | null> {
  return imageStore.getItem<Blob>(id);
}

export async function deleteImage(id: string): Promise<void> {
  const cached = objectUrlCache.get(id);
  if (cached) {
    URL.revokeObjectURL(cached);
    objectUrlCache.delete(id);
  }
  await imageStore.removeItem(id);
}

export async function deleteUnusedImages(activeImageIds: Set<string>): Promise<void> {
  const imageIdsToDelete: string[] = [];

  await imageStore.iterate((_value, key) => {
    if (!activeImageIds.has(key)) {
      imageIdsToDelete.push(key);
    }
  });

  await Promise.all(imageIdsToDelete.map((id) => deleteImage(id)));
}

export function createObjectUrlFromBlob(blob: Blob, id: string): string {
  const existing = objectUrlCache.get(id);
  if (existing) {
    URL.revokeObjectURL(existing);
  }
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(id, url);
  return url;
}

/**
 * Restore object URLs for all photos in pages after rehydration.
 * Returns updated pages with `url` fields populated from stored blobs.
 */
export async function restoreImageUrls<T extends { photos: Array<{ imageId?: string; url: string } | null> }>(
  pages: T[],
): Promise<T[]> {
  const results = await Promise.all(
    pages.map(async (page) => {
      const restoredPhotos = await Promise.all(
        page.photos.map(async (photo) => {
          if (!photo || !photo.imageId) return photo;

          const url = await loadImageUrl(photo.imageId);
          if (!url) return photo;

          return { ...photo, url };
        }),
      );
      return { ...page, photos: restoredPhotos };
    }),
  );
  return results;
}
