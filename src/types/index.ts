export type BuiltInLayoutType =
  | 'cover'
  | '1'
  | '2-row'
  | '2-col'
  | '3-row'
  | '3-top'
  | '4-grid'
  | '4-top'
  | '5-grid'
  | '6-grid';

export type ImportedLayoutType = `imported-${string}`;
export type ImportedTemplateType = 'page' | 'cover' | 'title' | 'colophon' | string;

export type LayoutType = BuiltInLayoutType | ImportedLayoutType;
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

export interface LayoutText {
  value: string;
  style?: TextStyle;
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

export interface StampAsset {
  id: string;
  label: string;
  thumbnailUrl: string;
  imageUrl: string;
  categories: number[];
  tags: string[];
  isIp: boolean;
  isCover: boolean;
  isPage: boolean;
  minSize?: number;
}

export interface StampInstance {
  instanceId: string;
  stampId: string;
  imageUrl: string;
  x: number;
  y: number;
  size?: number;
  scale: number;
  rotate: number;
  zIndex: number;
}

export interface FrameLayoutDefinition {
  id: ImportedLayoutType;
  sourceId: string;
  templateType: ImportedTemplateType;
  variationName: string;
  label: string;
  pageCount: number;
  photoFrameCount: number;
  textFrameCount: number;
  isUserSelectable: boolean;
  isObjectLayer: boolean;
  isDefault: boolean;
  thumbnailUrl?: string;
  sourceWidth: number;
  sourceHeight: number;
  frames: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  textFrames?: {
    x: number;
    y: number;
    width: number;
    height: number;
    textType?: string;
    isVertical?: boolean;
  }[];
}

export interface PageData {
  id: string;
  layout: LayoutType;
  spreadSide?: 'left' | 'right';
  photos: PhotoSlot[];
  layoutTexts?: LayoutText[];
  coverTitle?: string; // 표지 레이아웃용 제목
  coverDate?: string; // 표지 레이아웃용 날짜
  coverTitleStyle?: TextStyle;
  coverDateStyle?: TextStyle;
  stamps?: StampInstance[];
}

export interface ProjectSettings {
  backgroundColor: string;
  uiLanguage?: UILanguage;
  imageMaxResolution?: number; // Max dimension in px (0 = original, default 2400)
  exportMode?: 'individual' | 'zip';
  showPrintWarrantyGuide?: boolean;
}
