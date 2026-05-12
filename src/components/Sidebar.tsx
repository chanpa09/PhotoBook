import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useStore } from 'zustand';
import {
  Download,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  RotateCcw,
  RotateCw,
  Settings,
  Sticker,
  Type,
  X,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useShallow } from 'zustand/react/shallow';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  ExportPanel,
  LayoutPanel,
  PagePanel,
  StampPanel,
  TextPanel,
} from '@/components/SidebarPanels';
import type { AppText } from '@/i18n';
import { useProjectStore } from '@/store/useProjectStore';
import type { FrameLayoutDefinition, StampAsset, TextStyle, TextTarget } from '@/types';
import { getSpreadStartIndex } from '@/utils/layout';
import { FONT_OPTIONS } from '@/utils/textStyle';
import {
  createProjectArchive,
  createProjectArchiveFilename,
  downloadBlob,
  type ProjectArchiveSummary,
  readProjectArchive,
  readProjectArchiveSummary,
} from '@/utils/projectArchive';

interface Props {
  text: AppText;
  isExporting: boolean;
  activePanel: SidebarPanel;
  onActivePanelChange: (panel: SidebarPanel) => void;
  onOpenSettings: () => void;
  onExport: (format: 'png' | 'jpeg') => void;
  onNotice: (message: string, persistent?: boolean) => void;
  selectedTextStyle: { target: TextTarget; style: Required<TextStyle> } | null;
  onTextStyleChange: (updates: TextStyle) => void;
  isOpen: boolean;
  onClose: () => void;
}

export type SidebarPanel = 'page' | 'layout' | 'text' | 'stamp' | 'export';
type LayoutFilter = 'page' | 'all' | 'onePage' | 'twoPage' | 'cover' | 'title' | 'colophon';
type StampStatus = 'idle' | 'loading' | 'ready' | 'error';
type StampManifest = { stamps?: StampAsset[] };

function importedLayoutMatchesFilter(layout: FrameLayoutDefinition, filter: LayoutFilter) {
  switch (filter) {
    case 'all':
      return true;
    case 'onePage':
      return layout.pageCount !== 2;
    case 'twoPage':
      return layout.pageCount === 2;
    case 'cover':
    case 'title':
    case 'colophon':
      return layout.templateType === filter;
    case 'page':
    default:
      return layout.templateType === 'page';
  }
}

export function Sidebar({
  text,
  isExporting,
  activePanel,
  onActivePanelChange,
  onOpenSettings,
  onExport,
  onNotice,
  selectedTextStyle,
  onTextStyleChange,
  isOpen,
  onClose,
}: Props) {
  const {
    pages,
    settings,
    currentPageIndex,
    importedLayouts,
    importedLayoutStatus,
    loadImportedLayouts,
    setSettings,
    setBodyPageCount,
    replaceProject,
    updateLayout,
    movePage,
  } = useProjectStore(
    useShallow((state) => ({
      pages: state.pages,
      settings: state.settings,
      currentPageIndex: state.currentPageIndex,
      importedLayouts: state.importedLayouts,
      importedLayoutStatus: state.importedLayoutStatus,
      loadImportedLayouts: state.loadImportedLayouts,
      setSettings: state.setSettings,
      setBodyPageCount: state.setBodyPageCount,
      replaceProject: state.replaceProject,
      updateLayout: state.updateLayout,
      movePage: state.movePage,
    })),
  );

  const { undo, redo, clear, pastStates, futureStates } = useStore(
    useProjectStore.temporal,
    useShallow((state) => ({
      undo: state.undo,
      redo: state.redo,
      clear: state.clear,
      pastStates: state.pastStates,
      futureStates: state.futureStates,
    })),
  );

  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingProjectFile, setPendingProjectFile] = useState<File | null>(null);
  const [pendingProjectSummary, setPendingProjectSummary] = useState<ProjectArchiveSummary | null>(null);
  const [isProjectFileBusy, setIsProjectFileBusy] = useState(false);
  const [layoutFilter, setLayoutFilter] = useState<LayoutFilter>('page');
  const [stampAssets, setStampAssets] = useState<StampAsset[]>([]);
  const [stampStatus, setStampStatus] = useState<StampStatus>('idle');

  const pagesLength = pages.length;
  const currentPage = pages[currentPageIndex] || pages[0];
  const bodyPageCount = Math.max(0, pagesLength - 1);
  const canMoveSpreadUp = getSpreadStartIndex(currentPageIndex) > 1;
  const canMoveSpreadDown = currentPageIndex > 0 && getSpreadStartIndex(currentPageIndex) + 1 < pagesLength - 1;
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;
  const isCoverPage = currentPageIndex === 0;
  const activeLayoutFilter = isCoverPage ? 'cover' : layoutFilter === 'cover' ? 'page' : layoutFilter;

  const filteredImportedLayouts = useMemo(
    () => importedLayouts.filter((layout) => {
      if (isCoverPage) return layout.templateType === 'cover';
      if (layout.templateType === 'cover') return false;
      return importedLayoutMatchesFilter(layout, activeLayoutFilter);
    }),
    [activeLayoutFilter, importedLayouts, isCoverPage],
  );

  const layoutCols = 2;
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual intentionally exposes imperative helpers here.
  const layoutVirtualizer = useVirtualizer({
    count: Math.ceil(filteredImportedLayouts.length / layoutCols),
    getScrollElement: () => sidebarScrollRef.current,
    estimateSize: () => 140,
    overscan: 3,
  });

  const filteredStampAssets = stampAssets.filter((stamp) => (
    isCoverPage ? stamp.isCover : stamp.isPage
  ));

  const stampCols = 3;
  const stampVirtualizer = useVirtualizer({
    count: Math.ceil(filteredStampAssets.length / stampCols),
    getScrollElement: () => sidebarScrollRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const layoutFilterOptions: { id: LayoutFilter; label: string }[] = isCoverPage
    ? [{ id: 'cover', label: text.layoutFilters.cover }]
    : [
      { id: 'page', label: text.layoutFilters.page },
      { id: 'all', label: text.layoutFilters.all },
      { id: 'onePage', label: text.layoutFilters.onePage },
      { id: 'twoPage', label: text.layoutFilters.twoPage },
      { id: 'title', label: text.layoutFilters.title },
      { id: 'colophon', label: text.layoutFilters.colophon },
    ];

  useEffect(() => {
    if (activePanel === 'layout' && importedLayoutStatus === 'idle') {
      void loadImportedLayouts();
    }
  }, [activePanel, importedLayoutStatus, loadImportedLayouts]);

  useEffect(() => {
    if (activePanel !== 'stamp' || stampStatus !== 'idle') return;

    const loadStamps = async () => {
      setStampStatus('loading');
      try {
        const response = await fetch('/data/stamps/stamps.json');
        if (!response.ok) {
          throw new Error(`Failed to load stamps: ${response.status}`);
        }
        const manifest = await response.json() as StampManifest;
        setStampAssets(manifest.stamps ?? []);
        setStampStatus('ready');
      } catch (error) {
        console.error('Failed to load stamps', error);
        setStampStatus('error');
      }
    };

    void loadStamps();
  }, [activePanel, stampStatus]);

  const resetProjectFileInput = () => {
    if (projectFileInputRef.current) {
      projectFileInputRef.current.value = '';
    }
  };

  const handleSaveProjectFile = async () => {
    setIsProjectFileBusy(true);
    try {
      const archive = await createProjectArchive({ pages, settings, currentPageIndex });
      downloadBlob(archive, createProjectArchiveFilename());
      onNotice(text.projectFileSaveSuccess);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onNotice(text.projectFileSaveFailed(message), true);
    } finally {
      setIsProjectFileBusy(false);
    }
  };

  const handleProjectFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProjectFileBusy(true);
    try {
      const summary = await readProjectArchiveSummary(file);
      setPendingProjectFile(file);
      setPendingProjectSummary(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onNotice(text.projectFileLoadFailed(message), true);
      resetProjectFileInput();
    } finally {
      setIsProjectFileBusy(false);
    }
  };

  const cancelProjectFileImport = () => {
    setPendingProjectFile(null);
    setPendingProjectSummary(null);
    resetProjectFileInput();
  };

  const confirmProjectFileImport = async () => {
    if (!pendingProjectFile) return;

    setIsProjectFileBusy(true);
    try {
      const project = await readProjectArchive(pendingProjectFile);
      await replaceProject(project);
      clear();
      onNotice(text.projectFileLoadSuccess);
      setPendingProjectFile(null);
      setPendingProjectSummary(null);
      resetProjectFileInput();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onNotice(text.projectFileLoadFailed(message), true);
    } finally {
      setIsProjectFileBusy(false);
    }
  };

  const formatProjectArchiveDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(settings.uiLanguage === 'ja' ? 'ja-JP' : 'ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const updateFontSize = (value: string) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return;

    onTextStyleChange({ fontSize: Math.min(72, Math.max(10, parsedValue)) });
  };

  const selectedFontOption = selectedTextStyle?.style.fontMode === 'manual'
    ? FONT_OPTIONS.find((option) => option.fontFamily === selectedTextStyle.style.fontFamily)?.id ?? 'auto'
    : 'auto';
  const selectedLanguageOption = selectedTextStyle?.style.languageMode === 'manual'
    ? selectedTextStyle.style.language
    : 'auto';

  const fontOptionLabel = (id: string) => {
    switch (id) {
      case 'ko-sans':
        return text.fontOptions.koreanSans;
      case 'meiryo':
        return text.fontOptions.meiryo;
      case 'yu-gothic':
        return text.fontOptions.yuGothic;
      case 'mincho':
        return text.fontOptions.mincho;
      case 'serif':
        return text.fontOptions.serif;
      case 'mono':
        return text.fontOptions.mono;
      default:
        return text.fontOptions.auto;
    }
  };

  const languageOptionLabel = (id: string) => {
    switch (id) {
      case 'ko':
        return text.languageOptions.ko;
      case 'ja':
        return text.languageOptions.ja;
      case 'mixed':
        return text.languageOptions.mixed;
      default:
        return text.languageOptions.auto;
    }
  };

  const visibleActivePanel = activePanel === 'text' && !selectedTextStyle ? 'page' : activePanel;
  const panels: { id: SidebarPanel; label: string; icon: ReactNode; disabled?: boolean }[] = [
    { id: 'page', label: text.sidebarTabs.page, icon: <FileText size={14} /> },
    { id: 'layout', label: text.sidebarTabs.layout, icon: <LayoutGrid size={14} /> },
    { id: 'text', label: text.sidebarTabs.text, icon: <Type size={14} />, disabled: !selectedTextStyle },
    { id: 'stamp', label: text.sidebarTabs.stamp, icon: <Sticker size={14} /> },
    { id: 'export', label: text.sidebarTabs.export, icon: <Download size={14} /> },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`w-[320px] bg-white border-r border-gray-200 p-3 flex flex-col h-[100dvh] fixed md:sticky top-0 left-0 z-50 shadow-xl md:shadow-sm shrink-0 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
          <div className="flex items-center gap-2 text-blue-600">
            <ImageIcon size={24} />
            <h1 className="text-xl font-bold">{text.brand}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              aria-label={text.settingsTitle}
              title={text.settingsTitle}
            >
              <Settings size={18} />
            </button>
            <button
              onClick={onClose}
              className="md:hidden p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              aria-label={text.close}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-3 shrink-0">
          <button
            onClick={() => undo()}
            disabled={!canUndo}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition-colors disabled:opacity-30 text-xs font-medium"
            title={text.undo}
            aria-label={text.undo}
          >
            <RotateCcw size={14} /> {text.undo}
          </button>
          <button
            onClick={() => redo()}
            disabled={!canRedo}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition-colors disabled:opacity-30 text-xs font-medium"
            title={text.redo}
            aria-label={text.redo}
          >
            <RotateCw size={14} /> {text.redo}
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1 mb-3 rounded-lg bg-gray-100 p-1 shrink-0">
          {panels.map((panel) => (
            <button
              key={panel.id}
              type="button"
              onClick={() => onActivePanelChange(panel.id)}
              disabled={panel.disabled}
              className={`flex h-12 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-bold transition-colors ${
                visibleActivePanel === panel.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : panel.disabled
                    ? 'cursor-not-allowed text-gray-300'
                    : 'text-gray-500 hover:bg-white/70 hover:text-gray-700'
              }`}
              aria-pressed={visibleActivePanel === panel.id}
            >
              {panel.icon}
              <span>{panel.label}</span>
            </button>
          ))}
        </div>

        <div ref={sidebarScrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
          {visibleActivePanel === 'text' && (
            <TextPanel
              text={text}
              selectedTextStyle={selectedTextStyle}
              selectedFontOption={selectedFontOption}
              selectedLanguageOption={selectedLanguageOption}
              fontOptionLabel={fontOptionLabel}
              languageOptionLabel={languageOptionLabel}
              updateFontSize={updateFontSize}
              onTextStyleChange={onTextStyleChange}
            />
          )}

          {visibleActivePanel === 'page' && (
            <PagePanel
              text={text}
              settings={settings}
              pagesLength={pagesLength}
              bodyPageCount={bodyPageCount}
              canMoveSpreadUp={canMoveSpreadUp}
              canMoveSpreadDown={canMoveSpreadDown}
              setSettings={setSettings}
              setBodyPageCount={setBodyPageCount}
              movePage={movePage}
            />
          )}

          {visibleActivePanel === 'layout' && (
            <LayoutPanel
              text={text}
              importedLayoutStatus={importedLayoutStatus}
              loadImportedLayouts={loadImportedLayouts}
              filteredImportedLayouts={filteredImportedLayouts}
              layoutFilterOptions={layoutFilterOptions}
              activeLayoutFilter={activeLayoutFilter}
              setLayoutFilter={setLayoutFilter}
              layoutVirtualItems={layoutVirtualizer.getVirtualItems()}
              layoutCols={layoutCols}
              currentPage={currentPage}
              isCoverPage={isCoverPage}
              updateLayout={updateLayout}
            />
          )}

          {visibleActivePanel === 'stamp' && (
            <StampPanel
              text={text}
              stampStatus={stampStatus}
              filteredStampAssets={filteredStampAssets}
              stampVirtualItems={stampVirtualizer.getVirtualItems()}
              stampCols={stampCols}
              retryLoadStamps={() => setStampStatus('idle')}
            />
          )}

          {visibleActivePanel === 'export' && (
            <ExportPanel
              text={text}
              settings={settings}
              isExporting={isExporting}
              isProjectFileBusy={isProjectFileBusy}
              projectFileInputRef={projectFileInputRef}
              setSettings={setSettings}
              handleSaveProjectFile={handleSaveProjectFile}
              handleProjectFileSelect={handleProjectFileSelect}
              onExport={onExport}
            />
          )}
        </div>
      </aside>

      {pendingProjectFile && (
        <ConfirmDialog
          title={text.projectFileLoadDialogTitle}
          description={(
            <div className="space-y-3">
              <p>{text.projectFileLoadDialogDescription}</p>
              {pendingProjectSummary && (
                <p className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-gray-700 break-words">
                  {text.projectFileLoadDialogSummary(
                    pendingProjectFile.name,
                    formatProjectArchiveDate(pendingProjectSummary.exportedAt),
                    pendingProjectSummary.pageCount,
                    pendingProjectSummary.imageCount,
                  )}
                </p>
              )}
            </div>
          )}
          confirmLabel={isProjectFileBusy ? text.loading : text.projectFileLoadConfirm}
          cancelLabel={text.cancel}
          closeLabel={text.projectFileLoadDialogClose}
          confirmDisabled={isProjectFileBusy}
          onCancel={cancelProjectFileImport}
          onConfirm={() => void confirmProjectFileImport()}
        />
      )}
    </>
  );
}
