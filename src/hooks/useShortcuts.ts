import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import type { StampInstance } from '@/types';

interface UseShortcutsParams {
  undo: () => void;
  redo: () => void;
}

export function useShortcuts({ undo, redo }: UseShortcutsParams) {
  const {
    pages,
    currentPageIndex,
    selectedPhoto,
    selectedStamp,
    updatePhoto,
    removeStamp,
    addStampInstance,
    clearSelection,
  } = useProjectStore(
    useShallow((state) => ({
      pages: state.pages,
      currentPageIndex: state.currentPageIndex,
      selectedPhoto: state.selectedPhoto,
      selectedStamp: state.selectedStampId,
      updatePhoto: state.updatePhoto,
      removeStamp: state.removeStamp,
      addStampInstance: state.addStampInstance,
      clearSelection: state.clearSelection,
    })),
  );

  const clipboard = useRef<{ type: 'stamp'; data: StampInstance } | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Undo/Redo
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      // Delete
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedPhoto) {
          event.preventDefault();
          updatePhoto(selectedPhoto.pageId, selectedPhoto.photoIndex, null);
          clearSelection();
        } else if (selectedStamp) {
          event.preventDefault();
          removeStamp(selectedStamp.pageId, selectedStamp.instanceId);
          clearSelection();
        }
        return;
      }

      // Copy
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        if (selectedStamp) {
          event.preventDefault();
          const page = pages.find(p => p.id === selectedStamp.pageId);
          const stamp = page?.stamps?.find(s => s.instanceId === selectedStamp.instanceId);
          if (stamp) {
            clipboard.current = { type: 'stamp', data: { ...stamp } };
          }
        }
        return;
      }

      // Paste
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        if (clipboard.current?.type === 'stamp') {
          event.preventDefault();
          const targetPageId = selectedStamp?.pageId || selectedPhoto?.pageId || pages[currentPageIndex]?.id;
          if (targetPageId) {
            addStampInstance(targetPageId, clipboard.current.data);
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, pages, currentPageIndex, selectedPhoto, selectedStamp, updatePhoto, removeStamp, addStampInstance, clearSelection]);
}
