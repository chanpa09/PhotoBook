import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageData } from '@/types';
import {
  collectActiveImageIds,
  collectImageIdsFromPages,
  deleteUnusedImages,
  saveImage,
} from './imageStore';

const storedImages = vi.hoisted(() => new Map<string, Blob>());

vi.mock('localforage', () => ({
  default: {
    createInstance: vi.fn(() => ({
      setItem: vi.fn((key: string, value: Blob) => {
        storedImages.set(key, value);
        return Promise.resolve(value);
      }),
      getItem: vi.fn((key: string) => Promise.resolve(storedImages.get(key) ?? null)),
      removeItem: vi.fn((key: string) => {
        storedImages.delete(key);
        return Promise.resolve();
      }),
      iterate: vi.fn(async (iterator: (_value: Blob, key: string) => void) => {
        storedImages.forEach((value, key) => iterator(value, key));
      }),
    })),
  },
}));

beforeEach(() => {
  storedImages.clear();
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:image'),
    revokeObjectURL: vi.fn(),
  });
});

const createPage = (id: string, imageIds: string[]): PageData => ({
  id,
  layout: '1',
  photos: imageIds.map((imageId) => ({
    id: `photo-${imageId}`,
    imageId,
    url: '',
    caption: '',
  })),
  stamps: [],
});

describe('imageStore', () => {
  it('collects unique image ids from page photos', () => {
    expect(collectImageIdsFromPages([
      createPage('page-1', ['image-1', 'image-2']),
      createPage('page-2', ['image-2']),
    ])).toEqual(new Set(['image-1', 'image-2']));
  });

  it('deletes only images that are not in the active image set', async () => {
    await saveImage('current-image', new Blob(['current']));
    await saveImage('history-image', new Blob(['history']));
    await saveImage('unused-image', new Blob(['unused']));

    const activeImageIds = new Set<string>();
    [
      createPage('current', ['current-image']),
      createPage('history', ['history-image']),
    ].forEach((page) => {
      collectImageIdsFromPages([page]).forEach((imageId) => activeImageIds.add(imageId));
    });

    await expect(deleteUnusedImages(activeImageIds)).resolves.toBe(1);
    expect([...storedImages.keys()].sort()).toEqual(['current-image', 'history-image']);
  });

  it('collects image ids from current pages and undo/redo history states', () => {
    expect(collectActiveImageIds(
      [createPage('current', ['current-image'])],
      [
        { pages: [createPage('past', ['past-image'])] },
        { pages: [createPage('future', ['future-image'])] },
        {},
      ],
    )).toEqual(new Set(['current-image', 'past-image', 'future-image']));
  });
});
