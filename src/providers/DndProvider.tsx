import { useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { useShallow } from 'zustand/react/shallow';
import { useProjectStore } from '@/store/useProjectStore';
import type { StampAsset } from '@/types';
import { DEFAULT_STAMP_SIZE } from '@/utils/stamps';

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

interface DndProviderProps {
  children: ReactNode;
}

export function DndProvider({ children }: DndProviderProps) {
  const addStampAt = useProjectStore(useShallow((state) => state.addStampAt));
  const [activeStamp, setActiveStamp] = useState<StampAsset | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'stamp') {
      setActiveStamp(event.active.data.current.stamp as StampAsset);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStamp(null);
    const { active, over } = event;

    if (over && active.data.current?.type === 'stamp') {
      const stamp = active.data.current.stamp as StampAsset;
      const overData = over.data.current;
      const pageId = overData?.pageId as string;
      
      if (!pageId) return;

      const activatorEvent = event.activatorEvent as MouseEvent;
      const clientX = activatorEvent.clientX + event.delta.x;
      const clientY = activatorEvent.clientY + event.delta.y;

      const pageElement = document.querySelector(`[data-page-id="${pageId}"]`);
      if (pageElement instanceof HTMLElement) {
        const pageRect = pageElement.getBoundingClientRect();
        const pageScale = pageRect.width / A4_WIDTH || 1;
        const stampSize = stamp.minSize ?? DEFAULT_STAMP_SIZE;
        const dropX = (clientX - pageRect.left) / pageScale;
        const dropY = (clientY - pageRect.top) / pageScale;

        const position = {
          x: Math.min(A4_WIDTH - stampSize, Math.max(0, dropX - stampSize / 2)),
          y: Math.min(A4_HEIGHT - stampSize, Math.max(0, dropY - stampSize / 2)),
        };
        
        addStampAt(pageId, stamp, position);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.4',
            },
          },
        }),
      }}>
        {activeStamp ? (
          <div className="flex aspect-square h-24 w-24 items-center justify-center rounded-lg border-2 border-blue-500 bg-white/80 p-2 shadow-2xl backdrop-blur-sm">
            <img
              src={activeStamp.thumbnailUrl}
              alt=""
              className="max-h-full max-w-none object-contain"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
