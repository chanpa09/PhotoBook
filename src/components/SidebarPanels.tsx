import type { ChangeEvent, RefObject } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { VirtualItem } from '@tanstack/react-virtual';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Loader2,
  Palette,
  Plus,
  Save,
  Upload,
} from 'lucide-react';

import { BACKGROUND_COLORS, BODY_PAGE_COUNT_OPTIONS } from '@/constants';
import type { AppText } from '@/i18n';
import type { FrameLayoutDefinition, LayoutType, PageData, ProjectSettings, StampAsset, TextStyle, TextTarget } from '@/types';
import { getFrameLayout } from '@/utils/layout';
import { FONT_OPTIONS, LANGUAGE_OPTIONS } from '@/utils/textStyle';
import { PROJECT_ARCHIVE_ACCEPT } from '@/utils/projectArchive';
import { serializeStampDragData, STAMP_DRAG_MIME_TYPE } from '@/utils/stamps';

type LayoutFilter = 'page' | 'all' | 'onePage' | 'twoPage' | 'cover' | 'title' | 'colophon';
type StampStatus = 'idle' | 'loading' | 'ready' | 'error';

function DraggableStamp({ stamp }: { stamp: StampAsset }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `stamp-${stamp.id}`,
    data: {
      type: 'stamp',
      stamp,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData(STAMP_DRAG_MIME_TYPE, serializeStampDragData(stamp));
      }}
      className="flex aspect-square cursor-grab items-center justify-center rounded-lg border border-gray-200 bg-white p-2 transition-colors hover:border-blue-300 hover:bg-blue-50 active:cursor-grabbing"
      style={style}
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
  );
}

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

interface TextPanelProps {
  text: AppText;
  selectedTextStyle: { target: TextTarget; style: Required<TextStyle> } | null;
  selectedFontOption: string;
  selectedLanguageOption: string;
  fontOptionLabel: (id: string) => string;
  languageOptionLabel: (id: string) => string;
  updateFontSize: (value: string) => void;
  onTextStyleChange: (updates: TextStyle) => void;
}

export function TextPanel({
  text,
  selectedTextStyle,
  selectedFontOption,
  selectedLanguageOption,
  fontOptionLabel,
  languageOptionLabel,
  updateFontSize,
  onTextStyleChange,
}: TextPanelProps) {
  return (
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
  );
}

interface PagePanelProps {
  text: AppText;
  settings: ProjectSettings;
  pagesLength: number;
  bodyPageCount: number;
  canMoveSpreadUp: boolean;
  canMoveSpreadDown: boolean;
  setSettings: (settings: ProjectSettings) => void;
  setBodyPageCount: (count: number) => void;
  movePage: (direction: 'up' | 'down') => void;
}

export function PagePanel({
  text,
  settings,
  pagesLength,
  bodyPageCount,
  canMoveSpreadUp,
  canMoveSpreadDown,
  setSettings,
  setBodyPageCount,
  movePage,
}: PagePanelProps) {
  return (
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
  );
}

interface LayoutPanelProps {
  text: AppText;
  importedLayoutStatus: 'idle' | 'loading' | 'ready' | 'error';
  loadImportedLayouts: () => Promise<void>;
  filteredImportedLayouts: FrameLayoutDefinition[];
  layoutFilterOptions: { id: LayoutFilter; label: string }[];
  activeLayoutFilter: LayoutFilter;
  setLayoutFilter: (filter: LayoutFilter) => void;
  layoutVirtualItems: VirtualItem[];
  layoutCols: number;
  currentPage: PageData;
  isCoverPage: boolean;
  updateLayout: (layout: LayoutType) => void;
}

export function LayoutPanel({
  text,
  importedLayoutStatus,
  loadImportedLayouts,
  filteredImportedLayouts,
  layoutFilterOptions,
  activeLayoutFilter,
  setLayoutFilter,
  layoutVirtualItems,
  layoutCols,
  currentPage,
  isCoverPage,
  updateLayout,
}: LayoutPanelProps) {
  return (
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

        <div
          className="relative w-full"
          style={{ height: `${Math.ceil(filteredImportedLayouts.length / layoutCols) * 140}px` }}
        >
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

          {layoutVirtualItems.map((virtualRow) => {
            const startIndex = virtualRow.index * layoutCols;
            const rowLayouts = filteredImportedLayouts.slice(startIndex, startIndex + layoutCols);

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="grid grid-cols-2 gap-1.5 pb-1.5"
              >
                {rowLayouts.map((layout) => {
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
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface StampPanelProps {
  text: AppText;
  stampStatus: StampStatus;
  filteredStampAssets: StampAsset[];
  stampVirtualItems: VirtualItem[];
  stampCols: number;
  retryLoadStamps: () => void;
}

export function StampPanel({
  text,
  stampStatus,
  filteredStampAssets,
  stampVirtualItems,
  stampCols,
  retryLoadStamps,
}: StampPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 -mx-1 border-b border-gray-100 bg-white/95 px-1 pb-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{text.stampPanelTitle}</h2>
          <span className="text-[10px] font-bold text-gray-400">
            {text.stampResultCount(filteredStampAssets.length)}
          </span>
        </div>
      </div>

      <div className="relative w-full" style={{ height: `${Math.ceil(filteredStampAssets.length / stampCols) * 80}px` }}>
        {stampStatus === 'loading' && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-3 text-xs font-medium text-gray-500">
            <Loader2 size={14} className="animate-spin" />
            {text.stampLoading}
          </div>
        )}

        {stampStatus === 'error' && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
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
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-500">
            {text.stampEmpty}
          </div>
        )}

        {stampStatus === 'ready' && stampVirtualItems.map((virtualRow) => {
          const startIndex = virtualRow.index * stampCols;
          const rowStamps = filteredStampAssets.slice(startIndex, startIndex + stampCols);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-3 gap-2 pb-2"
            >
              {rowStamps.map((stamp) => (
                <DraggableStamp key={stamp.id} stamp={stamp} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ExportPanelProps {
  text: AppText;
  settings: ProjectSettings;
  isExporting: boolean;
  isProjectFileBusy: boolean;
  projectFileInputRef: RefObject<HTMLInputElement | null>;
  setSettings: (settings: ProjectSettings) => void;
  handleSaveProjectFile: () => Promise<void>;
  handleProjectFileSelect: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onExport: (format: 'png' | 'jpeg') => void;
}

export function ExportPanel({
  text,
  settings,
  isExporting,
  isProjectFileBusy,
  projectFileInputRef,
  setSettings,
  handleSaveProjectFile,
  handleProjectFileSelect,
  onExport,
}: ExportPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{text.projectFile}</h2>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleSaveProjectFile()}
            disabled={isProjectFileBusy}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium shadow-sm text-sm disabled:opacity-50"
            aria-label={text.projectFileSave}
          >
            {isProjectFileBusy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {text.projectFileSave}
          </button>
          <input
            ref={projectFileInputRef}
            type="file"
            accept={PROJECT_ARCHIVE_ACCEPT}
            onChange={(event) => void handleProjectFileSelect(event)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => projectFileInputRef.current?.click()}
            disabled={isProjectFileBusy}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
            aria-label={text.projectFileLoad}
          >
            {isProjectFileBusy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {text.projectFileLoad}
          </button>
        </div>
      </div>

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
  );
}
