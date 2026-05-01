/**
 * Resize an image file using Canvas.
 * Returns the original blob if maxDimension is 0 or the image is already within bounds.
 */
export async function resizeImage(file: Blob, maxDimension: number): Promise<Blob> {
  if (maxDimension <= 0) return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  if (width <= maxDimension && height <= maxDimension) {
    bitmap.close();
    return file;
  }

  const scale = maxDimension / Math.max(width, height);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();

  // Preserve original format when possible
  const type = file instanceof File ? file.type : 'image/jpeg';
  const outputType = type === 'image/png' ? 'image/png' : 'image/jpeg';
  const quality = outputType === 'image/jpeg' ? 0.92 : undefined;

  return canvas.convertToBlob({ type: outputType, quality });
}

export const IMAGE_RESOLUTION_OPTIONS = [
  { value: 0, labelKey: 'original' as const },
  { value: 4000, labelKey: '4000px' as const },
  { value: 2400, labelKey: '2400px' as const },
  { value: 1600, labelKey: '1600px' as const },
  { value: 800, labelKey: '800px' as const },
] as const;

export const DEFAULT_IMAGE_MAX_RESOLUTION = 2400;
