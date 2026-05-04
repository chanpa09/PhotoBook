import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import { toJpeg, toPng } from 'html-to-image';
import JSZip from 'jszip';
import type { ExportMessages } from '../i18n';
import type { PageData, ProjectSettings } from '../types';
import { getExportGroups, isTwoPageSpread } from '../utils/layout';

type ExportFormat = 'png' | 'jpeg';

interface UseExportPagesParams {
  hiddenPagesRef: RefObject<HTMLDivElement | null>;
  pages: PageData[];
  settings: ProjectSettings;
  onError: (message: string) => void;
  messages: ExportMessages;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export function useExportPages({ hiddenPagesRef, pages, settings, onError, messages }: UseExportPagesParams) {
  const [isExporting, setIsExporting] = useState(false);
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

      const pageElements = hiddenPagesRef.current.children;
      const exportGroups = getExportGroups(pages);
      if (pageElements.length === 0) {
        onError(messages.noPages);
        return;
      }
      if (pageElements.length !== exportGroups.length) {
        throw new Error(messages.pageCountMismatch(pageElements.length, exportGroups.length));
      }

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
    } catch (error) {
      console.error('Export failed:', error);
      onError(messages.exportFailed(getErrorMessage(error)));
    } finally {
      isExportingRef.current = false;
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    exportAll,
  };
}
