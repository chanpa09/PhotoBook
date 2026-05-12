import JSZip from 'jszip';
import type { PageData, ProjectSettings } from '@/types';
import { loadImageBlob } from '@/utils/imageStore';

export const PROJECT_ARCHIVE_EXTENSION = 'photobook';
export const PROJECT_ARCHIVE_ACCEPT = `.${PROJECT_ARCHIVE_EXTENSION}`;

export interface ProjectArchiveImage {
  id: string;
  path: string;
  type: string;
  size: number;
}

export interface ProjectArchiveData {
  schemaVersion: 1;
  exportedAt: string;
  pages: PageData[];
  settings: ProjectSettings;
  currentPageIndex: number;
  images: ProjectArchiveImage[];
}

export interface ImportedProjectArchive {
  pages: PageData[];
  settings: ProjectSettings;
  currentPageIndex: number;
  images: { id: string; blob: Blob }[];
}

export interface ProjectArchiveSummary {
  exportedAt: string;
  pageCount: number;
  imageCount: number;
}

const PROJECT_JSON_PATH = 'project.json';
const IMAGE_DIR = 'images';

const stripPhotoUrls = (pages: PageData[]): PageData[] =>
  pages.map((page) => ({
    ...page,
    photos: page.photos.map((photo) => (photo ? { ...photo, url: '' } : null)),
  }));

const dataUrlToBlob = (dataUrl: string): Blob | null => {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) return null;

  const mimeType = match[1] || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const payload = match[3];
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
};

const preparePagesForArchive = async (pages: PageData[]) => {
  const imageBlobs = new Map<string, Blob>();

  const preparedPages = pages.map((page) => ({
    ...page,
    photos: page.photos.map((photo) => {
      if (!photo) return null;
      if (photo.imageId) return { ...photo };

      const blob = dataUrlToBlob(photo.url);
      if (!blob) return { ...photo };

      const imageId = `archive-${crypto.randomUUID()}`;
      imageBlobs.set(imageId, blob);
      return {
        ...photo,
        imageId,
      };
    }),
  }));

  for (const page of preparedPages) {
    for (const photo of page.photos) {
      if (!photo?.imageId || imageBlobs.has(photo.imageId)) continue;

      const blob = await loadImageBlob(photo.imageId);
      if (!blob) {
        throw new Error(`Image data is missing: ${photo.imageId}`);
      }
      imageBlobs.set(photo.imageId, blob);
    }
  }

  return { preparedPages, imageBlobs };
};

export async function createProjectArchive({
  pages,
  settings,
  currentPageIndex,
}: {
  pages: PageData[];
  settings: ProjectSettings;
  currentPageIndex: number;
}): Promise<Blob> {
  const zip = new JSZip();
  const images: ProjectArchiveImage[] = [];
  const { preparedPages, imageBlobs } = await preparePagesForArchive(pages);

  for (const [imageId, blob] of imageBlobs) {
    const path = `${IMAGE_DIR}/${imageId}`;
    zip.file(path, await blob.arrayBuffer());
    images.push({
      id: imageId,
      path,
      type: blob.type || 'application/octet-stream',
      size: blob.size,
    });
  }

  const project: ProjectArchiveData = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    pages: stripPhotoUrls(preparedPages),
    settings,
    currentPageIndex,
    images,
  };

  zip.file(PROJECT_JSON_PATH, JSON.stringify(project, null, 2));

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function createProjectArchiveFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `photobook-${timestamp}.${PROJECT_ARCHIVE_EXTENSION}`;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isPhotoSlot = (value: unknown): boolean => {
  if (value === null) return true;
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string'
    && typeof value.url === 'string'
    && typeof value.caption === 'string'
    && (value.imageId === undefined || typeof value.imageId === 'string')
  );
};

const isPageData = (value: unknown): value is PageData => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string'
    && typeof value.layout === 'string'
    && Array.isArray(value.photos)
    && value.photos.every(isPhotoSlot)
    && (value.stamps === undefined || Array.isArray(value.stamps))
  );
};

const isProjectSettings = (value: unknown): value is ProjectSettings =>
  isRecord(value) && typeof value.backgroundColor === 'string';

const isProjectArchiveImage = (value: unknown): value is ProjectArchiveImage => {
  if (!isRecord(value)) return false;
  const id = value.id;
  const path = value.path;
  const hasSafeId = (
    typeof id === 'string'
    && id.length > 0
    && !id.includes('/')
    && !id.includes('\\')
    && !id.includes('..')
  );

  return (
    hasSafeId
    && typeof path === 'string'
    && path === `${IMAGE_DIR}/${id}`
    && typeof value.type === 'string'
    && typeof value.size === 'number'
  );
};

const collectReferencedImageIds = (pages: PageData[]) =>
  new Set(
    pages.flatMap((page) =>
      page.photos.flatMap((photo) => photo?.imageId ? [photo.imageId] : []),
    ),
  );

const parseProjectArchiveData = (value: unknown): ProjectArchiveData => {
  if (!isRecord(value)) {
    throw new Error('Project metadata is invalid.');
  }

  if (
    value.schemaVersion !== 1
    || !Array.isArray(value.pages)
    || !value.pages.every(isPageData)
    || !isProjectSettings(value.settings)
    || !Array.isArray(value.images)
    || !value.images.every(isProjectArchiveImage)
    || typeof value.currentPageIndex !== 'number'
    || !Number.isFinite(value.currentPageIndex)
    || typeof value.exportedAt !== 'string'
  ) {
    throw new Error('Project metadata is invalid.');
  }

  const project = value as unknown as ProjectArchiveData;
  const archivedImageIds = new Set(project.images.map((image) => image.id));
  const missingImageId = [...collectReferencedImageIds(project.pages)]
    .find((imageId) => !archivedImageIds.has(imageId));

  if (missingImageId) {
    throw new Error(`Project image reference is missing: ${missingImageId}`);
  }

  return project;
};

async function readProjectArchiveData(file: File): Promise<{ zip: JSZip; project: ProjectArchiveData }> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const projectFile = zip.file(PROJECT_JSON_PATH);
  if (!projectFile) {
    throw new Error('Project metadata is missing.');
  }

  const project = parseProjectArchiveData(JSON.parse(await projectFile.async('string')));

  return { zip, project };
}

export async function readProjectArchiveSummary(file: File): Promise<ProjectArchiveSummary> {
  const { project } = await readProjectArchiveData(file);

  return {
    exportedAt: project.exportedAt,
    pageCount: project.pages.length,
    imageCount: project.images.length,
  };
}

export async function readProjectArchive(file: File): Promise<ImportedProjectArchive> {
  const { zip, project } = await readProjectArchiveData(file);

  const images = await Promise.all(
    project.images.map(async (image) => {
      const imageFile = zip.file(image.path);
      if (!imageFile) {
        throw new Error(`Image file is missing: ${image.id}`);
      }

      const blob = await imageFile.async('blob');
      return {
        id: image.id,
        blob: blob.type ? blob : new Blob([blob], { type: image.type || 'application/octet-stream' }),
      };
    }),
  );

  return {
    pages: project.pages,
    settings: project.settings,
    currentPageIndex: project.currentPageIndex,
    images,
  };
}
