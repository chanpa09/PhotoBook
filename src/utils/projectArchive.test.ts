import JSZip from 'jszip';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PageData, ProjectSettings } from '../types';
import {
  createProjectArchive,
  readProjectArchive,
  readProjectArchiveSummary,
} from './projectArchive';

const storedImages = vi.hoisted(() => new Map<string, Blob>());

vi.mock('./imageStore', () => ({
  loadImageBlob: vi.fn((id: string) => Promise.resolve(storedImages.get(id) ?? null)),
}));

const settings: ProjectSettings = {
  backgroundColor: '#ffffff',
  uiLanguage: 'ko',
};

const createArchiveFile = async (blob: Blob) =>
  new File([blob], 'sample.photobook', { type: 'application/zip' });

describe('projectArchive', () => {
  beforeEach(() => {
    storedImages.clear();
  });

  it('saves and reads project pages, settings, and stored images', async () => {
    storedImages.set('image-1', new Blob(['image-data'], { type: 'image/png' }));
    const pages: PageData[] = [{
      id: 'page-1',
      layout: '1',
      photos: [{
        id: 'photo-1',
        imageId: 'image-1',
        url: 'blob:http://localhost/image-1',
        caption: 'caption',
      }],
      stamps: [],
    }];

    const archive = await createProjectArchive({ pages, settings, currentPageIndex: 0 });
    const file = await createArchiveFile(archive);
    const summary = await readProjectArchiveSummary(file);
    const imported = await readProjectArchive(file);

    expect(summary.pageCount).toBe(1);
    expect(summary.imageCount).toBe(1);
    expect(summary.exportedAt).toEqual(expect.any(String));
    expect(imported.settings.backgroundColor).toBe('#ffffff');
    expect(imported.currentPageIndex).toBe(0);
    expect(imported.pages[0].photos[0]?.url).toBe('');
    expect(imported.images).toHaveLength(1);
    expect(imported.images[0].id).toBe('image-1');
    await expect(imported.images[0].blob.text()).resolves.toBe('image-data');
  });

  it('keeps legacy data-url photos by assigning archive image ids', async () => {
    const pages: PageData[] = [{
      id: 'page-1',
      layout: '1',
      photos: [{
        id: 'photo-1',
        url: 'data:text/plain;base64,aGVsbG8=',
        caption: 'legacy',
      }],
      stamps: [],
    }];

    const archive = await createProjectArchive({ pages, settings, currentPageIndex: 0 });
    const imported = await readProjectArchive(await createArchiveFile(archive));
    const photo = imported.pages[0].photos[0];

    expect(photo?.url).toBe('');
    expect(photo?.imageId).toMatch(/^archive-/);
    expect(imported.images).toHaveLength(1);
    expect(imported.images[0].id).toBe(photo?.imageId);
    await expect(imported.images[0].blob.text()).resolves.toBe('hello');
  });

  it('rejects archives with invalid project metadata', async () => {
    const zip = new JSZip();
    zip.file('project.json', JSON.stringify({ schemaVersion: 999 }));
    const file = await createArchiveFile(await zip.generateAsync({ type: 'blob' }));

    await expect(readProjectArchive(file)).rejects.toThrow('Project metadata is invalid.');
  });

  it('rejects archives without project metadata', async () => {
    const zip = new JSZip();
    zip.file('notes.txt', 'not a project');
    const file = await createArchiveFile(await zip.generateAsync({ type: 'blob' }));

    await expect(readProjectArchiveSummary(file)).rejects.toThrow('Project metadata is missing.');
  });

  it('rejects project metadata with image paths outside the exact image entry', async () => {
    const zip = new JSZip();
    zip.file('project.json', JSON.stringify({
      schemaVersion: 1,
      exportedAt: '2026-05-04T00:00:00.000Z',
      pages: [{ id: 'page-1', layout: '1', photos: [], stamps: [] }],
      settings,
      currentPageIndex: 0,
      images: [{ id: 'image-1', path: '../image-1', type: 'image/png', size: 1 }],
    }));
    const file = await createArchiveFile(await zip.generateAsync({ type: 'blob' }));

    await expect(readProjectArchive(file)).rejects.toThrow('Project metadata is invalid.');
  });

  it('rejects project metadata with unsafe image ids', async () => {
    const zip = new JSZip();
    zip.file('project.json', JSON.stringify({
      schemaVersion: 1,
      exportedAt: '2026-05-04T00:00:00.000Z',
      pages: [{ id: 'page-1', layout: '1', photos: [], stamps: [] }],
      settings,
      currentPageIndex: 0,
      images: [{ id: '../image-1', path: 'images/../image-1', type: 'image/png', size: 1 }],
    }));
    const file = await createArchiveFile(await zip.generateAsync({ type: 'blob' }));

    await expect(readProjectArchive(file)).rejects.toThrow('Project metadata is invalid.');
  });

  it('rejects project metadata when a page references an image missing from the manifest', async () => {
    const zip = new JSZip();
    zip.file('project.json', JSON.stringify({
      schemaVersion: 1,
      exportedAt: '2026-05-04T00:00:00.000Z',
      pages: [{
        id: 'page-1',
        layout: '1',
        photos: [{
          id: 'photo-1',
          imageId: 'missing-image',
          url: '',
          caption: '',
        }],
        stamps: [],
      }],
      settings,
      currentPageIndex: 0,
      images: [],
    }));
    const file = await createArchiveFile(await zip.generateAsync({ type: 'blob' }));

    await expect(readProjectArchive(file)).rejects.toThrow('Project image reference is missing: missing-image');
  });

  it('rejects archives when stored image data is missing during save', async () => {
    const pages: PageData[] = [{
      id: 'page-1',
      layout: '1',
      photos: [{
        id: 'photo-1',
        imageId: 'missing-image',
        url: '',
        caption: '',
      }],
      stamps: [],
    }];

    await expect(createProjectArchive({ pages, settings, currentPageIndex: 0 }))
      .rejects.toThrow('Image data is missing: missing-image');
  });

  it('rejects archives when a referenced image file is missing', async () => {
    const zip = new JSZip();
    zip.file('project.json', JSON.stringify({
      schemaVersion: 1,
      exportedAt: '2026-05-04T00:00:00.000Z',
      pages: [{ id: 'page-1', layout: '1', photos: [], stamps: [] }],
      settings,
      currentPageIndex: 0,
      images: [{ id: 'image-1', path: 'images/image-1', type: 'image/png', size: 1 }],
    }));
    const file = await createArchiveFile(await zip.generateAsync({ type: 'blob' }));

    await expect(readProjectArchive(file)).rejects.toThrow('Image file is missing: image-1');
  });
});
