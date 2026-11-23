import { PDFDocument } from 'pdf-lib';
import type { Page } from '../types';
import { QUALITY_PRESETS, renderPage } from './render';
import type { QualityPreset } from './render';

export const PAGE_SIZES = {
  a4: { label: 'A4', width: 595.28, height: 841.89 },
  letter: { label: 'Letter', width: 612, height: 792 },
} as const;

const PAGE_MARGIN = 24;

export type PageFit = keyof typeof PAGE_SIZES | 'image';

export async function buildPdf(
  pages: Page[],
  fit: PageFit,
  quality: QualityPreset,
  onProgress?: (completedCount: number) => void,
) {
  const pdfDocument = await PDFDocument.create();
  const { maxLongEdge, jpegQuality } = QUALITY_PRESETS[quality];

  for (const [index, page] of pages.entries()) {
    const rendered = await renderPage(page, maxLongEdge, jpegQuality);
    const embeddedImage = await pdfDocument.embedJpg(rendered.bytes);

    if (fit === 'image') {
      const pdfPage = pdfDocument.addPage([rendered.width, rendered.height]);
      pdfPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: rendered.width,
        height: rendered.height,
      });
    } else {
      const isLandscape = rendered.width > rendered.height;
      const size = PAGE_SIZES[fit];
      const pageWidth = isLandscape ? size.height : size.width;
      const pageHeight = isLandscape ? size.width : size.height;
      const fitScale = Math.min(
        (pageWidth - 2 * PAGE_MARGIN) / rendered.width,
        (pageHeight - 2 * PAGE_MARGIN) / rendered.height,
      );
      const drawWidth = rendered.width * fitScale;
      const drawHeight = rendered.height * fitScale;

      const pdfPage = pdfDocument.addPage([pageWidth, pageHeight]);
      pdfPage.drawImage(embeddedImage, {
        x: (pageWidth - drawWidth) / 2,
        y: (pageHeight - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      });
    }
    onProgress?.(index + 1);
  }
  return pdfDocument.save();
}