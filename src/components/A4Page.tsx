import { useState, type ChangeEvent, type DragEvent, type RefObject } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useProjectStore } from '@/store/useProjectStore';
import { saveImage, createObjectUrlFromBlob } from '@/utils/imageStore';
import { resizeImage, DEFAULT_IMAGE_MAX_RESOLUTION } from '@/utils/imageResize';
import type { AppText } from '@/i18n';
import type { Photo, ProjectSettings, PageData, StampAsset, TextTarget } from '@/types';
import { A4_PAGE_HEIGHT, A4_PAGE_WIDTH, DEFAULT_STAMP_SIZE, hasStampDragData, parseStampDragData } from '@/utils/stamps';

// Sub-components
import { PrintWarrantyGuideOverlay } from '@/components/A4Page/PrintWarrantyGuideOverlay';
import { StampLayer } from '@/components/A4Page/StampLayer';
import { CoverLayout } from '@/components/A4Page/CoverLayout';
import { StandardLayout } from '@/components/A4Page/StandardLayout';
import { usePhotoDrag } from '@/components/A4Page/usePhotoDrag';

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
  onPhotoSelect?: (pageId: string, photoIndex: number, rect: DOMRect) => void;
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
  onPhotoSelect,
}: Props) {
  const { updatePhoto, updatePhotoTransform, addStampAt } = useProjectStore(
    useShallow((state) => ({
      updatePhoto: state.updatePhoto,
      updatePhotoTransform: state.updatePhotoTransform,
      addStampAt: state.addStampAt,
    })),
  );
  const [dragActiveIndex, setDragActiveIndex] = useState<number | null>(null);
  
  const { handlePhotoPointerDown } = usePhotoDrag(page, updatePhotoTransform);

  const shouldShowPrintWarrantyGuide = showPrintWarrantyGuide ?? settings.showPrintWarrantyGuide ?? true;

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
    event.target.value = '';
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

  const commonProps = {
    page,
    pageIndex,
    settings,
    text,
    showPageLabel,
    dragActiveIndex,
    onTextSelect,
    onTextBlur,
    onPhotoSelect,
    onImageUpload: handleImageUpload,
    onDrop: handleDrop,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onPhotoPointerDown: handlePhotoPointerDown,
    onToggleFit: handleToggleFit,
    onRemovePhoto: handleRemovePhoto,
    onZoomChange: handleZoomChange,
  };

  return (
    <div
      ref={targetRef}
      data-a4-page
      data-page-id={page.id}
      className="shadow-xl relative flex flex-col transition-colors overflow-hidden"
      style={{ width: '794px', height: '1123px', backgroundColor: settings.backgroundColor }}
      onDragOver={handlePageDragOver}
      onDrop={handlePageDrop}
    >
      {shouldShowPrintWarrantyGuide && <PrintWarrantyGuideOverlay />}
      <StampLayer page={page} interactive={showPageLabel} text={text} />

      {page.layout === 'cover' ? (
        <CoverLayout {...commonProps} />
      ) : (
        <StandardLayout {...commonProps} />
      )}
    </div>
  );
}
