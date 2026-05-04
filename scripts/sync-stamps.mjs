import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STAMPS_API = 'https://api-gw.n-pri.jp/v1/photobook/template/stamps';
const STAMP_SIZES_API = 'https://api-gw.n-pri.jp/v1/photobook/template/stamps/sizes';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const stampDir = path.join(rootDir, 'public', 'data', 'stamps');
const assetDir = path.join(stampDir, 'assets');

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }

  return response.json();
}

function extensionFromUrl(url) {
  const pathname = new URL(url).pathname;
  const extension = path.extname(pathname).toLowerCase();
  return extension || '.png';
}

async function downloadFile(url, filename) {
  const outputPath = path.join(assetDir, filename);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image download failed ${response.status}: ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
}

async function main() {
  await mkdir(assetDir, { recursive: true });

  const [stampResponse, sizeResponse] = await Promise.all([
    readJson(STAMPS_API),
    readJson(STAMP_SIZES_API),
  ]);

  const minSize = sizeResponse.data?.stampSizes?.find(
    (size) => size.category === 'stamp_min_size' && size.size === 'A4',
  )?.value ?? 240;

  const sourceStamps = stampResponse.data?.stamps ?? [];
  const visibleStamps = sourceStamps.filter((stamp) => (
    stamp.is_visible !== false
    && stamp.is_disabled !== true
    && stamp.thumbnail_image_file_name
    && stamp.composition_image_file_name
  ));

  const stamps = [];
  for (let index = 0; index < visibleStamps.length; index += 1) {
    const stamp = visibleStamps[index];
    const thumbnailName = `${stamp.id}-thumb${extensionFromUrl(stamp.thumbnail_image_file_name)}`;
    const imageName = `${stamp.id}-material${extensionFromUrl(stamp.composition_image_file_name)}`;

    await Promise.all([
      downloadFile(stamp.thumbnail_image_file_name, thumbnailName),
      downloadFile(stamp.composition_image_file_name, imageName),
    ]);

    stamps.push({
      id: stamp.id,
      label: stamp.variation_name || stamp.id,
      thumbnailUrl: `/data/stamps/assets/${thumbnailName}`,
      imageUrl: `/data/stamps/assets/${imageName}`,
      categories: Array.isArray(stamp.categories) ? stamp.categories : [],
      tags: Array.isArray(stamp.tags) ? stamp.tags : [],
      isIp: Boolean(stamp.is_ip),
      isCover: Boolean(stamp.is_cover),
      isPage: Boolean(stamp.is_page),
      minSize,
    });

    if ((index + 1) % 25 === 0) {
      console.log(`Downloaded ${index + 1}/${visibleStamps.length} stamps`);
    }
  }

  await writeFile(
    path.join(stampDir, 'stamps.json'),
    `${JSON.stringify({
      source: STAMPS_API,
      syncedAt: new Date().toISOString(),
      minSize,
      stamps,
    }, null, 2)}\n`,
  );

  console.log(`Synced ${stamps.length} stamps to public/data/stamps`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
