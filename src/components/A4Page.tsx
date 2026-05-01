import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent, DragEvent, RefObject } from 'react';
import { ImagePlus, Move } from 'lucide-react';
import { EmptyPhotoSlot, PageLabel, PhotoActions } from './A4PageParts';
import type { AppText } from '../i18n';
import { useProjectStore } from '../store/useProjectStore';
import { saveImage, createObjectUrlFromBlob } from '../utils/imageStore';
import { resizeImage, DEFAULT_IMAGE_MAX_RESOLUTION } from '../utils/imageResize';
import { getGridClass, getSlotCount } from '../utils/layout';
import type { TextTarget } from '../utils/textStyle';
import {
  DEFAULT_CAPTION_FONT_SIZE,
  DEFAULT_COVER_DATE_FONT_SIZE,
  DEFAULT_COVER_TITLE_FONT_SIZE,
  resolveTextStyle,
} from '../utils/textStyle';
import type { Photo, ProjectSettings, PageData } from '../types';

interface Props {
  page: PageData;
  pageIndex: number;
  settings: ProjectSettings;
  text: AppText;
  targetRef?: RefObject<HTMLDivElement | null>;
  showPageLabel?: boolean;
  onError?: (message: string) => void;
  onTextSelect?: (target: TextTarget) => void;
  onTextBlur?: (nextFocusedElement: EventTarget | null) => void;
}

export function A4Page({
  page,
  pageIndex,
  settings,
  text,
  targetRef,
  showPageLabel = true,
  onError,
  onTextSelect,
  onTextBlur,
}: Props) {
  const { updatePhoto, updatePageData, updatePhotoTransform } = useProjectStore();
  const [dragActiveIndex, setDragActiveIndex] = useState<number | null>(null);
  
  // Drag to pan state
  const isDraggingPhoto = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const activePhotoIndex = useRef<number | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const photosRef = useRef(page.photos);
  photosRef.current = page.photos;

  const slots = Array.from({ length: getSlotCount(page.layout) }, (_, index) => index);

  const processFile = async (file: File, index: number) => {
    if (!file.type.startsWith('image/')) return;

    try {
      const imageId = crypto.randomUUID();
      const maxRes = settings.imageMaxResolution ?? DEFAULT_IMAGE_MAX_RESOLUTION;
      const resized = await resizeImage(file, maxRes);
      await saveImage(imageId, resized);
      const url = createObjectUrlFromBlob(resized, imageId);
      updatePhoto(page.id, index, {
        id: crypto.randomUUID(),
        imageId,
        url,
        caption: '',
        fit: 'contain',
        scale: 1,
        offset: { x: 0, y: 0 },
      });
    } catch (error) {
      console.error('Failed to load image', error);
      onError?.(text.imageLoadError);
    }
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file, index);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActiveIndex(null);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file, index);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    if (dragActiveIndex !== index) {
      setDragActiveIndex(index);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActiveIndex(null);
  };

  const handleCaptionChange = (event: ChangeEvent<HTMLInputElement>, index: number, currentPhoto?: Photo) => {
    if (currentPhoto) {
      updatePhoto(page.id, index, { ...currentPhoto, caption: event.target.value });
    }
  };

  const handleRemovePhoto = (index: number) => {
    updatePhoto(page.id, index, null);
  };

  const handleToggleFit = (index: number, currentPhoto: Photo) => {
    const newFit = currentPhoto.fit === 'cover' ? 'contain' : 'cover';
    updatePhoto(page.id, index, { ...currentPhoto, fit: newFit, scale: 1, offset: { x: 0, y: 0 } });
  };

  const handleZoomChange = (index: number, scale: number) => {
    updatePhotoTransform(page.id, index, { scale });
  };

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    const photo = page.photos[index];
    if (!photo) return;
    isDraggingPhoto.current = true;
    activePhotoIndex.current = index;
    lastPos.current = { x: e.clientX, y: e.clientY };
    dragOffset.current = { x: photo.offset?.x || 0, y: photo.offset?.y || 0 };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingPhoto.current || activePhotoIndex.current === null) return;
      
      const photo = photosRef.current[activePhotoIndex.current];
      if (!photo) return;

      const deltaX = e.clientX - lastPos.current.x;
      const deltaY = e.clientY - lastPos.current.y;
      const currentScale = photo.scale || 1;

      dragOffset.current = {
        x: dragOffset.current.x + deltaX / currentScale,
        y: dragOffset.current.y + deltaY / currentScale,
      };
      
      lastPos.current = { x: e.clientX, y: e.clientY };

      // Update DOM directly for smooth visual feedback without triggering store updates
      const imgElements = document.querySelectorAll(`[data-photo-index="${activePhotoIndex.current}"][data-page-id="${page.id}"]`);
      imgElements.forEach((img) => {
        if (img instanceof HTMLImageElement) {
          img.style.objectPosition = `calc(50% + ${dragOffset.current.x}px) calc(50% + ${dragOffset.current.y}px)`;
        }
      });
    };

    const handleMouseUp = () => {
      if (isDraggingPhoto.current && activePhotoIndex.current !== null) {
        // Commit the final offset to the store (single undo step)
        updatePhotoTransform(page.id, activePhotoIndex.current, {
          offset: { ...dragOffset.current },
        });
      }
      isDraggingPhoto.current = false;
      activePhotoIndex.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [page.id, updatePhotoTransform]);

  if (page.layout === 'cover') {
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

    return (
      <div
        ref={targetRef}
        className="shadow-xl relative flex flex-col items-center justify-center transition-colors overflow-hidden"
        style={{ width: '794px', height: '1123px', padding: '40px', backgroundColor: settings.backgroundColor }}
      >
        {showPageLabel && <PageLabel label={text.pageLabel(pageIndex + 1)} />}

        <div className="w-full flex-1 flex flex-col items-center justify-center p-10 mt-10">
          <input
            type="text"
            value={page.coverTitle || ''}
            onChange={(event) => updatePageData(page.id, { coverTitle: event.target.value })}
            onFocus={() => onTextSelect?.({ type: 'coverTitle', pageId: page.id })}
            onBlur={(event) => onTextBlur?.(event.relatedTarget)}
            placeholder={text.coverTitlePlaceholder}
            className="w-full text-center text-5xl font-bold mb-6 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent placeholder-gray-300"
            style={coverTitleTextStyle.style}
            lang={coverTitleTextStyle.lang}
          />
          <input
            type="text"
            value={page.coverDate || ''}
            onChange={(event) => updatePageData(page.id, { coverDate: event.target.value })}
            onFocus={() => onTextSelect?.({ type: 'coverDate', pageId: page.id })}
            onBlur={(event) => onTextBlur?.(event.relatedTarget)}
            placeholder={text.coverDatePlaceholder}
            className="w-full text-center text-2xl text-gray-600 mb-12 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent placeholder-gray-300"
            style={coverDateTextStyle.style}
            lang={coverDateTextStyle.lang}
          />

          <div
            className={`w-full max-w-lg aspect-square relative rounded-xl overflow-hidden border-2 ${dragActiveIndex === 0 ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-300 bg-white/50'} flex flex-col items-center justify-center group shadow-md`}
            onDragOver={(event) => handleDragOver(event, 0)}
            onDragLeave={handleDragLeave}
            onDrop={(event) => handleDrop(event, 0)}
          >
            {coverPhoto ? (
              <>
                <div 
                  className="w-full h-full relative overflow-hidden flex items-center justify-center cursor-move"
                  onMouseDown={(e) => handleMouseDown(e, 0)}
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
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity">
                    <Move className="text-white" size={48} />
                  </div>
                </div>
                <PhotoActions
                  photo={coverPhoto}
                  fillLabel={text.photoFill}
                  containLabel={text.photoContain}
                  removeLabel={text.photoRemove}
                  onToggleFit={() => handleToggleFit(0, coverPhoto)}
                  onRemove={() => handleRemovePhoto(0)}
                  onZoomChange={(scale) => handleZoomChange(0, scale)}
                />
              </>
            ) : (
              <label className="absolute inset-0 w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="file" accept="image/*" onChange={(event) => handleImageUpload(event, 0)} className="hidden" />
                <ImagePlus className="text-gray-400 mb-2" size={40} />
                <span className="text-gray-500 font-medium">{text.coverPhotoDropLabel}</span>
              </label>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={targetRef}
      className="shadow-xl relative transition-colors overflow-hidden"
      style={{ width: '794px', height: '1123px', padding: '40px', backgroundColor: settings.backgroundColor }}
    >
      {showPageLabel && <PageLabel label={text.pageLabel(pageIndex + 1)} />}

      <div className={`w-full h-full grid gap-6 ${getGridClass(page.layout)}`}>
        {slots.map((slotIndex) => {
          const photo = page.photos[slotIndex];
          const isDragging = dragActiveIndex === slotIndex;
          const captionTextStyle = photo
            ? resolveTextStyle(photo.caption, photo.captionStyle, DEFAULT_CAPTION_FONT_SIZE)
            : null;

          return (
            <div
              key={slotIndex}
              className="flex flex-col items-center justify-center w-full h-full min-h-0 min-w-0 group"
              onDragOver={(event) => handleDragOver(event, slotIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(event) => handleDrop(event, slotIndex)}
            >
              {photo ? (
                <div className="w-full flex-1 flex flex-col relative min-h-0">
                  <div className="flex-1 min-h-0 w-full relative overflow-hidden bg-black/5 flex items-center justify-center border border-gray-100 rounded-md cursor-move"
                    onMouseDown={(e) => handleMouseDown(e, slotIndex)}
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
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity">
                      <Move className="text-black" size={32} />
                    </div>
                    <PhotoActions
                      photo={photo}
                      fillLabel={text.photoFill}
                      containLabel={text.photoContain}
                      removeLabel={text.photoRemove}
                      onToggleFit={() => handleToggleFit(slotIndex, photo)}
                      onRemove={() => handleRemovePhoto(slotIndex)}
                      onZoomChange={(scale) => handleZoomChange(slotIndex, scale)}
                    />
                  </div>
                  <div className="mt-3 w-full shrink-0">
                    <input
                      type="text"
                      value={photo.caption}
                      onChange={(event) => handleCaptionChange(event, slotIndex, photo)}
                      onFocus={() => onTextSelect?.({ type: 'caption', pageId: page.id, photoIndex: slotIndex })}
                      onBlur={(event) => onTextBlur?.(event.relatedTarget)}
                      placeholder={text.photoCaptionPlaceholder}
                      className="w-full text-center text-gray-700 text-lg border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-colors bg-transparent placeholder-gray-400"
                      style={captionTextStyle?.style}
                      lang={captionTextStyle?.lang}
                    />
                  </div>
                </div>
              ) : (
                <EmptyPhotoSlot
                  isDragging={isDragging}
                  label={text.photoSlotLabel}
                  dropLabel={text.photoDropLabel}
                  onUpload={(event) => handleImageUpload(event, slotIndex)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
