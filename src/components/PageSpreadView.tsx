import { memo } from 'react';
import { A4Page } from './A4Page';
import type { AppText } from '../i18n';
import type { PageData, ProjectSettings } from '../types';
import type { TextTarget } from '../utils/textStyle';

export interface PageSpreadViewProps {
  pages: PageData[];
  pageIndexes: number[];
  currentPageIndex?: number;
  settings: ProjectSettings;
  text: AppText;
  onError?: (message: string) => void;
  onPageSelect?: (pageIndex: number) => void;
  onTextSelect?: (target: TextTarget) => void;
  onTextBlur?: (nextFocusedElement: EventTarget | null) => void;
  showPageLabel?: boolean;
  showPrintWarrantyGuide?: boolean;
}

function PageSpreadViewComponent({
  pages,
  pageIndexes,
  currentPageIndex,
  settings,
  text,
  onError,
  onPageSelect,
  onTextSelect,
  onTextBlur,
  showPageLabel = true,
  showPrintWarrantyGuide,
}: PageSpreadViewProps) {
  return (
    <div className="flex h-full w-full bg-gray-200">
      {pages.map((page, index) => {
        const pageIndex = pageIndexes[index];
        const isSelected = currentPageIndex === pageIndex;

        return (
          <div
            key={page.id}
            className={`relative outline outline-offset-[-2px] transition-shadow ${
              isSelected ? 'z-10 outline-2 outline-blue-500 ring-4 ring-blue-500/25' : 'outline-0'
            } ${onPageSelect ? 'cursor-pointer' : ''}`}
            onClick={() => onPageSelect?.(pageIndex)}
          >
            <A4Page
              page={page}
              pageIndex={pageIndex}
              settings={settings}
              text={text}
              onError={onError}
              onTextSelect={onTextSelect}
              onTextBlur={onTextBlur}
              showPageLabel={showPageLabel}
              showPrintWarrantyGuide={showPrintWarrantyGuide}
            />
          </div>
        );
      })}
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

  // Event handlers are assumed to be stable or managed by parent (e.g. App.tsx doesn't use useCallback much,
  // but let's ignore function identity to maximize memo benefits, or rely on the fact they are passed from top level)
  // Wait, if functions change on every render, `memo` will fail if we check them.
  // We'll intentionally ignore function props (onError, onPageSelect, etc.) since they are purely bound to the parent's current closure.
  
  return true;
});