import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { ChevronLeft, ChevronRight, LayoutGrid, Menu } from 'lucide-react';

import { NoticeBanner } from '@/components/NoticeBanner';
import { OverviewModal } from '@/components/OverviewModal';
import { SettingsModal } from '@/components/SettingsModal';
import { Sidebar, type SidebarPanel } from '@/components/Sidebar';
import { Workspace } from '@/components/Workspace';
import { DndProvider } from '@/providers/DndProvider';

import { useExportPages } from '@/hooks/useExportPages';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useTextSelection } from '@/hooks/useTextSelection';
import { TRANSLATIONS } from '@/i18n';
import { useProjectStore } from '@/store/useProjectStore';
import { getPageSpreads, getSpreadStartIndex } from '@/utils/layout';

interface Notice {
  id: number;
  message: string;
  persistent: boolean;
}

function App() {
  const {
    isLoaded,
    pages,
    settings,
    currentPageIndex,
    setCurrentPageIndex,
  } = useProjectStore(
    useShallow((state) => ({
      isLoaded: state.isLoaded,
      pages: state.pages,
      settings: state.settings,
      currentPageIndex: state.currentPageIndex,
      setCurrentPageIndex: state.setCurrentPageIndex,
    })),
  );

  const { undo, redo } = useStore(
    useProjectStore.temporal,
    useShallow((state) => ({
      undo: state.undo,
      redo: state.redo,
    })),
  );

  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<SidebarPanel>('page');
  const [notice, setNotice] = useState<Notice | null>(null);
  
  const noticeTimeoutRef = useRef<number | null>(null);
  const hiddenPagesRef = useRef<HTMLDivElement>(null);
  
  const uiLanguage = settings.uiLanguage ?? 'ko';
  const text = TRANSLATIONS[uiLanguage as keyof typeof TRANSLATIONS];

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

  const pageSpreads = useMemo(() => getPageSpreads(pages), [pages]);
  const currentSpreadIndex = Math.max(
    0,
    pageSpreads.findIndex((spread) => spread.pageIndexes.includes(currentPageIndex)),
  );
  const currentSpread = pageSpreads[currentSpreadIndex];
  
  const visiblePages = useMemo(() => {
    if (!currentSpread) return [];
    return currentSpread.pageIndexes.map((index) => pages[index]).filter(Boolean);
  }, [currentSpread, pages]);

  const {
    setSelectedTextTarget,
    selectedTextStyle,
    updateSelectedTextStyle,
    clearTextTarget,
    selectedTextRect,
    setSelectedTextRect,
  } = useTextSelection(pages, visiblePages);

  useShortcuts({ undo, redo });
  
  const previousIndex = currentPageIndex === 0 ? 0 : Math.max(0, getSpreadStartIndex(currentPageIndex) - 2);
  const nextIndex = currentPageIndex === 0 ? 1 : Math.min(pages.length - 1, getSpreadStartIndex(currentPageIndex) + 2);
  
  const canGoPrevious = currentSpreadIndex > 0;
  const canGoNext = currentSpreadIndex < pageSpreads.length - 1;

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current !== null) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        {text.loading}
      </div>
    );
  }

  return (
    <DndProvider>
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

          <Workspace 
            text={text}
            isExporting={isExporting}
            exportProgress={exportProgress}
            onNotice={showNotice}
            hiddenPagesRef={hiddenPagesRef}
            setSelectedTextTarget={setSelectedTextTarget}
            selectedTextStyle={selectedTextStyle}
            updateSelectedTextStyle={updateSelectedTextStyle}
            clearTextTarget={clearTextTarget}
            selectedTextRect={selectedTextRect}
            setSelectedTextRect={setSelectedTextRect}
          />

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
    </DndProvider>
  );
}

export default App;
