import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import { toJpeg, toPng } from 'html-to-image';
import { loadOriginalImageBlob } from '@/utils/imageStore';
import type { ExportMessages } from '@/i18n';
import type { PageData, ProjectSettings } from '@/types';
import { getExportGroups, isTwoPageSpread } from '@/utils/layout';
import {
  getExportWorkerSuccessType,
  type ExportWorkerRequest,
  type ExportWorkerResponse,
  type ExportWorkerSuccessPayload,
} from '@/workers/exportProtocol';

type ExportFormat = 'png' | 'jpeg';
const IMAGE_LOAD_TIMEOUT_MS = 15000;
const EXPORT_WORKER_TIMEOUT_MS = 30000;

export interface ExportProgress {
  current: number;
  total: number;
  label: string;
}

export const createInitialExportProgress = (total: number): ExportProgress => ({
  current: 0,
  total,
  label: '',
});

export const createExportProgress = (current: number, total: number, label: string): ExportProgress => ({
  current,
  total,
  label,
});

interface UseExportPagesParams {
  hiddenPagesRef: RefObject<HTMLDivElement | null>;
  pages: PageData[];
  settings: ProjectSettings;
  onError: (message: string) => void;
  messages: ExportMessages;
}

interface ExportRenderedPagesParams {
  hiddenPages: HTMLDivElement;
  pages: PageData[];
  settings: ProjectSettings;
  format: ExportFormat;
  messages: ExportMessages;
  onProgress: (progress: ExportProgress) => void;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const waitForFonts = async () => {
  if ('fonts' in document && document.fonts) {
    await document.fonts.ready;
  }
};

const waitForImages = async (element: HTMLElement) => {
  const images = Array.from(element.querySelectorAll('img'));

  await Promise.all(images.map((image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    if (image.complete) {
      return Promise.reject(new Error(`Image failed to load: ${image.currentSrc || image.src}`));
    }

    return new Promise<void>((resolve, reject) => {
      const timeoutId = globalThis.setTimeout(() => {
        cleanup();
        reject(new Error(`Image load timed out: ${image.currentSrc || image.src}`));
      }, IMAGE_LOAD_TIMEOUT_MS);
      const handleLoad = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error(`Image failed to load: ${image.currentSrc || image.src}`));
      };
      const cleanup = () => {
        globalThis.clearTimeout(timeoutId);
        image.removeEventListener('load', handleLoad);
        image.removeEventListener('error', handleError);
      };

      image.addEventListener('load', handleLoad, { once: true });
      image.addEventListener('error', handleError, { once: true });
    });
  }));
};

const swapToHighResImages = (element: HTMLElement, pages: PageData[]) => {
  const hasOriginalImages = pages.some((page) =>
    page.photos.some((photo) => Boolean(photo?.originalImageId)),
  );
  if (!hasOriginalImages) return undefined;

  const images = Array.from(element.querySelectorAll('img[data-photo-index]'));
  const urlsToRevoke: string[] = [];
  const originalSources: Array<{ image: HTMLImageElement; src: string }> = [];

  return Promise.all(images.map(async (img) => {
    const htmlImg = img as HTMLImageElement;
    if (typeof htmlImg.getAttribute !== 'function') return;

    const pageId = htmlImg.getAttribute('data-page-id');
    const photoIndex = Number.parseInt(htmlImg.getAttribute('data-photo-index') || '-1', 10);

    if (pageId && photoIndex >= 0) {
      const page = pages.find(p => p.id === pageId);
      const photo = page?.photos[photoIndex];

      if (photo?.originalImageId) {
        const blob = await loadOriginalImageBlob(photo.originalImageId);
        if (blob) {
          const highResUrl = URL.createObjectURL(blob);
          originalSources.push({ image: htmlImg, src: htmlImg.src });
          htmlImg.src = highResUrl;
          urlsToRevoke.push(highResUrl);
        }
      }
    }
  })).then(() => () => {
    originalSources.forEach(({ image, src }) => {
      image.src = src;
    });
    urlsToRevoke.forEach(url => URL.revokeObjectURL(url));
  });
};

async function runExportWorker<TType extends ExportWorkerRequest['type']>(
  worker: Worker,
  type: TType,
  payload?: Extract<ExportWorkerRequest, { type: TType }>['payload'],
): Promise<ExportWorkerSuccessPayload[TType]> {
  return new Promise((resolve, reject) => {
    const successType = getExportWorkerSuccessType(type);
    const timeoutId = globalThis.setTimeout(() => {
      cleanup();
      reject(new Error(`Export worker timed out: ${type}`));
    }, EXPORT_WORKER_TIMEOUT_MS);
    const cleanup = () => {
      globalThis.clearTimeout(timeoutId);
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      worker.removeEventListener('messageerror', handleMessageError);
    };
    const handleMessage = (event: MessageEvent) => {
      const { type: responseType, payload: responsePayload } = event.data as ExportWorkerResponse;
      if (responseType === successType) {
        cleanup();
        resolve(responsePayload as ExportWorkerSuccessPayload[TType]);
      } else if (responseType === 'ERROR') {
        cleanup();
        reject(new Error(responsePayload.message));
      }
    };
    const handleError = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(event.message || `Export worker failed: ${type}`));
    };
    const handleMessageError = () => {
      cleanup();
      reject(new Error(`Export worker message failed: ${type}`));
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.addEventListener('messageerror', handleMessageError);
    worker.postMessage({ type, payload });
  });
}

export async function exportRenderedPages({
  hiddenPages,
  pages,
  settings,
  format,
  messages,
  onProgress,
}: ExportRenderedPagesParams) {
  const pageElements = hiddenPages.children;
  const exportGroups = getExportGroups(pages);
  if (pageElements.length === 0) {
    throw new Error(messages.noPages);
  }
  if (pageElements.length !== exportGroups.length) {
    throw new Error(messages.pageCountMismatch(pageElements.length, exportGroups.length));
  }

  onProgress(createInitialExportProgress(exportGroups.length));
  const isZipMode = settings.exportMode === 'zip';
  
  let worker: Worker | null = null;
  try {
    if (isZipMode) {
      worker = new Worker(new URL('@/workers/export.worker.ts', import.meta.url), { type: 'module' });
      await runExportWorker(worker, 'INIT');
    }

    for (let groupIndex = 0; groupIndex < exportGroups.length; groupIndex += 1) {
      const group = exportGroups[groupIndex];
      const element = pageElements[groupIndex] as HTMLElement | undefined;
      const label = isTwoPageSpread(group.pages)
        ? `${group.pageIndexes[0] + 1}-${group.pageIndexes[group.pageIndexes.length - 1] + 1}`
        : `${group.pageIndexes[0] + 1}`;
      if (!element) {
        throw new Error(messages.pageElementMissing(groupIndex + 1, format.toUpperCase()));
      }

      onProgress(createExportProgress(groupIndex + 1, exportGroups.length, label));

      let revokeHighRes: (() => void) | undefined;
      const options = {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: settings.backgroundColor,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      };

      let dataUrl: string;
      try {
        const highResSwap = swapToHighResImages(element, pages);
        revokeHighRes = highResSwap ? await highResSwap : undefined;
        await waitForFonts();
        await waitForImages(element);
        dataUrl = format === 'png'
          ? await toPng(element, options)
          : await toJpeg(element, options);
      } catch (error) {
        throw new Error(messages.pageSaveFailed(groupIndex + 1, format.toUpperCase(), getErrorMessage(error)), {
          cause: error,
        });
      } finally {
        revokeHighRes?.();
      }

      const filename = `photobook-page-${label}.${format}`;

      if (isZipMode && worker) {
        const base64Data = dataUrl.split(',')[1];
        await runExportWorker(worker, 'ADD_FILE', { filename, base64Data });
      } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (isZipMode && worker) {
      const zipFilename = `photobook-export.${format}.zip`;
      const { blob } = await runExportWorker(worker, 'GENERATE_ZIP', { filename: zipFilename });
      const link = document.createElement('a');
      link.download = zipFilename;
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  } finally {
    if (worker) {
      worker.terminate();
    }
  }
}

export function useExportPages({ hiddenPagesRef, pages, settings, onError, messages }: UseExportPagesParams) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const isExportingRef = useRef(false);

  const exportAll = async (format: ExportFormat) => {
    if (isExportingRef.current) {
      return;
    }

    isExportingRef.current = true;
    setIsExporting(true);

    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      if (!hiddenPagesRef.current) {
        onError(messages.hiddenContainerMissing);
        return;
      }

      await exportRenderedPages({
        hiddenPages: hiddenPagesRef.current,
        pages,
        settings,
        format,
        messages,
        onProgress: setExportProgress,
      });
    } catch (error) {
      console.error('Export failed:', error);
      onError(messages.exportFailed(getErrorMessage(error)));
    } finally {
      isExportingRef.current = false;
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  return {
    isExporting,
    exportProgress,
    exportAll,
  };
}
