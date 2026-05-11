import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import { toJpeg, toPng } from 'html-to-image';
import JSZip from 'jszip';
import type { ExportMessages } from '../i18n';
import type { PageData, ProjectSettings } from '../types';
import { getExportGroups, isTwoPageSpread } from '../utils/layout';

type ExportFormat = 'png' | 'jpeg';

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
  const zip = isZipMode ? new JSZip() : null;

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
      dataUrl = format === 'png'
        ? await toPng(element, options)
        : await toJpeg(element, options);
    } catch (error) {
      throw new Error(messages.pageSaveFailed(groupIndex + 1, format.toUpperCase(), getErrorMessage(error)), {
        cause: error,
      });
    }

    const filename = `photobook-page-${label}.${format}`;

    if (isZipMode && zip) {
      // dataUrl is data:image/png;base64,xxxx
      const base64Data = dataUrl.split(',')[1];
      zip.file(filename, base64Data, { base64: true });
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

  if (isZipMode && zip) {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.download = `photobook-export.${format}.zip`;
    link.href = URL.createObjectURL(zipBlob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
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
      // Wait for the hidden pages to render (they are conditionally rendered when isExporting is true)
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
