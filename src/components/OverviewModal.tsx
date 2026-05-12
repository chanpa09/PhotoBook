import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PageThumbnail } from '@/components/PageThumbnail';
import type { AppText } from '@/i18n';
import { useShallow } from 'zustand/react/shallow';
import { useProjectStore } from '@/store/useProjectStore';
import { getPageSpreads, type PageSpread } from '@/utils/layout';

interface Props {
  isOpen: boolean;
  text: AppText;
  onClose: () => void;
}

function SortableSpreadThumbnail({
  spread,
  settings,
  currentPageIndex,
  noTitleLabel,
  onPageClick,
}: {
  spread: PageSpread;
  settings: ReturnType<typeof useProjectStore.getState>['settings'];
  currentPageIndex: number;
  noTitleLabel: string;
  onPageClick: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: spread.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative grid gap-3 h-full ${spread.pages.length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-[180px] mx-auto'}`}
    >
      {spread.pages.map((page, offset) => {
        const pageIndex = spread.pageIndexes[offset];
        return (
          <PageThumbnail
            key={page.id}
            page={page}
            pageIndex={pageIndex}
            settings={settings}
            isSelected={pageIndex === currentPageIndex}
            noTitleLabel={noTitleLabel}
            onClick={() => onPageClick(pageIndex)}
          />
        );
      })}
    </div>
  );
}

export function OverviewModal({ isOpen, text, onClose }: Props) {
  const { pages, settings, currentPageIndex, setCurrentPageIndex, reorderPages } = useProjectStore(
    useShallow((state) => ({
      pages: state.pages,
      settings: state.settings,
      currentPageIndex: state.currentPageIndex,
      setCurrentPageIndex: state.setCurrentPageIndex,
      reorderPages: state.reorderPages,
    })),
  );
  const pageSpreads = useMemo(() => getPageSpreads(pages), [pages]);
  const parentRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getColumns = (width: number) => {
    if (width >= 1280) return 4; // xl
    if (width >= 1024) return 3; // lg
    if (width >= 640) return 2; // sm
    return 1;
  };

  const cols = getColumns(windowWidth);
  const rowCount = Math.ceil(pageSpreads.length / cols);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual intentionally exposes imperative helpers here.
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320,
    overscan: 2,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePageClick = (index: number) => {
    setCurrentPageIndex(index);
    onClose();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeSpread = pageSpreads.find((spread) => spread.id === active.id);
      const overSpread = pageSpreads.find((spread) => spread.id === over.id);
      if (activeSpread && overSpread) {
        reorderPages(activeSpread.pages[0].id, overSpread.pages[0].id);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="overview-title"
        className="relative w-full max-w-7xl h-full bg-gray-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <div>
            <h2 id="overview-title" className="text-xl font-bold text-gray-900">{text.overviewTitle}</h2>
            <p className="text-sm text-gray-500">{text.overviewDescription}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            aria-label={text.overviewClose}
          >
            <X size={24} />
          </button>
        </div>
        
        <div ref={parentRef} className="flex-1 overflow-y-auto p-6 md:p-10">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pageSpreads.map((spread) => spread.id)}
              strategy={rectSortingStrategy}
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const startIndex = virtualRow.index * cols;
                  const rowSpreads = pageSpreads.slice(startIndex, startIndex + cols);

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
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 pb-8"
                    >
                      {rowSpreads.map((spread) => (
                        <SortableSpreadThumbnail
                          key={spread.id}
                          spread={spread}
                          settings={settings}
                          currentPageIndex={currentPageIndex}
                          noTitleLabel={text.noTitle}
                          onPageClick={handlePageClick}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-colors"
          >
            {text.close}
          </button>
        </div>
      </div>
    </div>
  );
}
