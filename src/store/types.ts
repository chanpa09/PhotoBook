import type {
  FrameLayoutDefinition,
  LayoutText,
  LayoutType,
  PageData,
  Photo,
  ProjectSettings,
  StampAsset,
  StampInstance,
} from '../types';
import type { ImportedProjectArchive } from '@/utils/projectArchive';

export type {
  FrameLayoutDefinition,
  LayoutText,
  LayoutType,
  PageData,
  Photo,
  ProjectSettings,
  StampAsset,
  StampInstance,
};

export type ImportedLayoutStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PageSlice {
  pages: PageData[];
  currentPageIndex: number;
  setPages: (pages: PageData[] | ((current: PageData[]) => PageData[])) => void;
  setCurrentPageIndex: (index: number | ((current: number) => number)) => void;
  setBodyPageCount: (count: number) => void;
  movePage: (direction: 'up' | 'down') => void;
  reorderPages: (activeId: string, overId: string) => void;
  updatePageData: (pageId: string, updates: Partial<PageData>) => void;
  updateLayout: (layout: LayoutType) => void;
}

export interface PhotoSlice {
  updatePhoto: (pageId: string, index: number, photo: Partial<Photo> | null) => void;
  updatePhotoTransform: (pageId: string, index: number, transform: { scale?: number; offset?: { x: number; y: number } }) => void;
  updateLayoutText: (pageId: string, textIndex: number, updates: Partial<LayoutText>) => void;
}

export interface StampSlice {
  addStamp: (pageId: string, stamp: StampAsset) => void;
  addStampAt: (pageId: string, stamp: StampAsset, position: { x: number; y: number }) => void;
  addStampInstance: (pageId: string, stamp: StampInstance, position?: { x: number; y: number }) => void;
  updateStamp: (pageId: string, instanceId: string, updates: Partial<StampInstance>) => void;
  removeStamp: (pageId: string, instanceId: string) => void;
  duplicateStamp: (pageId: string, instanceId: string, position?: { x: number; y: number }) => void;
  bringStampToFront: (pageId: string, instanceId: string) => void;
  bringStampForward: (pageId: string, instanceId: string) => void;
  sendStampBackward: (pageId: string, instanceId: string) => void;
  sendStampToBack: (pageId: string, instanceId: string) => void;
}

export interface ProjectSlice {
  isLoaded: boolean;
  importedLayouts: FrameLayoutDefinition[];
  importedLayoutStatus: ImportedLayoutStatus;
  importedLayoutError: string | null;
  settings: ProjectSettings;
  
  setIsLoaded: (isLoaded: boolean) => void;
  setSettings: (settings: ProjectSettings) => void;
  loadImportedLayouts: () => Promise<void>;
  replaceProject: (project: ImportedProjectArchive) => Promise<void>;
  loadLegacyData: () => Promise<void>;
}

export interface SelectionSlice {
  selectedStampId: { pageId: string; instanceId: string } | null;
  selectedPhoto: { pageId: string; photoIndex: number } | null;
  setSelectedStampId: (selection: { pageId: string; instanceId: string } | null) => void;
  setSelectedPhoto: (selection: { pageId: string; photoIndex: number } | null) => void;
  clearSelection: () => void;
}

export type ProjectState = PageSlice & PhotoSlice & StampSlice & ProjectSlice & SelectionSlice;
