import type { BuiltInLayoutType, LayoutType, PageData, ProjectSettings } from '@/types';

export const BUILT_IN_LAYOUT_OPTIONS: { id: BuiltInLayoutType; label: string }[] = [
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

export const LAYOUT_OPTIONS: { id: LayoutType; label: string }[] = [
  ...BUILT_IN_LAYOUT_OPTIONS,
];

export const BACKGROUND_COLORS = [
  { id: '#ffffff', name: 'White' },
  { id: '#fdfbf7', name: 'Cream' },
  { id: '#fdf3f4', name: 'Pink' },
  { id: '#f0f4f8', name: 'Blue' },
  { id: '#f2f8f2', name: 'Mint' },
  { id: '#fff9e6', name: 'Yellow' },
];

export const BODY_PAGE_COUNT_OPTIONS = [22, 34, 46, 70, 94, 142] as const;

export const PHOTO_FILTERS = [
  { id: 'none', labelKey: 'none', css: '' },
  { id: 'grayscale', labelKey: 'grayscale', css: 'grayscale(100%)' },
  { id: 'sepia', labelKey: 'sepia', css: 'sepia(100%)' },
  { id: 'invert', labelKey: 'invert', css: 'invert(100%)' },
  { id: 'warm', labelKey: 'warm', css: 'sepia(30%) saturate(140%)' },
  { id: 'cool', labelKey: 'cool', css: 'brightness(110%) saturate(80%) sepia(10%) hue-rotate(180deg)' },
] as const;

export const STORAGE_KEY_PAGES = 'photobook_pages_v1';
export const STORAGE_KEY_SETTINGS = 'photobook_settings_v1';

export const DEFAULT_SETTINGS: ProjectSettings = {
  backgroundColor: '#ffffff',
  uiLanguage: 'ko',
  showPrintWarrantyGuide: true,
};

export const createDefaultPages = (): PageData[] => [
  { id: crypto.randomUUID(), layout: 'cover', photos: [], stamps: [] },
  ...Array.from({ length: BODY_PAGE_COUNT_OPTIONS[0] }, () => ({
    id: crypto.randomUUID(),
    layout: '1' as const,
    photos: [],
    stamps: [],
  })),
];
