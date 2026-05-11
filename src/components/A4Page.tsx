import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent, CSSProperties, DragEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { ImagePlus, Move, RotateCcw, RotateCw, Trash2, ArrowUpToLine, ArrowUp, ArrowDown, ArrowDownToLine } from 'lucide-react';
import { EmptyPhotoSlot, PageLabel, PhotoActions } from './A4PageParts';
import type { AppText } from '../i18n';
import { useProjectStore } from '../store/useProjectStore';
import { saveImage, createObjectUrlFromBlob } from '../utils/imageStore';
import { resizeImage, DEFAULT_IMAGE_MAX_RESOLUTION } from '../utils/imageResize';
import {
  getDisplayFrameLayout,
  getDisplayPhotoFrameImageStyle,
  getFrameLayout,
  getGridClass,
  getSlotCount,
} from '../utils/layout';
import { A4_PRINT_WARRANTY_GUIDE } from '../data/printGuides';
import type { TextTarget } from '../utils/textStyle';
import {
  DEFAULT_CAPTION_FONT_SIZE,
  DEFAULT_COVER_DATE_FONT_SIZE,
  DEFAULT_COVER_TITLE_FONT_SIZE,
  DEFAULT_LAYOUT_TEXT_FONT_SIZE,
  resolveTextStyle,
} from '../utils/textStyle';
import type { Photo, ProjectSettings, PageData, StampAsset, StampInstance } from '../types';
import {
  A4_PAGE_HEIGHT,
  A4_PAGE_WIDTH,
  DEFAULT_STAMP_SIZE,
  clampStampScale,
  getStampBoxStyle,
  hasStampDragData,
  parseStampDragData,
} from '../utils/stamps';

interface Props {
  page: PageData;
  pageIndex: number;
  settings: ProjectSettings;
  text: AppText;
  targetRef?: RefObject<HTMLDivElement | null>;
  showPageLabel?: boolean;
  showPrintWarrantyGuide?: boolean;
  onError?: (message: string) => void;
  onTextSelect?: (target: TextTarget) => void;
  onTextBlur?: (nextFocusedElement: EventTarget | null) => void;
}

function PrintWarrantyGuideOverlay() {
  const marginX = (A4_PRINT_WARRANTY_GUIDE.displayMargin / A4_PRINT_WARRANTY_GUIDE.sourceWidth) * 100;
  const marginY = (A4_PRINT_WARRANTY_GUIDE.displayMargin / A4_PRINT_WARRANTY_GUIDE.sourceHeight) * 100;

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      <div className="absolute inset-0 border-[10px] border-violet-500/20" />
      <div
        className="absolute border-2 border-dashed border-violet-500/80"
        style={{
          left: `${marginX}%`,
          right: `${marginX}%`,
          top: `${marginY}%`,
          bottom: `${marginY}%`,
        }}
      />
      <div className="absolute bottom-3 left-3 rounded bg-white/90 px-2 py-1 text-xs font-bold text-violet-700 shadow-sm">
        印刷保証外
      </div>
    </div>
  );
}

function StampLayer({ page, interactive }: { page: PageData; interactive: boolean }) {
  const { updateStamp, removeStamp, bringStampToFront, bringStampForward, sendStampBackward, sendStampToBack } = useProjectStore();
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);
  const activeStampMode = useRef<'move' | 'resize' | null>(null);
  const activeStampId = useRef<string | null>(null);
  const activePointerId = useRef<number | null>(null);
  const activePageScale = useRef(1);
  const startStampPointer = useRef({ x: 0, y: 0 });
  const lastStampPointer = useRef({ x: 0, y: 0 });
  const draftStampPosition = useRef({ x: 0, y: 0 });
  const startStampWidth = useRef(DEFAULT_STAMP_SIZE);
  const startStampSize = useRef(DEFAULT_STAMP_SIZE);
  const draftStampScale = useRef(1);
  const hasMovedStamp = useRef(false);

  useEffect(() => {
    if (!interactive) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!activeStampId.current || !activeStampMode.current) return;
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;

      const totalDeltaX = (event.clientX - startStampPointer.current.x) / activePageScale.current;
      const totalDeltaY = (event.clientY - startStampPointer.current.y) / activePageScale.current;
      if (!hasMovedStamp.current && Math.hypot(totalDeltaX, totalDeltaY) < 2) return;

      hasMovedStamp.current = true;
      const stampElement = document.querySelector(
        `[data-stamp-instance-id="${activeStampId.current}"]`,
      );

      if (activeStampMode.current === 'move') {
        const deltaX = (event.clientX - lastStampPointer.current.x) / activePageScale.current;
        const deltaY = (event.clientY - lastStampPointer.current.y) / activePageScale.current;
        draftStampPosition.current = {
          x: draftStampPosition.current.x + deltaX,
          y: draftStampPosition.current.y + deltaY,
        };
        lastStampPointer.current = { x: event.clientX, y: event.clientY };

        if (stampElement instanceof HTMLElement) {
          stampElement.style.left = `${draftStampPosition.current.x}px`;
          stampElement.style.top = `${draftStampPosition.current.y}px`;
        }
        return;
      }

      const nextWidth = Math.max(1, startStampWidth.current + Math.max(totalDeltaX, totalDeltaY));
      draftStampScale.current = clampStampScale(nextWidth / startStampSize.current);
      if (stampElement instanceof HTMLElement) {
        stampElement.style.left = `${draftStampPosition.current.x}px`;
        stampElement.style.top = `${draftStampPosition.current.y}px`;
        stampElement.style.width = `${startStampSize.current * draftStampScale.current}px`;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;

      if (hasMovedStamp.current && activeStampId.current) {
        if (activeStampMode.current === 'resize') {
          updateStamp(page.id, activeStampId.current, { scale: draftStampScale.current });
        } else {
          updateStamp(page.id, activeStampId.current, { ...draftStampPosition.current });
        }
      }

      activeStampMode.current = null;
      activeStampId.current = null;
      activePointerId.current = null;
      hasMovedStamp.current = false;
    };

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-stamp-instance-id], [data-stamp-control]')) return;

      setSelectedStampId(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('pointerdown', handleDocumentPointerDown, true);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('pointerdown', handleDocumentPointerDown, true);
    };
  }, [interactive, page.id, updateStamp]);

  const handleStampPointerDown = (event: ReactPointerEvent<HTMLDivElement>, stamp: StampInstance) => {
    if (!interactive) return;

    const pageElement = event.currentTarget.closest('[data-a4-page]');
    const pageWidth = pageElement instanceof HTMLElement ? pageElement.getBoundingClientRect().width : A4_PAGE_WIDTH;
    activePageScale.current = pageWidth / A4_PAGE_WIDTH || 1;
    activeStampMode.current = 'move';
    activeStampId.current = stamp.instanceId;
    activePointerId.current = event.pointerId;
    hasMovedStamp.current = false;
    startStampPointer.current = { x: event.clientX, y: event.clientY };
    lastStampPointer.current = { x: event.clientX, y: event.clientY };
    draftStampPosition.current = { x: stamp.x, y: stamp.y };
    setSelectedStampId(stamp.instanceId);
    bringStampToFront(page.id, stamp.instanceId);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, stamp: StampInstance) => {
    if (!interactive) return;

    const pageElement = event.currentTarget.closest('[data-a4-page]');
    const pageWidth = pageElement instanceof HTMLElement ? pageElement.getBoundingClientRect().width : A4_PAGE_WIDTH;
    const stampSize = stamp.size ?? DEFAULT_STAMP_SIZE;
    activePageScale.current = pageWidth / A4_PAGE_WIDTH || 1;
    activeStampMode.current = 'resize';
    activeStampId.current = stamp.instanceId;
    activePointerId.current = event.pointerId;
    hasMovedStamp.current = false;
    startStampPointer.current = { x: event.clientX, y: event.clientY };
    draftStampPosition.current = { x: stamp.x, y: stamp.y };
    startStampSize.current = stampSize;
    startStampWidth.current = stampSize * stamp.scale;
    draftStampScale.current = stamp.scale;
    setSelectedStampId(stamp.instanceId);
    bringStampToFront(page.id, stamp.instanceId);
    event.preventDefault();
    event.stopPropagation();
  };

  if (!page.stamps?.length) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30"
      aria-hidden={!interactive}
    >
      {page.stamps.map((stamp) => {
        const isSelected = interactive && selectedStampId === stamp.instanceId;

        return (
          <div
            key={stamp.instanceId}
            data-stamp-instance-id={stamp.instanceId}
            className={`absolute origin-center touch-none ${interactive ? 'pointer-events-auto cursor-move' : ''}`}
            style={getStampBoxStyle(stamp)}
            onPointerDown={(event) => handleStampPointerDown(event, stamp)}
          >
            <img
              src={stamp.imageUrl}
              alt=""
              draggable={false}
              className="block h-auto w-full select-none"
            />
            {isSelected && (
              <div
                className="pointer-events-none absolute inset-0 rounded-sm outline outline-2 outline-blue-500"
              >
                <div
                  className="pointer-events-auto absolute -top-9 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-gray-200 bg-white/95 p-1 shadow-lg"
                  data-stamp-control
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => sendStampToBack(page.id, stamp.instanceId)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label="Send to back"
                    title="Send to back"
                  >
                    <ArrowDownToLine size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => sendStampBackward(page.id, stamp.instanceId)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label="Send backward"
                    title="Send backward"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => bringStampForward(page.id, stamp.instanceId)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label="Bring forward"
                    title="Bring forward"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => bringStampToFront(page.id, stamp.instanceId)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label="Bring to front"
                    title="Bring to front"
                  >
                    <ArrowUpToLine size={14} />
                  </button>
                  <div className="mx-0.5 h-4 w-[1px] bg-gray-200" />
                  <button
                    type="button"
                    onClick={() => updateStamp(page.id, stamp.instanceId, { rotate: stamp.rotate - 15 })}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label="Rotate stamp left"
                    title="Rotate left"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStamp(page.id, stamp.instanceId, { rotate: stamp.rotate + 15 })}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label="Rotate stamp right"
                    title="Rotate right"
                  >
                    <RotateCw size={14} />
                  </button>
                  <div className="mx-0.5 h-4 w-[1px] bg-gray-200" />
                  <button
                    type="button"
                    onClick={() => {
                      removeStamp(page.id, stamp.instanceId);
                      setSelectedStampId(null);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                    aria-label="Delete stamp"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div
                  className="pointer-events-auto absolute -bottom-3 -right-3"
                  data-stamp-control
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onPointerDown={(event) => handleResizePointerDown(event, stamp)}
                    className="block h-6 w-6 cursor-nwse-resize rounded-full border-2 border-white bg-blue-600 shadow-md transition-colors hover:bg-blue-700"
                    aria-label="Resize stamp"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function A4Page({
  page,
  pageIndex,
  settings,
  text,
  targetRef,
  showPageLabel = true,
  showPrintWarrantyGuide,
  onError,
  onTextSelect,
  onTextBlur,
}: Props) {
  const { updatePhoto, updateLayoutText, updatePageData, updatePhotoTransform, addStampAt } = useProjectStore();
  const [dragActiveIndex, setDragActiveIndex] = useState<number | null>(null);
  
  // Drag to pan state
  const isDraggingPhoto = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const activePhotoIndex = useRef<number | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const photosRef = useRef(page.photos);

  const slots = Array.from({ length: getSlotCount(page.layout) }, (_, index) => index);
  const frameLayout = getFrameLayout(page.layout);
  const displayFrameLayout = frameLayout ? getDisplayFrameLayout(frameLayout, page.spreadSide) : null;
  const shouldShowPrintWarrantyGuide = showPrintWarrantyGuide ?? settings.showPrintWarrantyGuide ?? true;

  useEffect(() => {
    photosRef.current = page.photos;
  }, [page.photos]);

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

  const getDropPositionOnPage = (event: DragEvent<HTMLElement>, stamp: StampAsset) => {
    const pageElement = event.currentTarget.closest('[data-a4-page]');
    if (!(pageElement instanceof HTMLElement)) return null;

    const pageRect = pageElement.getBoundingClientRect();
    const pageScale = pageRect.width / A4_PAGE_WIDTH || 1;
    const stampSize = stamp.minSize ?? DEFAULT_STAMP_SIZE;
    const dropX = (event.clientX - pageRect.left) / pageScale;
    const dropY = (event.clientY - pageRect.top) / pageScale;

    return {
      x: Math.min(A4_PAGE_WIDTH - stampSize, Math.max(0, dropX - stampSize / 2)),
      y: Math.min(A4_PAGE_HEIGHT - stampSize, Math.max(0, dropY - stampSize / 2)),
    };
  };

  const handleStampDrop = (event: DragEvent<HTMLElement>) => {
    const stamp = parseStampDragData(event.dataTransfer);
    if (!stamp) return false;

    const position = getDropPositionOnPage(event, stamp);
    if (position) {
      addStampAt(page.id, stamp, position);
    }
    setDragActiveIndex(null);
    event.preventDefault();
    event.stopPropagation();
    return true;
  };

  const handlePageDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasStampDragData(event.dataTransfer)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragActiveIndex(null);
  };

  const handlePageDrop = (event: DragEvent<HTMLDivElement>) => {
    handleStampDrop(event);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file, index);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, index: number) => {
    if (handleStampDrop(event)) return;

    event.preventDefault();
    event.stopPropagation();
    setDragActiveIndex(null);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file, index);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
    if (hasStampDragData(event.dataTransfer)) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
      setDragActiveIndex(null);
      return;
    }

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

  const getLayoutTextPlaceholder = (textType?: string) => {
    if (textType === 'title') return text.layoutTextPlaceholders.title;
    if (textType === 'subtitle') return text.layoutTextPlaceholders.subtitle;
    if (textType === 'message') return text.layoutTextPlaceholders.message;
    return text.layoutTextPlaceholders.default;
  };

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
        data-a4-page
        className="shadow-xl relative flex flex-col items-center justify-center transition-colors overflow-hidden"
        style={{ width: '794px', height: '1123px', padding: '40px', backgroundColor: settings.backgroundColor }}
        onDragOver={handlePageDragOver}
        onDrop={handlePageDrop}
      >
        {showPageLabel && <PageLabel label={text.pageLabel(pageIndex + 1)} />}
        {shouldShowPrintWarrantyGuide && <PrintWarrantyGuideOverlay />}
        <StampLayer page={page} interactive={showPageLabel} />

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

  if (displayFrameLayout) {
    return (
      <div
        ref={targetRef}
        data-a4-page
        className="shadow-xl relative transition-colors overflow-hidden"
        style={{ width: '794px', height: '1123px', backgroundColor: settings.backgroundColor }}
        onDragOver={handlePageDragOver}
        onDrop={handlePageDrop}
      >
        {showPageLabel && <PageLabel label={text.pageLabel(pageIndex + 1)} />}
        {shouldShowPrintWarrantyGuide && <PrintWarrantyGuideOverlay />}
        <StampLayer page={page} interactive={showPageLabel} />

        <div className="absolute inset-0">
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
              writingMode: frame.isVertical ? 'vertical-rl' : undefined,
              textOrientation: frame.isVertical ? 'mixed' : undefined,
            };

            return (
              <textarea
                key={`text-${frame.slotIndex}`}
                value={layoutText?.value ?? ''}
                onChange={(event) => updateLayoutText(page.id, frame.slotIndex, { value: event.target.value })}
                onFocus={() => onTextSelect?.({ type: 'layoutText', pageId: page.id, textIndex: frame.slotIndex })}
                onBlur={(event) => onTextBlur?.(event.relatedTarget)}
                placeholder={getLayoutTextPlaceholder(frame.textType)}
                className="absolute z-10 resize-none overflow-hidden border border-transparent bg-transparent p-1 leading-tight text-gray-900 outline-none transition-colors placeholder-gray-300 hover:border-gray-300 focus:border-blue-500 focus:bg-white/20"
                style={textareaStyle}
                lang={resolvedLayoutTextStyle.lang}
              />
            );
          })}

          {displayFrameLayout.frames.map((frame) => {
            const slotIndex = frame.slotIndex;
            const photo = page.photos[slotIndex];
            const isDragging = dragActiveIndex === slotIndex;

            return (
              <div
                key={slotIndex}
                className="absolute group"
                style={{
                  left: `${(frame.x / displayFrameLayout.sourceWidth) * 100}%`,
                  top: `${(frame.y / displayFrameLayout.sourceHeight) * 100}%`,
                  width: `${(frame.width / displayFrameLayout.sourceWidth) * 100}%`,
                  height: `${(frame.height / displayFrameLayout.sourceHeight) * 100}%`,
                }}
                onDragOver={(event) => handleDragOver(event, slotIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(event) => handleDrop(event, slotIndex)}
              >
                {photo ? (
                  <div className="w-full h-full relative overflow-hidden bg-black/5 flex items-center justify-center border border-gray-100 cursor-move"
                    onMouseDown={(e) => handleMouseDown(e, slotIndex)}
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
                        }}
                      />
                    </div>
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
                ) : (
                  <div className="w-full h-full flex">
                    <EmptyPhotoSlot
                      isDragging={isDragging}
                      label={text.photoSlotLabel}
                      dropLabel={text.photoDropLabel}
                      onUpload={(event) => handleImageUpload(event, slotIndex)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={targetRef}
      data-a4-page
      className="shadow-xl relative transition-colors overflow-hidden"
      style={{ width: '794px', height: '1123px', padding: '40px', backgroundColor: settings.backgroundColor }}
      onDragOver={handlePageDragOver}
      onDrop={handlePageDrop}
    >
      {showPageLabel && <PageLabel label={text.pageLabel(pageIndex + 1)} />}
      {shouldShowPrintWarrantyGuide && <PrintWarrantyGuideOverlay />}
      <StampLayer page={page} interactive={showPageLabel} />

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
                <div className="w-full h-full flex flex-col relative min-h-0">
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
                      className="w-full border-b border-transparent bg-transparent p-1 text-center text-lg text-gray-700 transition-colors placeholder-gray-400 hover:border-gray-300 focus:border-blue-500 focus:outline-none"
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
