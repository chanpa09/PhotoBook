export type LayoutType = 'cover' | '1' | '2-row' | '2-col' | '3-row' | '3-top' | '4-grid' | '4-top' | '5-grid' | '6-grid';
export type UILanguage = 'ko' | 'ja';
export type FontMode = 'auto' | 'manual';
export type TextLanguage = 'ko' | 'ja' | 'mixed';
export type TextLanguageMode = 'auto' | 'manual';

export interface TextStyle {
  fontMode?: FontMode;
  fontFamily?: string;
  fontSize?: number;
  languageMode?: TextLanguageMode;
  language?: TextLanguage;
}

export interface Photo {
  id: string;
  imageId?: string; // Reference key for Blob storage (imageStore)
  url: string; // Runtime display URL (ObjectURL or base64 for legacy)
  caption: string;
  fit?: 'contain' | 'cover';
  scale?: number;
  offset?: { x: number; y: number };
  captionStyle?: TextStyle;
}

export type PhotoSlot = Photo | null;

export interface PageData {
  id: string;
  layout: LayoutType;
  photos: PhotoSlot[];
  coverTitle?: string; // 표지 레이아웃용 제목
  coverDate?: string; // 표지 레이아웃용 날짜
  coverTitleStyle?: TextStyle;
  coverDateStyle?: TextStyle;
}

export interface ProjectSettings {
  backgroundColor: string;
  uiLanguage?: UILanguage;
  imageMaxResolution?: number; // Max dimension in px (0 = original, default 2400)
  exportMode?: 'individual' | 'zip';
}
