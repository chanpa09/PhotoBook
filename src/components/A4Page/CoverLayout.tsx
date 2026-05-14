import type { ChangeEvent, DragEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ImagePlus, Move } from 'lucide-react';
import { PageLabel, PhotoActions } from '@/components/A4PageParts';
import { useShallow } from 'zustand/react/shallow';
import { useProjectStore } from '@/store/useProjectStore';
import { resolveTextStyle, DEFAULT_COVER_TITLE_FONT_SIZE, DEFAULT_COVER_DATE_FONT_SIZE } from '@/utils/textStyle';
import type { AppText } from '@/i18n';
import type { PageData, Photo, ProjectSettings, TextTarget } from '@/types';

interface Props {
  page: PageData;
  pageIndex: number;
  settings: ProjectSettings;
  text: AppText;
  showPageLabel: boolean;
  dragActiveIndex: number | null;
  onTextSelect?: (target: TextTarget) => void;
  onTextBlur?: (nextFocusedElement: EventTarget | null) => void;
  onPhotoSelect?: (pageId: string, photoIndex: number, rect: DOMRect) => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>, index: number) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onPhotoPointerDown: (event: ReactPointerEvent<HTMLElement>, index: number) => void;
  onPhotoWheel: (event: React.WheelEvent<HTMLElement>, index: number) => void;
  onToggleFit: (index: number, currentPhoto: Photo) => void;
  onRemovePhoto: (index: number) => void;
  onZoomChange: (index: number, scale: number) => void;
}

export function CoverLayout({
  page,
  pageIndex,
  text,
  showPageLabel,
  dragActiveIndex,
  onTextSelect,
  onTextBlur,
  onPhotoSelect,
  onImageUpload,
  onDrop,
  onDragOver,
  onDragLeave,
  onPhotoPointerDown,
  onPhotoWheel,
  onToggleFit,
  onRemovePhoto,
  onZoomChange,
}: Props) {
  const { updatePageData } = useProjectStore(
    useShallow((state) => ({
      updatePageData: state.updatePageData,
    })),
  );
  const coverPhoto = page.photos[0];
  const coverTitleTextStyle = resolveTextStyle(
    page.coverTitle || '',
    page.coverTitleStyle,
    DEFAULT_COVER_TITLE_FONT_SIZE,
  );
  const coverDateTextStyle = resolveTextStyle(
    page.coverDate || '',
    page.coverDateStyle,
    DEFAULT_COVER_DATE_FONT_SIZE,
  );

  const handlePhotoClick = (event: React.MouseEvent) => {
    if (onPhotoSelect) {
      onPhotoSelect(page.id, 0, event.currentTarget.getBoundingClientRect());
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-10 mt-10">
      {showPageLabel && <PageLabel label={text.pageLabel(pageIndex + 1)} />}
      
      <input
        type="text"
        value={page.coverTitle || ''}
        onChange={(event) => updatePageData(page.id, { coverTitle: event.target.value })}
        onFocus={(e) => {
          onTextSelect?.({ type: 'coverTitle', pageId: page.id });
          onPhotoSelect?.(page.id, -1, e.target.getBoundingClientRect());
        }}
        onBlur={(event) => onTextBlur?.(event.relatedTarget)}
        placeholder={text.coverTitlePlaceholder}
        className="w-full text-center text-5xl font-bold mb-6 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent placeholder-gray-300"
        style={{ ...coverTitleTextStyle.style, color: page.coverTitleStyle?.color }}
        lang={coverTitleTextStyle.lang}
      />
      <input
        type="text"
        value={page.coverDate || ''}
        onChange={(event) => updatePageData(page.id, { coverDate: event.target.value })}
        onFocus={(e) => {
          onTextSelect?.({ type: 'coverDate', pageId: page.id });
          onPhotoSelect?.(page.id, -1, e.target.getBoundingClientRect());
        }}
        onBlur={(event) => onTextBlur?.(event.relatedTarget)}
        placeholder={text.coverDatePlaceholder}
        className="w-full text-center text-2xl text-gray-600 mb-12 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent placeholder-gray-300"
        style={{ ...coverDateTextStyle.style, color: page.coverDateStyle?.color }}
        lang={coverDateTextStyle.lang}
      />

      <div
        className={`w-full max-w-lg aspect-square relative rounded-xl overflow-hidden border-2 ${dragActiveIndex === 0 ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-300 bg-white/50'} flex flex-col items-center justify-center group shadow-md`}
        onDragOver={(event) => onDragOver(event, 0)}
        onDragLeave={onDragLeave}
        onDrop={(event) => onDrop(event, 0)}
      >
        {coverPhoto ? (
          <>
            <div 
              className="w-full h-full relative overflow-hidden flex items-center justify-center cursor-move touch-none"
              onPointerDown={(event) => onPhotoPointerDown(event, 0)}
              onWheel={(event) => onPhotoWheel(event, 0)}
              onClick={handlePhotoClick}
            >
              <img
                src={coverPhoto.url}
                alt={text.coverPhotoAlt}
                draggable={false}
                data-photo-index={0}
                data-page-id={page.id}
                className="w-full h-full max-w-none transition-transform duration-75 ease-out"
                style={{
                  objectFit: coverPhoto.fit === 'contain' ? 'contain' : 'cover',
                  objectPosition: `calc(50% + ${coverPhoto.offset?.x || 0}px) calc(50% + ${coverPhoto.offset?.y || 0}px)`,
                  transform: `scale(${coverPhoto.scale || 1})`,
                  filter: coverPhoto.filter,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity">
                <Move className="text-white" size={48} />
              </div>
            </div>
            {!onPhotoSelect && (
              <PhotoActions
                photo={coverPhoto}
                fillLabel={text.photoFill}
                containLabel={text.photoContain}
                removeLabel={text.photoRemove}
                onToggleFit={() => onToggleFit(0, coverPhoto)}
                onRemove={() => onRemovePhoto(0)}
                onZoomChange={(scale) => onZoomChange(0, scale)}
              />
            )}
          </>
        ) : (
          <label className="absolute inset-0 w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
            <input type="file" accept="image/*" onChange={(event) => onImageUpload(event, 0)} className="hidden" />
            <ImagePlus className="text-gray-400 mb-2" size={40} />
            <span className="text-gray-500 font-medium">{text.coverPhotoDropLabel}</span>
          </label>
        )}
      </div>
    </div>
  );
}
