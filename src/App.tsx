import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { ChevronLeft, ChevronRight, LayoutGrid, Loader2, Menu } from 'lucide-react';
import { A4Page } from './components/A4Page';
import { NoticeBanner } from './components/NoticeBanner';
import { OverviewModal } from './components/OverviewModal';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar, type SidebarPanel } from './components/Sidebar';
import { useExportPages } from './hooks/useExportPages';
import { usePageScale } from './hooks/usePageScale';
import { useShortcuts } from './hooks/useShortcuts';
import { TRANSLATIONS } from './i18n';
import { useProjectStore } from './store/useProjectStore';
import type { AppText } from './i18n';
import type { PageData, ProjectSettings, TextStyle } from './types';
import { getExportGroups, getPageSpreads, getSpreadStartIndex, getVisibleSpread, isTwoPageSpread } from './utils/layout';
import type { TextTarget } from './utils/textStyle';
import {
  DEFAULT_CAPTION_FONT_SIZE,
  DEFAULT_COVER_DATE_FONT_SIZE,
  DEFAULT_COVER_TITLE_FONT_SIZE,
  DEFAULT_LAYOUT_TEXT_FONT_SIZE,
  getDefaultTextStyle,
} from './utils/textStyle';

interface Notice {
  id: number;
  message: string;
  persistent: boolean;
}

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const A4_VIEWPORT_PADDING = 32;

function PageSpreadView({
  pages,
  pageIndexes,
  currentPageIndex,
  settings,
  text,
  onError,
  onPageSelect,
  onTextSelect,
  onTextBlur,
  showPageLabel = true,
  showPrintWarrantyGuide,
}: {
  pages: PageData[];
  pageIndexes: number[];
  currentPageIndex?: number;
  settings: ProjectSettings;
  text: AppText;
  onError?: (message: string) => void;
  onPageSelect?: (pageIndex: number) => void;
  onTextSelect?: (target: TextTarget) => void;
  onTextBlur?: (nextFocusedElement: EventTarget | null) => void;
  showPageLabel?: boolean;
  showPrintWarrantyGuide?: boolean;
}) {
  return (
    <div className="flex h-full w-full bg-gray-200">
      {pages.map((page, index) => {
        const pageIndex = pageIndexes[index];
        const isSelected = currentPageIndex === pageIndex;

        return (
          <div
            key={page.id}
            className={`relative outline outline-offset-[-2px] transition-shadow ${
              isSelected ? 'z-10 outline-2 outline-blue-500 ring-4 ring-blue-500/25' : 'outline-0'
            } ${onPageSelect ? 'cursor-pointer' : ''}`}
            onClick={() => onPageSelect?.(pageIndex)}
          >
            <A4Page
              page={page}
              pageIndex={pageIndex}
              settings={settings}
              text={text}
              onError={onError}
              onTextSelect={onTextSelect}
              onTextBlur={onTextBlur}
              showPageLabel={showPageLabel}
              showPrintWarrantyGuide={showPrintWarrantyGuide}
            />
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const {
    isLoaded,
    pages,
    settings,
    currentPageIndex,
    setCurrentPageIndex,
    updatePhoto,
    updateLayoutText,
    updatePageData,
  } = useProjectStore();

  const { undo, redo } = useStore(useProjectStore.temporal);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<SidebarPanel>('page');
  const [selectedTextTarget, setSelectedTextTarget] = useState<TextTarget | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const pageViewportRef = useRef<HTMLDivElement>(null);
  const hiddenPagesRef = useRef<HTMLDivElement>(null);
  const noticeTimeoutRef = useRef<number | null>(null);
  const uiLanguage = settings.uiLanguage ?? 'ko';
  const text = TRANSLATIONS[uiLanguage];

  const showNotice = (message: string, persistent = false) => {
    if (noticeTimeoutRef.current !== null) {
      window.clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = null;
    }

    setNotice({ id: Date.now(), message, persistent });

    if (!persistent) {
      noticeTimeoutRef.current = window.setTimeout(() => {
        setNotice(null);
        noticeTimeoutRef.current = null;
      }, 4000);
    }
  };

  const closeNotice = () => {
    if (noticeTimeoutRef.current !== null) {
      window.clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = null;
    }
    setNotice(null);
  };

  const { isExporting, exportAll } = useExportPages({
    hiddenPagesRef,
    pages,
    settings,
    onError: (message) => showNotice(message, true),
    messages: text.exportMessages,
  });

  useShortcuts({ undo, redo });

  const visibleSpread = useMemo(
    () => getVisibleSpread(pages, currentPageIndex),
    [pages, currentPageIndex],
  );
  const pageSpreads = useMemo(() => getPageSpreads(pages), [pages]);
  const currentSpreadIndex = Math.max(
    0,
    pageSpreads.findIndex((spread) => spread.pageIndexes.includes(currentPageIndex)),
  );
  const currentSpread = pageSpreads[currentSpreadIndex];
  const previousIndex = currentPageIndex === 0 ? 0 : Math.max(0, getSpreadStartIndex(currentPageIndex) - 2);
  const nextIndex = currentPageIndex === 0 ? 1 : Math.min(pages.length - 1, getSpreadStartIndex(currentPageIndex) + 2);
  const canGoPrevious = currentSpreadIndex > 0;
  const canGoNext = currentSpreadIndex < pageSpreads.length - 1;
  const exportGroups = useMemo(() => getExportGroups(pages), [pages]);
  const displayWidth = visibleSpread.pages.length > 1 ? A4_WIDTH * 2 : A4_WIDTH;

  const scale = usePageScale({
    mainRef: pageViewportRef,
    isLoaded,
    pageWidth: displayWidth,
    pageHeight: A4_HEIGHT,
    padding: A4_VIEWPORT_PADDING,
  });

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current !== null) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  const selectedTextStyle = (() => {
    if (!selectedTextTarget) return null;

    const targetPage = pages.find((page) => page.id === selectedTextTarget.pageId);
    if (!targetPage || !visibleSpread.pages.some((page) => page.id === targetPage.id)) return null;

    if (selectedTextTarget.type === 'coverTitle') {
      return {
        target: selectedTextTarget,
        style: {
          ...getDefaultTextStyle(DEFAULT_COVER_TITLE_FONT_SIZE),
          ...targetPage.coverTitleStyle,
        },
      };
    }

    if (selectedTextTarget.type === 'coverDate') {
      return {
        target: selectedTextTarget,
        style: {
          ...getDefaultTextStyle(DEFAULT_COVER_DATE_FONT_SIZE),
          ...targetPage.coverDateStyle,
        },
      };
    }

    if (selectedTextTarget.type === 'layoutText') {
      const layoutText = targetPage.layoutTexts?.[selectedTextTarget.textIndex];

      return {
        target: selectedTextTarget,
        style: {
          ...getDefaultTextStyle(DEFAULT_LAYOUT_TEXT_FONT_SIZE),
          ...layoutText?.style,
        },
      };
    }

    if (selectedTextTarget.type !== 'caption') return null;

    const photo = targetPage.photos[selectedTextTarget.photoIndex];
    if (!photo) return null;

    return {
      target: selectedTextTarget,
      style: {
        ...getDefaultTextStyle(DEFAULT_CAPTION_FONT_SIZE),
        ...photo.captionStyle,
      },
    };
  })();

  const updateSelectedTextStyle = (updates: TextStyle) => {
    if (!selectedTextTarget) return;

    const targetPage = pages.find((page) => page.id === selectedTextTarget.pageId);
    if (!targetPage || !visibleSpread.pages.some((page) => page.id === targetPage.id)) return;

    if (selectedTextTarget.type === 'coverTitle') {
      updatePageData(targetPage.id, {
        coverTitleStyle: {
          ...getDefaultTextStyle(DEFAULT_COVER_TITLE_FONT_SIZE),
          ...targetPage.coverTitleStyle,
          ...updates,
        },
      });
      return;
    }

    if (selectedTextTarget.type === 'coverDate') {
      updatePageData(targetPage.id, {
        coverDateStyle: {
          ...getDefaultTextStyle(DEFAULT_COVER_DATE_FONT_SIZE),
          ...targetPage.coverDateStyle,
          ...updates,
        },
      });
      return;
    }

    if (selectedTextTarget.type === 'layoutText') {
      const layoutText = targetPage.layoutTexts?.[selectedTextTarget.textIndex];
      updateLayoutText(targetPage.id, selectedTextTarget.textIndex, {
        style: {
          ...getDefaultTextStyle(DEFAULT_LAYOUT_TEXT_FONT_SIZE),
          ...layoutText?.style,
          ...updates,
        },
      });
      return;
    }

    if (selectedTextTarget.type !== 'caption') return;

    const photo = targetPage.photos[selectedTextTarget.photoIndex];
    if (!photo) return;

    updatePhoto(targetPage.id, selectedTextTarget.photoIndex, {
      captionStyle: {
        ...getDefaultTextStyle(DEFAULT_CAPTION_FONT_SIZE),
        ...photo.captionStyle,
        ...updates,
      },
    });
  };

  const selectTextTarget = (target: TextTarget) => {
    setSelectedTextTarget(target);
    setActiveSidebarPanel('text');
  };

  const clearTextTarget = (nextFocusedElement: EventTarget | null) => {
    if (
      nextFocusedElement instanceof HTMLElement
      && nextFocusedElement.closest('[data-text-settings-panel]')
    ) {
      return;
    }

    setSelectedTextTarget(null);
    setActiveSidebarPanel((panel) => (panel === 'text' ? 'page' : panel));
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        {text.loading}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-gray-100 font-sans text-gray-900 overflow-hidden">
      <Sidebar
        text={text}
        isExporting={isExporting}
        activePanel={activeSidebarPanel}
        onActivePanelChange={setActiveSidebarPanel}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExport={exportAll}
        selectedTextStyle={selectedTextStyle}
        onTextStyleChange={updateSelectedTextStyle}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col items-center h-[100dvh] overflow-hidden relative w-full">
        <button
          className="md:hidden absolute top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-md border border-gray-200 text-gray-700 hover:text-blue-600 focus:outline-none"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <div
          ref={pageViewportRef}
          className="relative flex min-h-0 w-full flex-1 items-center justify-center px-12 py-4 md:px-16"
        >
          <button
            type="button"
            onClick={() => setCurrentPageIndex(previousIndex)}
            disabled={!canGoPrevious}
            className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-md transition-colors hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30 md:left-5"
            aria-label={text.previousPage}
          >
            <ChevronLeft size={22} />
          </button>

          <button
            type="button"
            onClick={() => setCurrentPageIndex(nextIndex)}
            disabled={!canGoNext}
            className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-md transition-colors hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30 md:right-5"
            aria-label={text.nextPage}
          >
            <ChevronRight size={22} />
          </button>

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
                onError={(message) => showNotice(message)}
                onPageSelect={setCurrentPageIndex}
                onTextSelect={selectTextTarget}
                onTextBlur={clearTextTarget}
              />
            </div>
          </div>
        </div>

        <div className="z-20 mb-4 flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white/95 p-1.5 shadow-lg">
          <span className="min-w-16 px-2 text-center text-xs font-semibold text-gray-700">
            {currentSpread?.pageIndexes.map((index) => index + 1).join('-') ?? currentPageIndex + 1}
            <span className="text-gray-400"> / {pages.length}</span>
          </span>
          <button
            type="button"
            onClick={() => setIsOverviewOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100"
            aria-label={text.overviewOpen}
          >
            <LayoutGrid size={14} /> {text.overviewOpen}
          </button>
        </div>
      </main>

      {isExporting && (
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
      )}

      {isExporting && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <Loader2 className="w-16 h-16 animate-spin mb-4 text-blue-400" />
          <h2 className="text-2xl font-bold mb-2">{text.exportOverlayTitle}</h2>
          <p className="text-gray-300">{text.exportOverlayDescription}</p>
        </div>
      )}

      {notice && (
        <NoticeBanner
          key={notice.id}
          message={notice.message}
          onClose={closeNotice}
          closeLabel={text.closeNotice}
        />
      )}

      <OverviewModal
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        text={text}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
