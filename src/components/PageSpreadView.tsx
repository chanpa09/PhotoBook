import { memo, useRef, useEffect, useState } from 'react';
import type { PageData, ProjectSettings, TextTarget } from '@/types';
import type { AppText } from '@/i18n';
import { A4Page } from '@/components/A4Page';

interface Props {
  pages: PageData[];
  pageIndexes: number[];
  currentPageIndex?: number;
  settings: ProjectSettings;
  text: AppText;
  showPageLabel?: boolean;
  showPrintWarrantyGuide?: boolean;
  onError?: (message: string) => void;
  onPageSelect?: (index: number) => void;
  onTextSelect?: (target: TextTarget) => void;
  onTextBlur?: (nextFocusedElement: EventTarget | null) => void;
  onPhotoSelect?: (pageId: string, photoIndex: number, rect: DOMRect) => void;
}

const VirtualPage = memo(({ 
  page, 
  index, 
  settings, 
  text, 
  showPageLabel, 
  showPrintWarrantyGuide, 
  onError, 
  onPageSelect, 
  onTextSelect, 
  onTextBlur,
  onPhotoSelect
}: {
  page: PageData;
  index: number;
  settings: ProjectSettings;
  text: AppText;
  showPageLabel?: boolean;
  showPrintWarrantyGuide?: boolean;
  onError?: (message: string) => void;
  onPageSelect?: (index: number) => void;
  onTextSelect?: (target: TextTarget) => void;
  onTextBlur?: (nextFocusedElement: EventTarget | null) => void;
  onPhotoSelect?: (pageId: string, photoIndex: number, rect: DOMRect) => void;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: '600px', // Proactively render pages before they enter the viewport
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative shrink-0" 
      style={{ width: '794px', height: '1123px' }}
      onClick={() => onPageSelect?.(index)}
    >
      {isVisible ? (
        <A4Page
          page={page}
          pageIndex={index}
          settings={settings}
          text={text}
          showPageLabel={showPageLabel}
          showPrintWarrantyGuide={showPrintWarrantyGuide}
          onError={onError}
          onTextSelect={onTextSelect}
          onTextBlur={onTextBlur}
          onPhotoSelect={onPhotoSelect}
        />
      ) : (
        <div 
          className="w-full h-full border border-gray-200 shadow-sm flex items-center justify-center bg-gray-50 rounded-sm"
          style={{ backgroundColor: settings.backgroundColor }}
        >
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-xs font-medium">Page {index + 1}</span>
          </div>
        </div>
      )}
    </div>
  );
});

function PageSpreadViewComponent({
  pages,
  pageIndexes,
  currentPageIndex,
  settings,
  text,
  showPageLabel = true,
  showPrintWarrantyGuide,
  onError,
  onPageSelect,
  onTextSelect,
  onTextBlur,
  onPhotoSelect,
}: Props) {
  const isSelected = currentPageIndex !== undefined && pageIndexes.includes(currentPageIndex);

  return (
    <div
      className={`flex shadow-2xl transition-all duration-300 ring-offset-8 ring-offset-gray-100 ${
        isSelected ? 'ring-8 ring-blue-500/50 rounded-lg scale-[1.01]' : 'ring-0 rounded-none'
      }`}
    >
      {pages.map((page, i) => (
        <VirtualPage
          key={page.id}
          page={page}
          index={pageIndexes[i]}
          settings={settings}
          text={text}
          showPageLabel={showPageLabel}
          showPrintWarrantyGuide={showPrintWarrantyGuide}
          onError={onError}
          onPageSelect={onPageSelect}
          onTextSelect={onTextSelect}
          onTextBlur={onTextBlur}
          onPhotoSelect={onPhotoSelect}
        />
      ))}
    </div>
  );
}

export const PageSpreadView = memo(PageSpreadViewComponent, (prevProps, nextProps) => {
  // If selection state changes for this spread, we must re-render to update the blue outline
  if (prevProps.currentPageIndex !== nextProps.currentPageIndex) {
    const wasSelected = prevProps.currentPageIndex !== undefined && prevProps.pageIndexes.includes(prevProps.currentPageIndex);
    const isSelected = nextProps.currentPageIndex !== undefined && nextProps.pageIndexes.includes(nextProps.currentPageIndex);
    if (wasSelected || isSelected) return false;
  }

  if (prevProps.settings !== nextProps.settings) return false;
  if (prevProps.text !== nextProps.text) return false;
  if (prevProps.showPageLabel !== nextProps.showPageLabel) return false;
  if (prevProps.showPrintWarrantyGuide !== nextProps.showPrintWarrantyGuide) return false;

  if (prevProps.pages.length !== nextProps.pages.length) return false;
  for (let i = 0; i < prevProps.pages.length; i++) {
    if (prevProps.pages[i] !== nextProps.pages[i]) return false;
    if (prevProps.pageIndexes[i] !== nextProps.pageIndexes[i]) return false;
  }

  return true;
});
