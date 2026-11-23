import { PDFDocument } from 'pdf-lib';
import type { Page } from '../types';
import { renderPage } from './render';

const A4_SIZE = { width: 595.28, height: 841.89 };
const PAGE_MARGIN = 24;

export type PageFit = 'a4' | 'image';

export async function buildPdf(
  pages: Page[],
  fit: PageFit,
  onProgress?: (completedCount: number) => void,
) {
  const pdfDocument = await PDFDocument.create();

  for (const [index, page] of pages.entries()) {
    const rendered = await renderPage(page);
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
      const pageWidth = isLandscape ? A4_SIZE.height : A4_SIZE.width;
      const pageHeight = isLandscape ? A4_SIZE.width : A4_SIZE.height;
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