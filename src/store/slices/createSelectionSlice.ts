import type { StateCreator } from 'zustand';
import type { ProjectState, SelectionSlice } from '../types';

export const createSelectionSlice: StateCreator<ProjectState, [], [], SelectionSlice> = (set) => ({
  selectedStampId: null,
  selectedPhoto: null,
  setSelectedStampId: (selection) => set((state) => ({ 
    selectedStampId: selection, 
    selectedPhoto: selection ? null : state.selectedPhoto 
  })),
  setSelectedPhoto: (selection) => set((state) => ({ 
    selectedPhoto: selection, 
    selectedStampId: selection ? null : state.selectedStampId 
  })),
  clearSelection: () => set({ 
    selectedStampId: null, 
    selectedPhoto: null 
  }),
});