import type { Point } from '../types';
import { isClockwiseConvexQuad, orderCorners } from './geometry';

const DETECT_LONG_EDGE = 500;
const MIN_PAGE_AREA_RATIO = 0.2;
const CANNY_LOW = 75;
const CANNY_HIGH = 200;
const POLYGON_TOLERANCE = 0.02;

// Dynamic import keeps the multi-MB WASM bundle out of the page until detection is requested.
async function loadOpenCv() {
  const { default: cvModule } = await import('@techstark/opencv-js');
  if (cvModule instanceof Promise) return await cvModule;
  if (!cvModule.Mat) {
    await new Promise<void>((resolve) => {
      cvModule.onRuntimeInitialized = () => resolve();
    });
  }
  return cvModule;
}

export async function detectDocumentCorners(bitmap: ImageBitmap): Promise<Point[] | null> {
  const cv = await loadOpenCv();

  const scale = Math.min(1, DETECT_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d')!;
  context.drawImage(bitmap, 0, 0, width, height);

  const source = cv.matFromImageData(context.getImageData(0, 0, width, height));
  const gray = new cv.Mat();
  const edges = new cv.Mat();
  const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const approximations: InstanceType<typeof cv.Mat>[] = [];

  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    cv.Canny(gray, edges, CANNY_LOW, CANNY_HIGH);
    cv.dilate(edges, edges, kernel);
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    let best: { area: number; points: Point[] } | null = null;
    for (let index = 0; index < contours.size(); index++) {
      const contour = contours.get(index);
      const approximation = new cv.Mat();
      approximations.push(approximation);
      cv.approxPolyDP(contour, approximation, POLYGON_TOLERANCE * cv.arcLength(contour, true), true);
      const area = Math.abs(cv.contourArea(approximation));
      contour.delete();

      if (approximation.rows !== 4 || !cv.isContourConvex(approximation)) continue;
      if (area < width * height * MIN_PAGE_AREA_RATIO || (best && area <= best.area)) continue;

      const points = orderCorners(
        Array.from({ length: 4 }, (_, corner) => ({
          x: approximation.data32S[corner * 2] / scale,
          y: approximation.data32S[corner * 2 + 1] / scale,
        })),
      );
      if (isClockwiseConvexQuad(points)) best = { area, points };
    }
    return best?.points ?? null;
  } finally {
    [source, gray, edges, kernel, contours, hierarchy, ...approximations].forEach((item) =>
      item.delete(),
    );
  }
}
