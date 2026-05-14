import { useRef, useEffect } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { getNextPhotoDragOffset } from '@/utils/photoDrag';
import { A4_PAGE_WIDTH } from '@/utils/stamps';
import type { PageData } from '@/types';

export function usePhotoDrag(
  page: PageData,
  updatePhotoTransform: (pageId: string, index: number, transform: { scale?: number; offset?: { x: number; y: number } }) => void
) {
  const isDraggingPhoto = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const activePhotoIndex = useRef<number | null>(null);
  const activePhotoPointerId = useRef<number | null>(null);
  const activePhotoPageScale = useRef(1);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const photosRef = useRef(page.photos);

  useEffect(() => {
    photosRef.current = page.photos;
  }, [page.photos]);

  const handlePhotoPointerDown = (event: ReactPointerEvent<HTMLElement>, index: number) => {
    const photo = page.photos[index];
    if (!photo) return;

    const pageElement = event.currentTarget.closest('[data-a4-page]');
    const pageWidth = pageElement instanceof HTMLElement ? pageElement.getBoundingClientRect().width : A4_PAGE_WIDTH;
    isDraggingPhoto.current = true;
    activePhotoIndex.current = index;
    activePhotoPointerId.current = event.pointerId;
    activePhotoPageScale.current = pageWidth / A4_PAGE_WIDTH || 1;
    lastPos.current = { x: event.clientX, y: event.clientY };
    dragOffset.current = { x: photo.offset?.x || 0, y: photo.offset?.y || 0 };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const handlePhotoWheel = (event: React.WheelEvent<HTMLElement>, index: number) => {
    const photo = page.photos[index];
    if (!photo) return;

    event.preventDefault();
    const delta = -event.deltaY;
    const factor = 1.1;
    const currentScale = photo.scale || 1;
    const nextScale = delta > 0 ? currentScale * factor : currentScale / factor;
    const clampedScale = Math.min(Math.max(nextScale, 0.5), 5);

    updatePhotoTransform(page.id, index, { scale: clampedScale });
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isDraggingPhoto.current || activePhotoIndex.current === null) return;
      if (activePhotoPointerId.current !== null && event.pointerId !== activePhotoPointerId.current) return;
      
      const photo = photosRef.current[activePhotoIndex.current];
      if (!photo) return;

      const currentScale = photo.scale || 1;
      dragOffset.current = getNextPhotoDragOffset({
        currentOffset: dragOffset.current,
        currentPointer: { x: event.clientX, y: event.clientY },
        lastPointer: lastPos.current,
        pageScale: activePhotoPageScale.current,
        photoScale: currentScale,
      });
      
      lastPos.current = { x: event.clientX, y: event.clientY };

      // Update DOM directly for smooth visual feedback without triggering store updates
      const imgElements = document.querySelectorAll(`[data-photo-index="${activePhotoIndex.current}"][data-page-id="${page.id}"]`);
      imgElements.forEach((img) => {
        if (img instanceof HTMLImageElement) {
          img.style.objectPosition = `calc(50% + ${dragOffset.current.x}px) calc(50% + ${dragOffset.current.y}px)`;
        }
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (activePhotoPointerId.current !== null && event.pointerId !== activePhotoPointerId.current) return;

      if (isDraggingPhoto.current && activePhotoIndex.current !== null) {
        // Commit the final offset to the store (single undo step)
        updatePhotoTransform(page.id, activePhotoIndex.current, {
          offset: { ...dragOffset.current },
        });
      }
      isDraggingPhoto.current = false;
      activePhotoIndex.current = null;
      activePhotoPointerId.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [page.id, updatePhotoTransform]);

  return { handlePhotoPointerDown, handlePhotoWheel };
}
