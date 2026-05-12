import type { ImportedLayoutType } from '@/types';

export const IMPORTED_LAYOUTS_PATH = `${import.meta.env.BASE_URL}data/layouts/a4.json`;

export const IMPORTED_LAYOUT_ALIASES = {
  'imported-a4-1': 'imported-page-0d291705-29fe-46b9-a2fa-b3e220118fad',
  'imported-a4-2': 'imported-page-04136ba5-e81a-4563-8a94-0bfae91284d3',
  'imported-a4-3': 'imported-page-1050d1bc-431c-4bab-883c-8334972a7ac1',
  'imported-a4-4': 'imported-page-67b88b8c-1b6e-4f05-a284-f4628f4a5de4',
} satisfies Partial<Record<ImportedLayoutType, ImportedLayoutType>>;
