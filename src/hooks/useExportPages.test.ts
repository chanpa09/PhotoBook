import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExportMessages } from '../i18n';
import type { PageData, ProjectSettings } from '../types';
import {
  createExportProgress,
  createInitialExportProgress,
  exportRenderedPages,
  type ExportProgress,
} from './useExportPages';

vi.mock('html-to-image', () => ({
  toPng: vi.fn(() => Promise.resolve('data:image/png;base64,aGVsbG8=')),
  toJpeg: vi.fn(() => Promise.resolve('data:image/jpeg;base64,aGVsbG8=')),
}));

const messages: ExportMessages = {
  hiddenContainerMissing: 'hidden missing',
  noPages: 'no pages',
  pageCountMismatch: (screenCount, dataCount) => `mismatch ${screenCount}/${dataCount}`,
  pageElementMissing: (pageNumber, format) => `missing ${pageNumber} ${format}`,
  pageSaveFailed: (pageNumber, format, message) => `failed ${pageNumber} ${format} ${message}`,
  exportFailed: (message) => `export failed ${message}`,
};

const settings: ProjectSettings = {
  backgroundColor: '#ffffff',
  exportMode: 'zip',
};

const createPage = (id: string, layout: PageData['layout'] = '1'): PageData => ({
  id,
  layout,
  photos: [],
  stamps: [],
});

const createHiddenPages = (count: number) => ({
  children: Array.from({ length: count }, () => ({})),
}) as unknown as HTMLDivElement;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('export progress', () => {
  it('creates the initial export progress state', () => {
    expect(createInitialExportProgress(3)).toEqual({
      current: 0,
      total: 3,
      label: '',
    });
  });

  it('creates the current export progress state with the page label', () => {
    expect(createExportProgress(2, 3, '3-4')).toEqual({
      current: 2,
      total: 3,
      label: '3-4',
    });
  });

  it('reports progress from initial state through each rendered export group', async () => {
    const link = {
      download: '',
      href: '',
      click: vi.fn(),
    };
    vi.stubGlobal('document', {
      createElement: vi.fn(() => link),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:zip'),
      revokeObjectURL: vi.fn(),
    });

    const progress: ExportProgress[] = [];

    await exportRenderedPages({
      hiddenPages: createHiddenPages(2),
      pages: [
        createPage('cover', 'cover'),
        createPage('page-1'),
      ],
      settings,
      format: 'png',
      messages,
      onProgress: (nextProgress) => progress.push(nextProgress),
    });

    expect(progress).toEqual([
      { current: 0, total: 2, label: '' },
      { current: 1, total: 2, label: '1' },
      { current: 2, total: 2, label: '2' },
    ]);
    expect(link.download).toBe('photobook-export.png.zip');
  });
});
