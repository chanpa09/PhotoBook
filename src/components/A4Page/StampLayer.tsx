import { useState, useRef, useEffect } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { RotateCcw, RotateCw, Trash2, ArrowUpToLine, ArrowUp, ArrowDown, ArrowDownToLine } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useProjectStore } from '@/store/useProjectStore';
import type { AppText } from '@/i18n';
import type { PageData, StampInstance } from '@/types';
import {
  A4_PAGE_WIDTH,
  DEFAULT_STAMP_SIZE,
  clampStampScale,
  getStampBoxStyle,
} from '../../utils/stamps';

interface Props {
  page: PageData;
  interactive: boolean;
  text: AppText;
}

export function StampLayer({ page, interactive, text }: Props) {
  const {
    updateStamp,
    removeStamp,
    bringStampToFront,
    bringStampForward,
    sendStampBackward,
    sendStampToBack,
  } = useProjectStore(
    useShallow((state) => ({
      updateStamp: state.updateStamp,
      removeStamp: state.removeStamp,
      bringStampToFront: state.bringStampToFront,
      bringStampForward: state.bringStampForward,
      sendStampBackward: state.sendStampBackward,
      sendStampToBack: state.sendStampToBack,
    })),
  );
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
                    aria-label={text.stampActions.sendToBack}
                    title={text.stampActions.sendToBack}
                  >
                    <ArrowDownToLine size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => sendStampBackward(page.id, stamp.instanceId)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label={text.stampActions.sendBackward}
                    title={text.stampActions.sendBackward}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => bringStampForward(page.id, stamp.instanceId)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label={text.stampActions.bringForward}
                    title={text.stampActions.bringForward}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => bringStampToFront(page.id, stamp.instanceId)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label={text.stampActions.bringToFront}
                    title={text.stampActions.bringToFront}
                  >
                    <ArrowUpToLine size={14} />
                  </button>
                  <div className="mx-0.5 h-4 w-[1px] bg-gray-200" />
                  <button
                    type="button"
                    onClick={() => updateStamp(page.id, stamp.instanceId, { rotate: stamp.rotate - 15 })}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label={text.stampActions.rotateLeft}
                    title={text.stampActions.rotateLeft}
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStamp(page.id, stamp.instanceId, { rotate: stamp.rotate + 15 })}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label={text.stampActions.rotateRight}
                    title={text.stampActions.rotateRight}
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
                    aria-label={text.stampActions.delete}
                    title={text.stampActions.delete}
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
                    aria-label={text.stampActions.resize}
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
