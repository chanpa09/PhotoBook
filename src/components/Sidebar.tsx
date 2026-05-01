import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
  RotateCw,
  Settings,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { BACKGROUND_COLORS, LAYOUT_OPTIONS } from '../constants';
import type { AppText } from '../i18n';
import type { TextStyle } from '../types';
import type { TextTarget } from '../utils/textStyle';
import { FONT_OPTIONS, LANGUAGE_OPTIONS } from '../utils/textStyle';
import { useProjectStore } from '../store/useProjectStore';

interface Props {
  text: AppText;
  isExporting: boolean;
  activePanel: SidebarPanel;
  onActivePanelChange: (panel: SidebarPanel) => void;
  onRequestDeletePage: () => void;
  onOpenOverview: () => void;
  onOpenSettings: () => void;
  onExport: (format: 'png' | 'jpeg') => void;
  selectedTextStyle: { target: TextTarget; style: Required<TextStyle> } | null;
  onTextStyleChange: (updates: TextStyle) => void;
  isOpen: boolean;
  onClose: () => void;
}

export type SidebarPanel = 'edit' | 'text' | 'export';

export function Sidebar({
  text,
  isExporting,
  activePanel,
  onActivePanelChange,
  onRequestDeletePage,
  onOpenOverview,
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
    setCurrentPageIndex,
    setSettings,
    updateLayout,
    movePage,
    addPage,
  } = useProjectStore();
  
  const { undo, redo, pastStates, futureStates } = useStore(useProjectStore.temporal);
  
  const pagesLength = pages.length;
  const currentPage = pages[currentPageIndex] || pages[0];
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;
  
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
  const visibleActivePanel = activePanel === 'text' && !selectedTextStyle ? 'edit' : activePanel;
  const panels: { id: SidebarPanel; label: string; icon: ReactNode; disabled?: boolean }[] = [
    { id: 'edit', label: text.sidebarTabs.edit, icon: <LayoutGrid size={14} /> },
    { id: 'text', label: text.sidebarTabs.text, icon: <Type size={14} />, disabled: !selectedTextStyle },
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

      <div className="grid grid-cols-3 gap-1 mb-3 rounded-lg bg-gray-100 p-1 shrink-0">
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

      <div className="min-h-0 flex-1 overflow-hidden">
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

        {visibleActivePanel === 'edit' && (
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

            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{text.layout}</h2>
              <div className="grid grid-cols-2 gap-1.5">
                {LAYOUT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => updateLayout(option.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                      currentPage.layout === option.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                    }`}
                    aria-pressed={currentPage.layout === option.id}
                  >
                    <span className="text-xs text-center">{text.layoutLabels[option.id] ?? option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{text.pageManagement(pagesLength)}</h2>
                <button
                  onClick={onOpenOverview}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-2 py-1 rounded"
                  aria-label={text.overviewOpen}
                >
                  <LayoutGrid size={12} /> {text.overviewOpen}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                  <button
                    onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                    disabled={currentPageIndex === 0}
                    className="p-1.5 disabled:opacity-30 hover:bg-white rounded-md transition-colors shadow-sm bg-white"
                    aria-label={text.previousPage}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="font-medium text-sm">
                    {currentPageIndex + 1} <span className="text-gray-400 text-xs">/ {pagesLength}</span>
                  </span>
                  <button
                    onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
                    disabled={currentPageIndex === pagesLength - 1}
                    className="p-1.5 disabled:opacity-30 hover:bg-white rounded-md transition-colors shadow-sm bg-white"
                    aria-label={text.nextPage}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => movePage('up')}
                    disabled={currentPageIndex === 0}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors disabled:opacity-30 text-xs"
                    title={text.movePageForward}
                    aria-label={text.movePageForward}
                  >
                    <ArrowUp size={14} /> {text.movePageForward}
                  </button>
                  <button
                    onClick={() => movePage('down')}
                    disabled={currentPageIndex === pagesLength - 1}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors disabled:opacity-30 text-xs"
                    title={text.movePageBackward}
                    aria-label={text.movePageBackward}
                  >
                    <ArrowDown size={14} /> {text.movePageBackward}
                  </button>
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    onClick={addPage}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-900 hover:bg-black text-white rounded-lg transition-colors text-xs font-bold shadow-sm"
                    aria-label={text.addPage}
                  >
                    <Plus size={14} /> {text.addPage}
                  </button>
                  <button
                    onClick={onRequestDeletePage}
                    disabled={pagesLength <= 1}
                    className="flex items-center justify-center px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-30 border border-red-100"
                    title={text.deletePage}
                    aria-label={text.deletePage}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
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
