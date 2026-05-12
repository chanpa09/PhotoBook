import { useEffect, useRef, useState } from 'react';
import {
  Palette, Type, ChevronDown, Check,
  Maximize, Minimize, Trash2, SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import type { TextStyle, Photo } from '@/types';
import type { AppText } from '@/i18n';
import { FONT_OPTIONS } from '@/utils/textStyle';
import { PHOTO_FILTERS } from '@/constants';

interface Props {
  type: 'text' | 'photo';
  rect: DOMRect;
  style?: TextStyle;
  photo?: Photo;
  onStyleChange?: (updates: Partial<TextStyle>) => void;
  onPhotoChange?: (updates: Partial<Photo> | null) => void;
  onClose?: () => void;
  text: AppText;
}

const COLORS = [
  '#000000', '#4B5563', '#9CA3AF', '#FFFFFF',
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#6366F1', '#8B5CF6', '#EC4899', '#D97706'
];

type FontOptionKey = keyof AppText['fontOptions'];
type FilterOptionKey = keyof AppText['filterOptions'];

const getFontOptionLabel = (text: AppText, labelKey: FontOptionKey) =>
  text.fontOptions[labelKey];

const getFilterOptionLabel = (text: AppText, labelKey: FilterOptionKey) =>
  text.filterOptions[labelKey];

export function FloatingToolbar({
  type,
  rect,
  style,
  photo,
  onStyleChange,
  onPhotoChange,
  onClose,
  text,
}: Props) {
  const [activeMenu, setActivePanel] = useState<'main' | 'font' | 'color' | 'filter' | 'zoom'>('main');
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Position logic: prefer top, fallback to bottom
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!toolbarRef.current) return;
    const toolbarRect = toolbarRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    let top = rect.top - toolbarRect.height - 12;
    if (top < 60) {
      top = rect.bottom + 12;
    }

    let left = rect.left + (rect.width - toolbarRect.width) / 2;
    left = Math.max(12, Math.min(viewportWidth - toolbarRect.width - 12, left));

    setPosition({ top, left });
  }, [rect, type, activeMenu]);

  const handleRemove = () => {
    if (type === 'photo' && onPhotoChange) {
      onPhotoChange(null);
    }
    onClose?.();
  };

  return (
    <div
      ref={toolbarRef}
      data-floating-toolbar
      className="fixed z-[100] flex flex-col items-stretch overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in zoom-in-95"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: activeMenu === 'main' ? 'auto' : '220px',
      }}
    >
      {activeMenu === 'main' ? (
        <div className="flex h-10 items-center divide-x divide-gray-100 p-1">
          {type === 'text' && (
            <>
              <button
                onClick={() => setActivePanel('font')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                title={text.font}
              >
                <Type size={14} />
                <span className="max-w-[80px] truncate">
                  {FONT_OPTIONS.find(f => f.fontFamily === style?.fontFamily)?.labelKey 
                    ? getFontOptionLabel(text, FONT_OPTIONS.find(f => f.fontFamily === style?.fontFamily)!.labelKey as FontOptionKey)
                    : text.fontOptions.auto}
                </span>
                <ChevronDown size={12} className="text-gray-400" />
              </button>

              <button
                onClick={() => setActivePanel('color')}
                className="flex items-center justify-center px-3 py-1.5 hover:bg-gray-50 rounded-lg transition-colors"
                title={text.textColor}
              >
                <div 
                  className="h-4 w-4 rounded-full border border-gray-200 shadow-sm"
                  style={{ backgroundColor: style?.color || '#000000' }}
                />
              </button>

              <div className="flex items-center px-1">
                <input
                  type="number"
                  value={style?.fontSize || 16}
                  onChange={(e) => onStyleChange?.({ fontSize: parseInt(e.target.value) })}
                  className="w-10 bg-transparent text-center text-xs font-bold text-gray-700 focus:outline-none"
                />
              </div>
            </>
          )}

          {type === 'photo' && photo && (
            <>
              <button
                onClick={() => onPhotoChange?.({ fit: photo.fit === 'cover' ? 'contain' : 'cover' })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {photo.fit === 'cover' ? <Minimize size={14} /> : <Maximize size={14} />}
                <span>{photo.fit === 'cover' ? text.photoContain : text.photoFill}</span>
              </button>

              <button
                onClick={() => setActivePanel('filter')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                title={text.photoFilters}
              >
                <Palette size={14} />
                <span className="max-w-[80px] truncate">
                  {photo.filter ? (PHOTO_FILTERS.find(f => f.css === photo.filter)?.labelKey 
                    ? getFilterOptionLabel(text, PHOTO_FILTERS.find(f => f.css === photo.filter)!.labelKey)
                    : 'Custom') : text.filterOptions.none}
                </span>
                <ChevronDown size={12} className="text-gray-400" />
              </button>

              <button
                onClick={() => setActivePanel('zoom')}
                className="flex items-center justify-center px-3 py-1.5 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <SlidersHorizontal size={14} className="text-gray-700" />
              </button>
            </>
          )}

          <div className="flex items-center px-1">
            <button
              onClick={handleRemove}
              className="flex items-center justify-center p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title={text.photoRemove}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col animate-in slide-in-from-right-2 duration-200">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {activeMenu === 'font' && text.font}
              {activeMenu === 'color' && text.textColor}
              {activeMenu === 'filter' && text.photoFilters}
              {activeMenu === 'zoom' && 'Zoom'}
            </span>
            <button 
              onClick={() => setActivePanel('main')}
              className="rounded p-1 hover:bg-gray-200"
            >
              <ChevronRight size={12} className="rotate-180" />
            </button>
          </div>

          <div className="max-h-[240px] overflow-y-auto p-1.5">
            {activeMenu === 'font' && FONT_OPTIONS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  onStyleChange?.({ fontMode: 'manual', fontFamily: f.fontFamily });
                  setActivePanel('main');
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                style={{ fontFamily: f.fontFamily }}
              >
                <span>{getFontOptionLabel(text, f.labelKey as FontOptionKey)}</span>
                {style?.fontFamily === f.fontFamily && <Check size={12} className="text-blue-500" />}
              </button>
            ))}

            {activeMenu === 'color' && (
              <div className="grid grid-cols-4 gap-2 p-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onStyleChange?.({ color: c });
                      setActivePanel('main');
                    }}
                    className="group relative flex aspect-square items-center justify-center rounded-full border border-gray-100 shadow-sm transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  >
                    {style?.color === c && <Check size={12} className={c === '#FFFFFF' ? 'text-gray-900' : 'text-white'} />}
                  </button>
                ))}
              </div>
            )}

            {activeMenu === 'filter' && PHOTO_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  onPhotoChange?.({ filter: f.css });
                  setActivePanel('main');
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>{getFilterOptionLabel(text, f.labelKey)}</span>
                {photo?.filter === f.css && <Check size={12} className="text-blue-500" />}
              </button>
            ))}

            {activeMenu === 'zoom' && (
              <div className="flex flex-col gap-2 p-2">
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={photo?.scale || 1}
                  onChange={(e) => onPhotoChange?.({ scale: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-400">
                  <span>1x</span>
                  <span>{photo?.scale?.toFixed(1)}x</span>
                  <span>3x</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
