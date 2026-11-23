import type { Page } from '../types';
import { warpPerspective } from './geometry';
import { applyGrayscale, applyDocumentThreshold } from './filters';

export const QUALITY_PRESETS = {
  small: { label: 'Small file', maxLongEdge: 1400, jpegQuality: 0.6 },
  balanced: { label: 'Balanced', maxLongEdge: 2000, jpegQuality: 0.75 },
  high: { label: 'High quality', maxLongEdge: 2800, jpegQuality: 0.9 },
} as const;

export type QualityPreset = keyof typeof QUALITY_PRESETS;

const MAX_LONG_EDGE = QUALITY_PRESETS.balanced.maxLongEdge;
const JPEG_QUALITY = QUALITY_PRESETS.balanced.jpegQuality;

export type RenderedPage = { bytes: ArrayBuffer; width: number; height: number };

// OffscreenCanvas so this runs in a worker, which has no DOM.
function createCanvas(width: number, height: number) {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  return { canvas, context };
}

export async function renderPage(
  page: Page,
  maxLongEdge: number = MAX_LONG_EDGE,
  jpegQuality: number = JPEG_QUALITY,
): Promise<RenderedPage> {
  const bitmap = await createImageBitmap(page.file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxLongEdge / Math.max(bitmap.width, bitmap.height));
  const scaledWidth = Math.round(bitmap.width * scale);
  const scaledHeight = Math.round(bitmap.height * scale);

  const scaled = createCanvas(scaledWidth, scaledHeight);
  scaled.context.drawImage(bitmap, 0, 0, scaledWidth, scaledHeight);
  bitmap.close();

  let image = scaled.context.getImageData(0, 0, scaledWidth, scaledHeight);

  if (page.corners) {
    const scaledCorners = page.corners.map((corner) => ({
      x: corner.x * scale,
      y: corner.y * scale,
    }));
    image = warpPerspective(image, scaledCorners);
  }
  if (page.filter === 'gray') applyGrayscale(image);
  if (page.filter === 'bw') applyDocumentThreshold(image);

  const processed = createCanvas(image.width, image.height);
  processed.context.putImageData(image, 0, 0);

  const isSideways = page.rotation % 180 !== 0;
  const { canvas: outputCanvas, context: outputContext } = createCanvas(
    isSideways ? image.height : image.width,
    isSideways ? image.width : image.height,
  );

  outputContext.fillStyle = '#fff';
  outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputContext.translate(outputCanvas.width / 2, outputCanvas.height / 2);
  outputContext.rotate((page.rotation * Math.PI) / 180);
  outputContext.drawImage(processed.canvas, -image.width / 2, -image.height / 2);

  const blob = await outputCanvas.convertToBlob({ type: 'image/jpeg', quality: jpegQuality });

  return {
    bytes: await blob.arrayBuffer(),
    width: outputCanvas.width,
    height: outputCanvas.height,
  };
}