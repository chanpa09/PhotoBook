import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { ChevronLeft, ChevronRight, LayoutGrid, Loader2, Menu } from 'lucide-react';
import { A4Page } from './components/A4Page';
import { PageSpreadView } from './components/PageSpreadView';
import { NoticeBanner } from './components/NoticeBanner';
import { OverviewModal } from './components/OverviewModal';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar, type SidebarPanel } from './components/Sidebar';
import { useExportPages } from './hooks/useExportPages';
import { usePageScale } from './hooks/usePageScale';
import { useShortcuts } from './hooks/useShortcuts';
import { useTextSelection } from './hooks/useTextSelection';
import { TRANSLATIONS } from './i18n';
import { useProjectStore } from './store/useProjectStore';
import { getExportGroups, getPageSpreads, getSpreadStartIndex, getVisibleSpread, isTwoPageSpread } from './utils/layout';
import type { TextTarget } from './utils/textStyle';

interface Notice {
  id: number;
  message: string;
  persistent: boolean;
}

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const A4_VIEWPORT_PADDING = 32;

function App() {
  const {
    isLoaded,
    pages,
    settings,
    currentPageIndex,
    setCurrentPageIndex,
  } = useProjectStore();

  const { undo, redo } = useStore(useProjectStore.temporal);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<SidebarPanel>('page');
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

  const { isExporting, exportProgress, exportAll } = useExportPages({
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

  const {
    setSelectedTextTarget,
    selectedTextStyle,
    updateSelectedTextStyle,
  } = useTextSelection(pages, visibleSpread.pages);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current !== null) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

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
        onNotice={showNotice}
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
