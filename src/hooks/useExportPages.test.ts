import { afterEach, describe, expect, it, vi } from 'vitest';
import { toPng } from 'html-to-image';
import type { ExportMessages } from '@/i18n';
import type { PageData, ProjectSettings } from '@/types';
import type { ExportWorkerRequest } from '@/workers/exportProtocol';
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

const individualSettings: ProjectSettings = {
  ...settings,
  exportMode: 'individual',
};

const createPage = (id: string, layout: PageData['layout'] = '1'): PageData => ({
  id,
  layout,
  photos: [],
  stamps: [],
});

const createExportElement = (images: HTMLImageElement[] = []) => ({
  querySelectorAll: vi.fn(() => images),
});

const createHiddenPages = (count: number) => ({
  children: Array.from({ length: count }, () => createExportElement()),
}) as unknown as HTMLDivElement;

class FakeWorker {
  protected messageHandler: ((event: MessageEvent) => void) | null = null;
  protected errorHandler: ((event: ErrorEvent) => void) | null = null;
  protected messageErrorHandler: ((event: MessageEvent) => void) | null = null;

  addEventListener(event: string, handler: EventListener) {
    if (event === 'message') {
      this.messageHandler = handler as (event: MessageEvent) => void;
    } else if (event === 'error') {
      this.errorHandler = handler as (event: ErrorEvent) => void;
    } else if (event === 'messageerror') {
      this.messageErrorHandler = handler as (event: MessageEvent) => void;
    }
  }

  removeEventListener(event: string, handler: EventListener) {
    if (event === 'message' && this.messageHandler === handler) {
      this.messageHandler = null;
    } else if (event === 'error' && this.errorHandler === handler) {
      this.errorHandler = null;
    } else if (event === 'messageerror' && this.messageErrorHandler === handler) {
      this.messageErrorHandler = null;
    }
  }

  protected emit(data: unknown) {
    queueMicrotask(() => {
      this.messageHandler?.({ data } as MessageEvent);
    });
  }

  protected emitError(message: string) {
    queueMicrotask(() => {
      this.errorHandler?.({ message } as ErrorEvent);
    });
  }

  postMessage(message: ExportWorkerRequest) {
    const payload = message.type === 'GENERATE_ZIP'
      ? { blob: new Blob(['zip']), filename: message.payload?.filename ?? 'export.zip' }
      : message.payload;
    const responseType = message.type === 'GENERATE_ZIP'
      ? 'GENERATE_ZIP_SUCCESS'
      : `${message.type}_SUCCESS`;

    this.emit({ type: responseType, payload });
  }

  terminate() {}
}

class InitErrorWorker extends FakeWorker {
  static terminatedCount = 0;

  postMessage(message: ExportWorkerRequest) {
    if (message.type === 'INIT') {
      this.emit({ type: 'ERROR', payload: { message: 'init failed' } });
      return;
    }

    super.postMessage(message);
  }

  terminate() {
    InitErrorWorker.terminatedCount += 1;
  }
}

class WorkerRuntimeError extends FakeWorker {
  postMessage(message: ExportWorkerRequest) {
    if (message.type === 'INIT') {
      this.emitError('worker script failed');
      return;
    }

    super.postMessage(message);
  }
}

class SilentWorker extends FakeWorker {
  terminate() {}

  postMessage() {}
}

class ErrorOnAddFileWorker extends FakeWorker {
  postMessage(message: ExportWorkerRequest) {
    if (message.type === 'ADD_FILE') {
      this.emit({ type: 'ERROR', payload: { message: 'zip add failed' } });
      return;
    }

    super.postMessage(message);
  }
}

class WrongSuccessBeforeAddFileWorker extends FakeWorker {
  postMessage(message: ExportWorkerRequest) {
    if (message.type === 'ADD_FILE') {
      this.emit({ type: 'GENERATE_ZIP_SUCCESS', payload: { blob: new Blob(['wrong']), filename: 'wrong.zip' } });
      this.emit({ type: 'ADD_FILE_SUCCESS', payload: { filename: message.payload.filename } });
      return;
    }

    super.postMessage(message);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
  InitErrorWorker.terminatedCount = 0;
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
    vi.stubGlobal('Worker', FakeWorker);
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
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:zip');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

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

  it('ignores worker success messages that do not match the current request', async () => {
    vi.stubGlobal('Worker', WrongSuccessBeforeAddFileWorker);
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
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:zip');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await exportRenderedPages({
      hiddenPages: createHiddenPages(1),
      pages: [createPage('cover', 'cover')],
      settings,
      format: 'png',
      messages,
      onProgress: vi.fn(),
    });

    expect(link.download).toBe('photobook-export.png.zip');
  });

  it('fails export when the zip worker reports an error', async () => {
    vi.stubGlobal('Worker', ErrorOnAddFileWorker);
    vi.stubGlobal('document', {
      createElement: vi.fn(),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    });

    await expect(exportRenderedPages({
      hiddenPages: createHiddenPages(1),
      pages: [createPage('cover', 'cover')],
      settings,
      format: 'png',
      messages,
      onProgress: vi.fn(),
    })).rejects.toThrow('zip add failed');
  });

  it('terminates the worker when initialization fails', async () => {
    vi.stubGlobal('Worker', InitErrorWorker);

    await expect(exportRenderedPages({
      hiddenPages: createHiddenPages(1),
      pages: [createPage('cover', 'cover')],
      settings,
      format: 'png',
      messages,
      onProgress: vi.fn(),
    })).rejects.toThrow('init failed');
    expect(InitErrorWorker.terminatedCount).toBe(1);
  });

  it('fails export when the worker dispatches an error event', async () => {
    vi.stubGlobal('Worker', WorkerRuntimeError);

    await expect(exportRenderedPages({
      hiddenPages: createHiddenPages(1),
      pages: [createPage('cover', 'cover')],
      settings,
      format: 'png',
      messages,
      onProgress: vi.fn(),
    })).rejects.toThrow('worker script failed');
  });

  it('fails export when the worker does not respond', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', SilentWorker);

    const exportPromise = exportRenderedPages({
      hiddenPages: createHiddenPages(1),
      pages: [createPage('cover', 'cover')],
      settings,
      format: 'png',
      messages,
      onProgress: vi.fn(),
    });
    const rejection = expect(exportPromise).rejects.toThrow('Export worker timed out: INIT');

    await vi.advanceTimersByTimeAsync(30000);
    await rejection;
  });

  it('waits for fonts and page images before capturing rendered pages', async () => {
    let resolveFonts!: () => void;
    let resolveImage!: () => void;
    const image = {
      complete: false,
      naturalWidth: 0,
      src: 'photo.png',
      currentSrc: 'photo.png',
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'load') resolveImage = handler;
      }),
      removeEventListener: vi.fn(),
    } as unknown as HTMLImageElement;
    const link = {
      download: '',
      href: '',
      click: vi.fn(),
    };
    vi.stubGlobal('document', {
      fonts: {
        ready: new Promise<void>((resolve) => {
          resolveFonts = resolve;
        }),
      },
      createElement: vi.fn(() => link),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:zip');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const exportPromise = exportRenderedPages({
      hiddenPages: {
        children: [createExportElement([image])],
      } as unknown as HTMLDivElement,
      pages: [createPage('cover', 'cover')],
      settings: individualSettings,
      format: 'png',
      messages,
      onProgress: vi.fn(),
    });

    await Promise.resolve();
    expect(toPng).not.toHaveBeenCalled();

    resolveFonts();
    await Promise.resolve();
    await Promise.resolve();
    expect(toPng).not.toHaveBeenCalled();

    resolveImage();
    await exportPromise;
    expect(toPng).toHaveBeenCalledTimes(1);
  });

  it('fails export when a rendered page image cannot load', async () => {
    let rejectImage!: () => void;
    const image = {
      complete: false,
      naturalWidth: 0,
      src: 'missing.png',
      currentSrc: 'missing.png',
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'error') rejectImage = handler;
      }),
      removeEventListener: vi.fn(),
    } as unknown as HTMLImageElement;

    vi.stubGlobal('document', {
      createElement: vi.fn(),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    });

    const exportPromise = exportRenderedPages({
      hiddenPages: {
        children: [createExportElement([image])],
      } as unknown as HTMLDivElement,
      pages: [createPage('cover', 'cover')],
      settings: individualSettings,
      format: 'png',
      messages,
      onProgress: vi.fn(),
    });

    await Promise.resolve();
    rejectImage();
    await expect(exportPromise).rejects.toThrow('failed 1 PNG Image failed to load: missing.png');
    expect(toPng).not.toHaveBeenCalled();
  });

  it('fails export when a rendered page image never finishes loading', async () => {
    vi.useFakeTimers();
    const image = {
      complete: false,
      naturalWidth: 0,
      src: 'stalled.png',
      currentSrc: 'stalled.png',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLImageElement;

    vi.stubGlobal('document', {
      createElement: vi.fn(),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    });

    const exportPromise = exportRenderedPages({
      hiddenPages: {
        children: [createExportElement([image])],
      } as unknown as HTMLDivElement,
      pages: [createPage('cover', 'cover')],
      settings: individualSettings,
      format: 'png',
      messages,
      onProgress: vi.fn(),
    });

    const rejection = expect(exportPromise).rejects.toThrow('failed 1 PNG Image load timed out: stalled.png');
    await vi.advanceTimersByTimeAsync(15000);
    await rejection;
    expect(toPng).not.toHaveBeenCalled();
  });

  it('downloads each rendered page separately in individual export mode', async () => {
    const createdLinks: Array<{ download: string; href: string; click: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal('document', {
      createElement: vi.fn(() => {
        const link = {
          download: '',
          href: '',
          click: vi.fn(),
        };
        createdLinks.push(link);
        return link;
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    });

    await exportRenderedPages({
      hiddenPages: createHiddenPages(2),
      pages: [
        createPage('cover', 'cover'),
        createPage('page-1'),
      ],
      settings: individualSettings,
      format: 'png',
      messages,
      onProgress: vi.fn(),
    });

    expect(createdLinks.map((link) => link.download)).toEqual([
      'photobook-page-1.png',
      'photobook-page-2.png',
    ]);
    expect(createdLinks).toHaveLength(2);
    expect(createdLinks[0].click).toHaveBeenCalledTimes(1);
    expect(createdLinks[1].click).toHaveBeenCalledTimes(1);
  });
});
