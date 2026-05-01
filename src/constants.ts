import type { LayoutType, PageData, ProjectSettings } from './types';

export const LAYOUT_OPTIONS: { id: LayoutType; label: string }[] = [
  { id: 'cover', label: '표지 (Cover)' },
  { id: '1', label: '1장' },
  { id: '2-row', label: '2장 (위아래)' },
  { id: '2-col', label: '2장 (좌우)' },
  { id: '3-row', label: '3장 (가로)' },
  { id: '3-top', label: '3장 (상단 강조)' },
  { id: '4-grid', label: '4장 (바둑판)' },
  { id: '4-top', label: '4장 (상단 강조)' },
  { id: '5-grid', label: '5장' },
  { id: '6-grid', label: '6장' },
];

export const BACKGROUND_COLORS = [
  { id: '#ffffff', name: 'White' },
  { id: '#fdfbf7', name: 'Cream' },
  { id: '#fdf3f4', name: 'Pink' },
  { id: '#f0f4f8', name: 'Blue' },
  { id: '#f2f8f2', name: 'Mint' },
  { id: '#fff9e6', name: 'Yellow' },
];

export const STORAGE_KEY_PAGES = 'photobook_pages_v1';
export const STORAGE_KEY_SETTINGS = 'photobook_settings_v1';

export const DEFAULT_SETTINGS: ProjectSettings = {
  backgroundColor: '#ffffff',
  uiLanguage: 'ko',
};

export const createDefaultPages = (): PageData[] => [
  { id: crypto.randomUUID(), layout: 'cover', photos: [] },
  { id: crypto.randomUUID(), layout: '1', photos: [] },
];
