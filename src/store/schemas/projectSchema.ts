import { z } from 'zod';

export const TextStyleSchema = z.object({
  fontMode: z.enum(['auto', 'manual']).optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  color: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  fontWeight: z.union([z.enum(['normal', 'bold']), z.number()]).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  backgroundColor: z.string().optional(),
  languageMode: z.enum(['auto', 'manual']).optional(),
  language: z.enum(['ko', 'ja', 'mixed']).optional(),
});

export const LayoutTextSchema = z.object({
  value: z.string(),
  style: TextStyleSchema.optional(),
});

export const PhotoSchema = z.object({
  id: z.string(),
  imageId: z.string().optional(),
  originalImageId: z.string().optional(),
  url: z.string(),
  caption: z.string(),
  fit: z.enum(['contain', 'cover']).optional(),
  scale: z.number().optional(),
  offset: z.object({ x: z.number(), y: z.number() }).optional(),
  filter: z.string().optional(),
  captionStyle: TextStyleSchema.optional(),
});

export const StampInstanceSchema = z.object({
  instanceId: z.string(),
  stampId: z.string(),
  imageUrl: z.string(),
  x: z.number(),
  y: z.number(),
  size: z.number().optional(),
  scale: z.number(),
  rotate: z.number(),
  zIndex: z.number(),
});

export const BuiltInLayoutTypeSchema = z.enum([
  'cover',
  '1',
  '2-row',
  '2-col',
  '3-row',
  '3-top',
  '4-grid',
  '4-top',
  '5-grid',
  '6-grid',
]);

export const LayoutTypeSchema = z.union([
  BuiltInLayoutTypeSchema,
  z.string().regex(/^imported-/),
]);

export const PageDataSchema = z.object({
  id: z.string(),
  layout: LayoutTypeSchema,
  spreadSide: z.enum(['left', 'right']).optional(),
  photos: z.array(PhotoSchema.nullable()),
  layoutTexts: z.array(LayoutTextSchema).optional(),
  coverTitle: z.string().optional(),
  coverDate: z.string().optional(),
  coverTitleStyle: TextStyleSchema.optional(),
  coverDateStyle: TextStyleSchema.optional(),
  stamps: z.array(StampInstanceSchema).optional(),
});

export const ProjectSettingsSchema = z.object({
  backgroundColor: z.string(),
  uiLanguage: z.enum(['ko', 'ja']).optional(),
  imageMaxResolution: z.number().optional(),
  exportMode: z.enum(['individual', 'zip']).optional(),
  showPrintWarrantyGuide: z.boolean().optional(),
});

export const ProjectStoreSchema = z.object({
  pages: z.array(PageDataSchema),
  settings: ProjectSettingsSchema,
  currentPageIndex: z.number(),
});

export type ValidatedProjectStore = z.infer<typeof ProjectStoreSchema>;
