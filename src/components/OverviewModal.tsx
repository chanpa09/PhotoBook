import { useEffect } from 'react';
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
} from '@dnd-kit/sortable';
import { PageThumbnail } from './PageThumbnail';
import type { AppText } from '../i18n';
import { useProjectStore } from '../store/useProjectStore';

interface Props {
  isOpen: boolean;
  text: AppText;
  onClose: () => void;
}

export function OverviewModal({ isOpen, text, onClose }: Props) {
  const { pages, settings, currentPageIndex, setCurrentPageIndex, reorderPages } = useProjectStore();

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
      reorderPages(active.id as string, over.id as string);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="overview-title"
        className="relative w-full max-w-7xl h-full bg-gray-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
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
        
        {/* Grid Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pages.map((p) => p.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
                {pages.map((page, index) => (
                  <PageThumbnail
                    key={page.id}
                    page={page}
                    pageIndex={index}
                    settings={settings}
                    isSelected={index === currentPageIndex}
                    noTitleLabel={text.noTitle}
                    onClick={() => handlePageClick(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        
        {/* Footer */}
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
