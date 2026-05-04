import { useEffect, useMemo, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { useStore } from 'zustand';
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
  RotateCw,
  Settings,
  Sticker,
  Type,
  X,
} from 'lucide-react';
import { BACKGROUND_COLORS, BODY_PAGE_COUNT_OPTIONS } from '../constants';
import type { AppText } from '../i18n';
import type { FrameLayoutDefinition, LayoutType, StampAsset, TextStyle } from '../types';
import type { TextTarget } from '../utils/textStyle';
import { FONT_OPTIONS, LANGUAGE_OPTIONS } from '../utils/textStyle';
import { getFrameLayout, getSpreadStartIndex } from '../utils/layout';
import { useProjectStore } from '../store/useProjectStore';
import { serializeStampDragData, STAMP_DRAG_MIME_TYPE } from '../utils/stamps';

interface Props {
  text: AppText;
  isExporting: boolean;
  activePanel: SidebarPanel;
  onActivePanelChange: (panel: SidebarPanel) => void;
  onOpenSettings: () => void;
  onExport: (format: 'png' | 'jpeg') => void;
  selectedTextStyle: { target: TextTarget; style: Required<TextStyle> } | null;
  onTextStyleChange: (updates: TextStyle) => void;
  isOpen: boolean;
  onClose: () => void;
}

export type SidebarPanel = 'page' | 'layout' | 'text' | 'stamp' | 'export';
type LayoutFilter = 'page' | 'all' | 'onePage' | 'twoPage' | 'cover' | 'title' | 'colophon';
type StampStatus = 'idle' | 'loading' | 'ready' | 'error';
type StampManifest = { stamps?: StampAsset[] };

function ImportedLayoutPreview({ layoutId }: { layoutId: LayoutType }) {
  const frameLayout = getFrameLayout(layoutId);
  if (!frameLayout) return null;

  return (
    <span
      className="relative mt-1 block w-14 overflow-hidden rounded-sm border border-gray-200 bg-white"
      style={{ aspectRatio: `${frameLayout.sourceWidth}/${frameLayout.sourceHeight}` }}
      aria-hidden="true"
    >
      {frameLayout.textFrames?.map((frame, index) => (
        <span
          key={`text-${index}`}
          className="absolute border border-dashed border-gray-300 bg-white/20"
          style={{
            left: `${(frame.x / frameLayout.sourceWidth) * 100}%`,
            top: `${(frame.y / frameLayout.sourceHeight) * 100}%`,
            width: `${(frame.width / frameLayout.sourceWidth) * 100}%`,
            height: `${(frame.height / frameLayout.sourceHeight) * 100}%`,
          }}
        />
      ))}
      {frameLayout.frames.map((frame, index) => (
        <span
          key={`photo-${index}`}
          className="absolute bg-gray-300"
          style={{
            left: `${(frame.x / frameLayout.sourceWidth) * 100}%`,
            top: `${(frame.y / frameLayout.sourceHeight) * 100}%`,
            width: `${(frame.width / frameLayout.sourceWidth) * 100}%`,
            height: `${(frame.height / frameLayout.sourceHeight) * 100}%`,
          }}
        />
      ))}
    </span>
  );
}

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
    updateLayout,
    movePage,
  } = useProjectStore();
  
  const { undo, redo, pastStates, futureStates } = useStore(useProjectStore.temporal);
  
  const pagesLength = pages.length;
  const currentPage = pages[currentPageIndex] || pages[0];
  const bodyPageCount = Math.max(0, pagesLength - 1);
  const canMoveSpreadUp = getSpreadStartIndex(currentPageIndex) > 1;
  const canMoveSpreadDown = currentPageIndex > 0 && getSpreadStartIndex(currentPageIndex) + 1 < pagesLength - 1;
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;
  const [layoutFilter, setLayoutFilter] = useState<LayoutFilter>('page');
  const [stampAssets, setStampAssets] = useState<StampAsset[]>([]);
  const [stampStatus, setStampStatus] = useState<StampStatus>('idle');
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

  const retryLoadStamps = () => {
    setStampStatus('idle');
  };
  const handleStampDragStart = (event: DragEvent<HTMLButtonElement>, stamp: StampAsset) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(STAMP_DRAG_MIME_TYPE, serializeStampDragData(stamp));
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
  const filteredStampAssets = stampAssets.filter((stamp) => (
    isCoverPage ? stamp.isCover : stamp.isPage
  ));
  const panels: { id: SidebarPanel; label: string; icon: ReactNode; disabled?: boolean }[] = [
    { id: 'page', label: text.sidebarTabs.page, icon: <FileText size={14} /> },
    { id: 'layout', label: text.sidebarTabs.layout, icon: <LayoutGrid size={14} /> },
    { id: 'text', label: text.sidebarTabs.text, icon: <Type size={14} />, disabled: !selectedTextStyle },
    { id: 'stamp', label: text.sidebarTabs.stamp, icon: <Sticker size={14} /> },
    { id: 'export', label: text.sidebarTabs.export, icon: <Download size={14} /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
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

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {visibleActivePanel === 'text' && (
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100" data-text-settings-panel>
            <h2 className="text-xs font-semibold text-gray-700 mb-2">{text.textSettings}</h2>
            {selectedTextStyle ? (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  {text.font}
                  <select
                    value={selectedFontOption}
                    onChange={(event) => {
                      const option = FONT_OPTIONS.find((item) => item.id === event.target.value);
                      if (!option || option.id === 'auto') {
                        onTextStyleChange({ fontMode: 'auto', fontFamily: '' });
                      } else {
                        onTextStyleChange({ fontMode: 'manual', fontFamily: option.fontFamily });
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none"
                  >
                    {FONT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {fontOptionLabel(option.id)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  {text.textLanguage}
                  <select
                    value={selectedLanguageOption}
                    onChange={(event) => {
                      if (event.target.value === 'auto') {
                        onTextStyleChange({ languageMode: 'auto' });
                      } else {
                        onTextStyleChange({
                          languageMode: 'manual',
                          language: event.target.value as TextStyle['language'],
                        });
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none"
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {languageOptionLabel(option.id)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  {text.fontSize}
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="10"
                      max="72"
                      step="1"
                      value={selectedTextStyle.style.fontSize}
                      onChange={(event) => updateFontSize(event.target.value)}
                      className="min-w-0 flex-1 accent-blue-600"
                    />
                    <input
                      type="number"
                      min="10"
                      max="72"
                      value={selectedTextStyle.style.fontSize}
                      onChange={(event) => updateFontSize(event.target.value)}
                      className="w-14 rounded-md border border-gray-300 bg-white px-1.5 py-1 text-right text-xs text-gray-800 focus:border-blue-500 focus:outline-none"
                      aria-label={text.fontSize}
                    />
                  </div>
                </label>
              </div>
            ) : (
              <p className="text-xs leading-5 text-gray-500">
                {text.selectTextPrompt}
              </p>
            )}
          </div>
        )}

        {visibleActivePanel === 'page' && (
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <h2 className="text-xs font-semibold text-gray-700 flex items-center gap-2 mb-2">
                <Palette size={14} /> {text.backgroundColor}
              </h2>
              <div className="flex gap-2 flex-wrap items-center">
                {BACKGROUND_COLORS.map((color) => {
                  const colorName = text.backgroundColorNames[color.id] ?? color.name;

                  return (
                    <button
                      key={color.id}
                      onClick={() => setSettings({ ...settings, backgroundColor: color.id })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${settings.backgroundColor === color.id ? 'border-blue-500 shadow-md scale-110' : 'border-gray-200'}`}
                      style={{ backgroundColor: color.id }}
                      title={colorName}
                      aria-label={`${text.backgroundColor} ${colorName}`}
                      aria-pressed={settings.backgroundColor === color.id}
                    />
                  );
                })}

                <div className="relative w-6 h-6 ml-1 group">
                  <input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(event) => setSettings({ ...settings, backgroundColor: event.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title={text.customBackgroundColor}
                    aria-label={text.customBackgroundColor}
                  />
                  <div
                    className={`w-full h-full rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110 ${!BACKGROUND_COLORS.some((color) => color.id === settings.backgroundColor) ? 'border-blue-500 shadow-md scale-110' : 'border-gray-300'}`}
                    style={{ backgroundColor: settings.backgroundColor }}
                  >
                    <Plus
                      size={10}
                      className={parseInt(settings.backgroundColor.replace('#', ''), 16) > 0xffffff / 1.5 ? 'text-gray-400' : 'text-white'}
                    />
                  </div>
                </div>
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs font-semibold text-gray-700">
              <span>{text.printWarrantyGuide}</span>
              <input
                type="checkbox"
                checked={settings.showPrintWarrantyGuide ?? true}
                onChange={(event) => setSettings({ ...settings, showPrintWarrantyGuide: event.target.checked })}
                className="h-5 w-5 accent-blue-600"
                aria-label={text.printWarrantyGuide}
              />
            </label>

            <div>
              <div className="mb-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{text.pageManagement(pagesLength)}</h2>
              </div>

              <div className="flex flex-col gap-2">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-700">{text.bodyPageCount}</span>
                    <span className="text-[10px] font-bold text-gray-400">{text.totalPageCount(pagesLength)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {BODY_PAGE_COUNT_OPTIONS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setBodyPageCount(count)}
                        className={`rounded-md border px-2 py-1.5 text-xs font-bold transition-colors ${
                          bodyPageCount === count
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                        aria-pressed={bodyPageCount === count}
                      >
                        {text.bodyPageCountOption(count)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => movePage('up')}
                    disabled={!canMoveSpreadUp}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors disabled:opacity-30 text-xs"
                    title={text.movePageForward}
                    aria-label={text.movePageForward}
                  >
                    <ArrowUp size={14} /> {text.movePageForward}
                  </button>
                  <button
                    onClick={() => movePage('down')}
                    disabled={!canMoveSpreadDown}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors disabled:opacity-30 text-xs"
                    title={text.movePageBackward}
                    aria-label={text.movePageBackward}
                  >
                    <ArrowDown size={14} /> {text.movePageBackward}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {visibleActivePanel === 'layout' && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="sticky top-0 z-10 -mx-1 mb-3 border-b border-gray-100 bg-white/95 px-1 pb-3 backdrop-blur">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{text.layout}</h2>
                  <span className="text-[10px] font-bold text-gray-400">
                    {text.layoutResultCount(filteredImportedLayouts.length)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {layoutFilterOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setLayoutFilter(option.id)}
                      className={`rounded-full border px-2 py-1 text-[10px] font-bold transition-colors ${
                        activeLayoutFilter === option.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                      aria-pressed={activeLayoutFilter === option.id}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {importedLayoutStatus === 'loading' && (
                  <div className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-3 text-xs font-medium text-gray-500">
                    <Loader2 size={14} className="animate-spin" />
                    {text.layoutLoading}
                  </div>
                )}

                {importedLayoutStatus === 'error' && (
                  <div className="col-span-2 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                    <p className="font-semibold">{text.layoutLoadFailed}</p>
                    <button
                      type="button"
                      onClick={() => void loadImportedLayouts()}
                      className="mt-2 rounded-md border border-red-200 bg-white px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100"
                    >
                      {text.retry}
                    </button>
                  </div>
                )}

                {filteredImportedLayouts.map((layout) => {
                  const canApplyLayout = layout.isUserSelectable
                    && !layout.isObjectLayer
                    && (isCoverPage ? layout.templateType === 'cover' : layout.templateType !== 'cover');

                  return (
                    <button
                      key={layout.id}
                      onClick={() => canApplyLayout && updateLayout(layout.id)}
                      disabled={!canApplyLayout}
                      className={`flex min-h-[118px] flex-col items-center justify-start gap-1 p-2 rounded-lg border-2 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                        currentPage.layout === layout.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-sm'
                          : canApplyLayout
                            ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                            : 'border-gray-100 bg-gray-50 text-gray-500'
                      }`}
                      aria-pressed={currentPage.layout === layout.id}
                    >
                      <span className="max-w-full truncate text-xs text-center">
                        {text.layoutLabels[layout.id] ?? layout.label}
                      </span>
                      <div className="flex max-w-full flex-wrap justify-center gap-1">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          layout.pageCount === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {layout.pageCount === 2 ? text.layoutBadges.twoPage : text.layoutBadges.onePage}
                        </span>
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                          {text.layoutBadges.photoCount(layout.photoFrameCount)}
                        </span>
                        {layout.textFrameCount > 0 && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            {text.layoutBadges.textCount(layout.textFrameCount)}
                          </span>
                        )}
                      </div>
                      {(layout.isObjectLayer || !layout.isUserSelectable) && (
                        <div className="flex max-w-full flex-wrap justify-center gap-1">
                          {layout.isObjectLayer && (
                            <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                              {text.layoutBadges.objectLayer}
                            </span>
                          )}
                          {!layout.isUserSelectable && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                              {text.layoutBadges.nonSelectable}
                            </span>
                          )}
                        </div>
                      )}
                      <ImportedLayoutPreview layoutId={layout.id} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {visibleActivePanel === 'stamp' && (
          <div className="flex flex-col gap-3">
            <div className="sticky top-0 z-10 -mx-1 border-b border-gray-100 bg-white/95 px-1 pb-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{text.stampPanelTitle}</h2>
                <span className="text-[10px] font-bold text-gray-400">
                  {text.stampResultCount(filteredStampAssets.length)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {stampStatus === 'loading' && (
                <div className="col-span-3 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-3 text-xs font-medium text-gray-500">
                  <Loader2 size={14} className="animate-spin" />
                  {text.stampLoading}
                </div>
              )}

              {stampStatus === 'error' && (
                <div className="col-span-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                  <p className="font-semibold">{text.stampLoadFailed}</p>
                  <button
                    type="button"
                    onClick={retryLoadStamps}
                    className="mt-2 rounded-md border border-red-200 bg-white px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100"
                  >
                    {text.retry}
                  </button>
                </div>
              )}

              {stampStatus === 'ready' && filteredStampAssets.length === 0 && (
                <div className="col-span-3 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-500">
                  {text.stampEmpty}
                </div>
              )}

              {stampStatus === 'ready' && filteredStampAssets.map((stamp) => (
                <button
                  key={stamp.id}
                  type="button"
                  draggable
                  onDragStart={(event) => handleStampDragStart(event, stamp)}
                  className="flex aspect-square cursor-grab items-center justify-center rounded-lg border border-gray-200 bg-white p-2 transition-colors hover:border-blue-300 hover:bg-blue-50 active:cursor-grabbing"
                  title={stamp.label}
                  aria-label={stamp.label}
                >
                  <img
                    src={stamp.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    className="max-h-full max-w-full object-contain"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {visibleActivePanel === 'export' && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{text.exportMode.label}</h2>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setSettings({ ...settings, exportMode: 'zip' })}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${(!settings.exportMode || settings.exportMode === 'zip') ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {text.exportMode.zip}
                </button>
                <button
                  onClick={() => setSettings({ ...settings, exportMode: 'individual' })}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${settings.exportMode === 'individual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {text.exportMode.individual}
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{text.download}</h2>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onExport('png')}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm text-sm disabled:opacity-50"
                aria-label={text.exportPng}
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {text.exportPng}
              </button>
              <button
                onClick={() => onExport('jpeg')}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
                aria-label={text.exportJpeg}
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {text.exportJpeg}
              </button>
            </div>
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
