import { useRef, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useProjectStore } from '@/store/useProjectStore';
import { A4Page } from '@/components/A4Page';
import { PageSpreadView } from '@/components/PageSpreadView';
import { FloatingToolbar } from '@/components/FloatingToolbar';
import { usePageScale } from '@/hooks/usePageScale';
import { getExportGroups, getVisibleSpread, isTwoPageSpread } from '@/utils/layout';
import type { AppText } from '@/i18n';
import type { TextTarget, TextStyle } from '@/types';

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const A4_VIEWPORT_PADDING = 32;

interface WorkspaceProps {
  text: AppText;
  isExporting: boolean;
  exportProgress: { current: number; total: number; label: string } | null;
  onNotice: (message: string, persistent?: boolean) => void;
  hiddenPagesRef: React.RefObject<HTMLDivElement | null>;
  setSelectedTextTarget: (target: TextTarget | null) => void;
  selectedTextStyle: { target: TextTarget; style: Required<TextStyle> } | null;
  updateSelectedTextStyle: (updates: TextStyle) => void;
  removeSelectedText: () => void;
  clearTextTarget: () => void;
  selectedTextRect: DOMRect | null;
  setSelectedTextRect: (rect: DOMRect | null) => void;
}

export function Workspace({
  text,
  isExporting,
  exportProgress,
  onNotice,
  hiddenPagesRef,
  setSelectedTextTarget,
  selectedTextStyle,
  updateSelectedTextStyle,
  removeSelectedText,
  clearTextTarget,
  selectedTextRect,
  setSelectedTextRect,
}: WorkspaceProps) {
  const {
    isLoaded,
    pages,
    settings,
    currentPageIndex,
    setCurrentPageIndex,
    updatePhoto,
    selectedPhoto,
    setSelectedPhoto,
  } = useProjectStore(
    useShallow((state) => ({
      isLoaded: state.isLoaded,
      pages: state.pages,
      settings: state.settings,
      currentPageIndex: state.currentPageIndex,
      setCurrentPageIndex: state.setCurrentPageIndex,
      updatePhoto: state.updatePhoto,
      selectedPhoto: state.selectedPhoto,
      setSelectedPhoto: state.setSelectedPhoto,
    })),
  );

  const [localSelectedPhotoRect, setLocalSelectedPhotoRect] = useState<DOMRect | null>(null);
  const pageViewportRef = useRef<HTMLDivElement>(null);

  const visibleSpread = useMemo(
    () => getVisibleSpread(pages, currentPageIndex),
    [pages, currentPageIndex],
  );
  
  const displayWidth = visibleSpread.pages.length > 1 ? A4_WIDTH * 2 : A4_WIDTH;

  const scale = usePageScale({
    mainRef: pageViewportRef,
    isLoaded,
    pageWidth: displayWidth,
    pageHeight: A4_HEIGHT,
    padding: A4_VIEWPORT_PADDING,
  });

  const selectedPhotoData = useMemo(() => {
    if (!selectedPhoto) return null;
    const page = pages.find((p) => p.id === selectedPhoto.pageId);
    return page?.photos[selectedPhoto.photoIndex] || null;
  }, [pages, selectedPhoto]);

  const handlePhotoSelect = (pageId: string, photoIndex: number, rect: DOMRect) => {
    if (photoIndex === -1) {
      setSelectedTextRect(rect);
    } else {
      setSelectedPhoto({ pageId, photoIndex });
      setLocalSelectedPhotoRect(rect);
      clearTextTarget();
    }
  };

  const exportGroups = useMemo(() => getExportGroups(pages), [pages]);

  return (
    <>
      <div
        ref={pageViewportRef}
        className="relative flex min-h-0 w-full flex-1 items-center justify-center px-12 py-4 md:px-16"
        onPointerDown={(event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          if (target.closest('[data-text-settings-panel], [data-floating-toolbar]')) return;

          if (!target.closest('input, textarea')) {
            clearTextTarget();
          }
          if (!target.closest('[data-photo-index]')) {
            setSelectedPhoto(null);
            setLocalSelectedPhotoRect(null);
          }
        }}
      >
        <div
          className="relative"
          style={{
            width: `${displayWidth * scale}px`,
            height: `${A4_HEIGHT * scale}px`,
          }}
        >
          <div
            className="transform origin-top-left transition-transform"
            style={{
              width: `${displayWidth}px`,
              height: `${A4_HEIGHT}px`,
              transform: `scale(${scale})`,
            }}
          >
            <PageSpreadView
              pages={visibleSpread.pages}
              pageIndexes={visibleSpread.pageIndexes}
              currentPageIndex={currentPageIndex}
              settings={settings}
              text={text}
              onError={onNotice}
              onPageSelect={setCurrentPageIndex}
              onTextSelect={setSelectedTextTarget}
              onTextBlur={() => {}}
              onPhotoSelect={handlePhotoSelect}
            />
          </div>
        </div>

        {selectedTextStyle && selectedTextRect && (
          <FloatingToolbar
            type="text"
            rect={selectedTextRect}
            style={selectedTextStyle.style}
            onStyleChange={updateSelectedTextStyle}
            onTextRemove={removeSelectedText}
            text={text}
            onClose={clearTextTarget}
          />
        )}

        {selectedPhoto && selectedPhotoData && localSelectedPhotoRect && (
          <FloatingToolbar
            type="photo"
            rect={localSelectedPhotoRect}
            photo={selectedPhotoData}
            onPhotoChange={(updates) => {
              updatePhoto(selectedPhoto.pageId, selectedPhoto.photoIndex, updates);
            }}
            text={text}
            onClose={() => {
              setSelectedPhoto(null);
              setLocalSelectedPhotoRect(null);
            }}
          />
        )}
      </div>

      {isExporting && (
        <>
          <div
            ref={hiddenPagesRef}
            style={{ position: 'absolute', top: '-20000px', left: '-20000px' }}
          >
            {exportGroups.map((group) => (
              <div
                key={`export-${group.id}`}
                style={{
                  width: `${group.pages.length > 1 && isTwoPageSpread(group.pages) ? A4_WIDTH * 2 : A4_WIDTH}px`,
                  height: `${A4_HEIGHT}px`,
                  marginBottom: '20px',
                }}
              >
                {group.pages.length > 1 && isTwoPageSpread(group.pages) ? (
                  <PageSpreadView
                    pages={group.pages}
                    pageIndexes={group.pageIndexes}
                    settings={settings}
                    text={text}
                    showPageLabel={false}
                    showPrintWarrantyGuide={false}
                  />
                ) : (
                  <A4Page
                    page={group.pages[0]}
                    pageIndex={group.pageIndexes[0]}
                    settings={settings}
                    text={text}
                    showPageLabel={false}
                    showPrintWarrantyGuide={false}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
            <Loader2 className="w-16 h-16 animate-spin mb-4 text-blue-400" />
            <h2 className="text-2xl font-bold mb-2">{text.exportOverlayTitle}</h2>
            <p className="text-gray-300">{text.exportOverlayDescription}</p>
            {exportProgress && (
              <p className="mt-3 text-sm font-semibold text-blue-100">
                {text.exportOverlayProgress(
                  exportProgress.current,
                  exportProgress.total,
                  exportProgress.label,
                )}
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}
