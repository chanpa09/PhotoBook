import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { Loader2, Menu } from 'lucide-react';
import { A4Page } from './components/A4Page';
import { ConfirmDialog } from './components/ConfirmDialog';
import { NoticeBanner } from './components/NoticeBanner';
import { OverviewModal } from './components/OverviewModal';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar, type SidebarPanel } from './components/Sidebar';
import { useExportPages } from './hooks/useExportPages';
import { usePageScale } from './hooks/usePageScale';
import { useShortcuts } from './hooks/useShortcuts';
import { TRANSLATIONS } from './i18n';
import { useProjectStore } from './store/useProjectStore';
import type { TextStyle } from './types';
import type { TextTarget } from './utils/textStyle';
import {
  DEFAULT_CAPTION_FONT_SIZE,
  DEFAULT_COVER_DATE_FONT_SIZE,
  DEFAULT_COVER_TITLE_FONT_SIZE,
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

function App() {
  const {
    isLoaded,
    pages,
    settings,
    currentPageIndex,
    removePage,
    updatePhoto,
    updatePageData,
  } = useProjectStore();

  const { undo, redo } = useStore(useProjectStore.temporal);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<SidebarPanel>('edit');
  const [selectedTextTarget, setSelectedTextTarget] = useState<TextTarget | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const mainRef = useRef<HTMLElement>(null);
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

  const scale = usePageScale({
    mainRef,
    isLoaded,
    pageWidth: A4_WIDTH,
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

  const currentPage = pages[currentPageIndex] || pages[0];
  const selectedTextStyle = (() => {
    if (!selectedTextTarget) return null;

    const targetPage = pages.find((page) => page.id === selectedTextTarget.pageId);
    if (!targetPage || targetPage.id !== currentPage.id) return null;

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
    if (!targetPage || targetPage.id !== currentPage.id) return;

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
    setActiveSidebarPanel((panel) => (panel === 'text' ? 'edit' : panel));
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
        onRequestDeletePage={() => setIsDeleteConfirmOpen(true)}
        onOpenOverview={() => setIsOverviewOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExport={exportAll}
        selectedTextStyle={selectedTextStyle}
        onTextStyleChange={updateSelectedTextStyle}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main ref={mainRef} className="flex-1 flex flex-col items-center justify-center h-[100dvh] overflow-hidden relative w-full">
        <button
          className="md:hidden absolute top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-md border border-gray-200 text-gray-700 hover:text-blue-600 focus:outline-none"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <div
          className="relative"
          style={{
            width: `${A4_WIDTH * scale}px`,
            height: `${A4_HEIGHT * scale}px`,
          }}
        >
          <div
            className="transform origin-top-left transition-transform"
            style={{
              width: `${A4_WIDTH}px`,
              height: `${A4_HEIGHT}px`,
              transform: `scale(${scale})`,
            }}
          >
            <A4Page
              page={currentPage}
              pageIndex={currentPageIndex}
              settings={settings}
              text={text}
              onError={(message) => showNotice(message)}
              onTextSelect={selectTextTarget}
              onTextBlur={clearTextTarget}
            />
          </div>
        </div>
      </main>

      {isExporting && (
        <div
          ref={hiddenPagesRef}
          style={{ position: 'absolute', top: '-20000px', left: '-20000px' }}
        >
          {pages.map((page, index) => (
            <div key={`export-${page.id}`} style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px`, marginBottom: '20px' }}>
              <A4Page
                page={page}
                pageIndex={index}
                settings={settings}
                text={text}
                showPageLabel={false}
              />
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

      {isDeleteConfirmOpen && (
        <ConfirmDialog
          title={text.deleteDialogTitle}
          description={text.deleteDialogDescription}
          confirmLabel={text.confirmDelete}
          cancelLabel={text.cancel}
          closeLabel={text.closeDeleteDialog}
          onCancel={() => setIsDeleteConfirmOpen(false)}
          onConfirm={() => {
            removePage();
            setIsDeleteConfirmOpen(false);
          }}
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
