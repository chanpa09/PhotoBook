import { type CSSProperties } from 'react';
import type { ChangeEvent, DragEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Move } from 'lucide-react';
import { EmptyPhotoSlot, PageLabel, PhotoActions } from '@/components/A4PageParts';
import { useShallow } from 'zustand/react/shallow';
import { useProjectStore } from '@/store/useProjectStore';
import { 
  getGridClass, 
  getFrameLayout, 
  getDisplayFrameLayout, 
  getDisplayPhotoFrameImageStyle 
} from '../../utils/layout';
import { resolveTextStyle, DEFAULT_LAYOUT_TEXT_FONT_SIZE, DEFAULT_CAPTION_FONT_SIZE } from '@/utils/textStyle';
import type { AppText } from '@/i18n';
import type { PageData, Photo, ProjectSettings, TextTarget } from '@/types';
import type { DisplayFrameLayout, DisplayPhotoFrame } from '@/utils/layout';

interface Props {
  page: PageData;
  pageIndex: number;
  settings: ProjectSettings;
  text: AppText;
  showPageLabel: boolean;
  dragActiveIndex: number | null;
  onTextSelect?: (target: TextTarget) => void;
  onTextBlur?: (nextFocusedElement: EventTarget | null) => void;
  onPhotoSelect?: (pageId: string, index: number, rect: DOMRect) => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>, index: number) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onPhotoPointerDown: (event: ReactPointerEvent<HTMLElement>, index: number) => void;
  onToggleFit: (index: number, currentPhoto: Photo) => void;
  onRemovePhoto: (index: number) => void;
  onZoomChange: (index: number, scale: number) => void;
}

const getSlotCount = (layout: string) => {
  if (layout === '1') return 1;
  if (layout === '2-row' || layout === '2-col') return 2;
  if (layout === '3-row' || layout === '3-top') return 3;
  if (layout === '4-grid' || layout === '4-top') return 4;
  if (layout === '5-grid') return 5;
  if (layout === '6-grid') return 6;
  return 0;
};

interface DroppableFrameSlotProps {
  page: PageData;
  frame: DisplayPhotoFrame;
  displayFrameLayout: DisplayFrameLayout;
  text: AppText;
  onDragOver: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onPhotoPointerDown: (event: ReactPointerEvent<HTMLElement>, index: number) => void;
  onPhotoSelect?: (pageId: string, index: number, rect: DOMRect) => void;
  onToggleFit: (index: number, currentPhoto: Photo) => void;
  onRemovePhoto: (index: number) => void;
  onZoomChange: (index: number, scale: number) => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>, index: number) => void;
}

function DroppableFrameSlot({
  page,
  frame,
  displayFrameLayout,
  text,
  onDragOver,
  onDragLeave,
  onDrop,
  onPhotoPointerDown,
  onPhotoSelect,
  onToggleFit,
  onRemovePhoto,
  onZoomChange,
  onImageUpload,
}: DroppableFrameSlotProps) {
  const slotIndex = frame.slotIndex;
  const photo = page.photos[slotIndex];
  
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${page.id}-${slotIndex}`,
    data: {
      type: 'photo-slot',
      pageId: page.id,
      slotIndex,
    },
  });

  const handlePhotoClick = (event: React.MouseEvent, index: number) => {
    if (onPhotoSelect) {
      onPhotoSelect(page.id, index, event.currentTarget.getBoundingClientRect());
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`absolute group transition-colors ${isOver ? 'bg-blue-100/50' : ''}`}
      style={{
        left: `${(frame.x / displayFrameLayout.sourceWidth) * 100}%`,
        top: `${(frame.y / displayFrameLayout.sourceHeight) * 100}%`,
        width: `${(frame.width / displayFrameLayout.sourceWidth) * 100}%`,
        height: `${(frame.height / displayFrameLayout.sourceHeight) * 100}%`,
      }}
      onDragOver={(event) => onDragOver(event, slotIndex)}
      onDragLeave={onDragLeave}
      onDrop={(event) => onDrop(event, slotIndex)}
    >
      {photo ? (
        <div className="w-full h-full relative overflow-hidden bg-black/5 flex items-center justify-center border border-gray-100 cursor-move touch-none"
          onPointerDown={(event) => onPhotoPointerDown(event, slotIndex)}
          onClick={(e) => handlePhotoClick(e, slotIndex)}
        >
          <div
            className="absolute"
            style={getDisplayPhotoFrameImageStyle(frame)}
          >
            <img
              src={photo.url}
              alt={text.photoAlt(slotIndex + 1)}
              draggable={false}
              data-photo-index={slotIndex}
              data-page-id={page.id}
              className="w-full h-full max-w-none transition-transform duration-75 ease-out"
              style={{
                objectFit: photo.fit === 'contain' ? 'contain' : 'cover',
                objectPosition: `calc(50% + ${photo.offset?.x || 0}px) calc(50% + ${photo.offset?.y || 0}px)`,
                transform: `scale(${photo.scale || 1})`,
                filter: photo.filter,
              }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity">
            <Move className="text-black" size={32} />
          </div>
          {!onPhotoSelect && (
            <PhotoActions
              photo={photo}
              fillLabel={text.photoFill}
              containLabel={text.photoContain}
              removeLabel={text.photoRemove}
              onToggleFit={() => onToggleFit(slotIndex, photo)}
              onRemove={() => onRemovePhoto(slotIndex)}
              onZoomChange={(scale) => onZoomChange(slotIndex, scale)}
            />
          )}
        </div>
      ) : (
        <div className="w-full h-full flex">
          <EmptyPhotoSlot
            isDragging={isOver}
            label={text.photoSlotLabel}
            dropLabel={text.photoDropLabel}
            onUpload={(event) => onImageUpload(event, slotIndex)}
          />
        </div>
      )}
    </div>
  );
}

interface DroppableGridSlotProps {
  page: PageData;
  slotIndex: number;
  text: AppText;
  onDragOver: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onPhotoPointerDown: (event: ReactPointerEvent<HTMLElement>, index: number) => void;
  onPhotoSelect?: (pageId: string, index: number, rect: DOMRect) => void;
  onToggleFit: (index: number, currentPhoto: Photo) => void;
  onRemovePhoto: (index: number) => void;
  onZoomChange: (index: number, scale: number) => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>, index: number) => void;
  onTextSelect?: (target: TextTarget) => void;
  onTextBlur?: (nextFocusedElement: EventTarget | null) => void;
  handleCaptionChange: (event: ChangeEvent<HTMLInputElement>, index: number, currentPhoto: Photo) => void;
}

function DroppableGridSlot({
  page,
  slotIndex,
  text,
  onDragOver,
  onDragLeave,
  onDrop,
  onPhotoPointerDown,
  onPhotoSelect,
  onToggleFit,
  onRemovePhoto,
  onZoomChange,
  onImageUpload,
  onTextSelect,
  onTextBlur,
  handleCaptionChange,
}: DroppableGridSlotProps) {
  const photo = page.photos[slotIndex];
  
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${page.id}-${slotIndex}`,
    data: {
      type: 'photo-slot',
      pageId: page.id,
      slotIndex,
    },
  });

  const captionTextStyle = photo
    ? resolveTextStyle(photo.caption, photo.captionStyle, DEFAULT_CAPTION_FONT_SIZE)
    : null;

  const handlePhotoClick = (event: React.MouseEvent, index: number) => {
    if (onPhotoSelect) {
      onPhotoSelect(page.id, index, event.currentTarget.getBoundingClientRect());
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col items-center justify-center w-full h-full min-h-0 min-w-0 group transition-colors ${isOver ? 'bg-blue-100/50' : ''}`}
      onDragOver={(event) => onDragOver(event, slotIndex)}
      onDragLeave={onDragLeave}
      onDrop={(event) => onDrop(event, slotIndex)}
    >
      {photo ? (
        <div className="w-full h-full flex flex-col relative min-h-0">
          <div className="flex-1 min-h-0 w-full relative overflow-hidden bg-black/5 flex items-center justify-center border border-gray-100 rounded-md cursor-move touch-none"
            onPointerDown={(event) => onPhotoPointerDown(event, slotIndex)}
            onClick={(e) => handlePhotoClick(e, slotIndex)}
          >
            <img
              src={photo.url}
              alt={text.photoAlt(slotIndex + 1)}
              draggable={false}
              data-photo-index={slotIndex}
              data-page-id={page.id}
              className="w-full h-full max-w-none transition-transform duration-75 ease-out"
              style={{
                objectFit: photo.fit === 'contain' ? 'contain' : 'cover',
                objectPosition: `calc(50% + ${photo.offset?.x || 0}px) calc(50% + ${photo.offset?.y || 0}px)`,
                transform: `scale(${photo.scale || 1})`,
                filter: photo.filter,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity">
              <Move className="text-black" size={32} />
            </div>
            {!onPhotoSelect && (
              <PhotoActions
                photo={photo}
                fillLabel={text.photoFill}
                containLabel={text.photoContain}
                removeLabel={text.photoRemove}
                onToggleFit={() => onToggleFit(slotIndex, photo)}
                onRemove={() => onRemovePhoto(slotIndex)}
                onZoomChange={(scale) => onZoomChange(slotIndex, scale)}
              />
            )}
          </div>
          <div className="mt-3 w-full shrink-0">
            <input
              type="text"
              value={photo.caption}
              onChange={(event) => handleCaptionChange(event, slotIndex, photo)}
              onFocus={(e) => {
                onTextSelect?.({ type: 'caption', pageId: page.id, photoIndex: slotIndex });
                onPhotoSelect?.(page.id, -1, e.target.getBoundingClientRect());
              }}
              onBlur={(event) => onTextBlur?.(event.relatedTarget)}
              placeholder={text.photoCaptionPlaceholder}
              className="w-full border-b border-transparent bg-transparent p-1 text-center text-lg text-gray-700 transition-colors placeholder-gray-400 hover:border-gray-300 focus:border-blue-500 focus:outline-none"
              style={{ ...captionTextStyle?.style, color: photo.captionStyle?.color }}
              lang={captionTextStyle?.lang}
            />
          </div>
        </div>
      ) : (
        <EmptyPhotoSlot
          isDragging={isOver}
          label={text.photoSlotLabel}
          dropLabel={text.photoDropLabel}
          onUpload={(event) => onImageUpload(event, slotIndex)}
        />
      )}
    </div>
  );
}

export function StandardLayout({
  page,
  pageIndex,
  text,
  showPageLabel,
  onTextSelect,
  onTextBlur,
  onPhotoSelect,
  onImageUpload,
  onDrop,
  onDragOver,
  onDragLeave,
  onPhotoPointerDown,
  onToggleFit,
  onRemovePhoto,
  onZoomChange,
}: Props) {
  const { updateLayoutText, updatePhoto } = useProjectStore(
    useShallow((state) => ({
      updateLayoutText: state.updateLayoutText,
      updatePhoto: state.updatePhoto,
    })),
  );
  const slots = Array.from({ length: getSlotCount(page.layout) }, (_, index) => index);
  const frameLayout = getFrameLayout(page.layout);
  const displayFrameLayout = frameLayout ? getDisplayFrameLayout(frameLayout, page.spreadSide) : null;

  const handleCaptionChange = (event: ChangeEvent<HTMLInputElement>, index: number, currentPhoto: Photo) => {
    updatePhoto(page.id, index, { ...currentPhoto, caption: event.target.value });
  };

  const getLayoutTextPlaceholder = (textType?: string) => {
    if (textType === 'title') return text.layoutTextPlaceholders.title;
    if (textType === 'subtitle') return text.layoutTextPlaceholders.subtitle;
    if (textType === 'message') return text.layoutTextPlaceholders.message;
    return text.layoutTextPlaceholders.default;
  };

  if (displayFrameLayout) {
    return (
      <div className="absolute inset-0">
        {showPageLabel && <PageLabel label={text.pageLabel(pageIndex + 1)} />}
        {displayFrameLayout.textFrames.map((frame) => {
          const layoutText = page.layoutTexts?.[frame.slotIndex];
          const resolvedLayoutTextStyle = resolveTextStyle(
            layoutText?.value ?? '',
            layoutText?.style,
            DEFAULT_LAYOUT_TEXT_FONT_SIZE,
          );
          const textareaStyle: CSSProperties = {
            left: `${(frame.x / displayFrameLayout.sourceWidth) * 100}%`,
            top: `${(frame.y / displayFrameLayout.sourceHeight) * 100}%`,
            width: `${(frame.width / displayFrameLayout.sourceWidth) * 100}%`,
            height: `${(frame.height / displayFrameLayout.sourceHeight) * 100}%`,
            ...resolvedLayoutTextStyle.style,
            color: layoutText?.style?.color,
            writingMode: frame.isVertical ? 'vertical-rl' : undefined,
            textOrientation: frame.isVertical ? 'mixed' : undefined,
          };

          return (
            <textarea
              key={`text-${frame.slotIndex}`}
              value={layoutText?.value ?? ''}
              onChange={(event) => updateLayoutText(page.id, frame.slotIndex, { value: event.target.value })}
              onFocus={(e) => {
                onTextSelect?.({ type: 'layoutText', pageId: page.id, textIndex: frame.slotIndex });
                onPhotoSelect?.(page.id, -1, e.target.getBoundingClientRect());
              }}
              onBlur={(event) => onTextBlur?.(event.relatedTarget)}
              placeholder={getLayoutTextPlaceholder(frame.textType)}
              className="absolute z-10 resize-none overflow-hidden border border-transparent bg-transparent p-1 leading-tight text-gray-900 outline-none transition-colors placeholder-gray-300 hover:border-gray-300 focus:border-blue-500 focus:bg-white/20"
              style={textareaStyle}
              lang={resolvedLayoutTextStyle.lang}
            />
          );
        })}

        {displayFrameLayout.frames.map((frame) => (
          <DroppableFrameSlot
            key={frame.slotIndex}
            page={page}
            frame={frame}
            displayFrameLayout={displayFrameLayout}
            text={text}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onPhotoPointerDown={onPhotoPointerDown}
            onPhotoSelect={onPhotoSelect}
            onToggleFit={onToggleFit}
            onRemovePhoto={onRemovePhoto}
            onZoomChange={onZoomChange}
            onImageUpload={onImageUpload}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`w-full h-full grid gap-6 ${getGridClass(page.layout)}`} style={{ padding: '40px' }}>
      {showPageLabel && <PageLabel label={text.pageLabel(pageIndex + 1)} />}
      {slots.map((slotIndex) => (
        <DroppableGridSlot
          key={slotIndex}
          page={page}
          slotIndex={slotIndex}
          text={text}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onPhotoPointerDown={onPhotoPointerDown}
          onPhotoSelect={onPhotoSelect}
          onToggleFit={onToggleFit}
          onRemovePhoto={onRemovePhoto}
          onZoomChange={onZoomChange}
          onImageUpload={onImageUpload}
          onTextSelect={onTextSelect}
          onTextBlur={onTextBlur}
          handleCaptionChange={handleCaptionChange}
        />
      ))}
    </div>
  );
}
