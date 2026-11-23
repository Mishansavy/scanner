import type { Point } from '../types';

function solveLinearSystem(coefficients: number[][], constants: number[]): number[] {
  const size = constants.length;
  const augmented = coefficients.map((row, rowIndex) => [...row, constants[rowIndex]]);

  for (let column = 0; column < size; column++) {
    let pivotRow = column;
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivotRow][column])) {
        pivotRow = row;
      }
    }
    if (Math.abs(augmented[pivotRow][column]) < 1e-12) throw new Error('Bad crop corners');
    [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]];

    for (let row = 0; row < size; row++) {
      if (row === column) continue;
      const factor = augmented[row][column] / augmented[column][column];
      for (let entry = column; entry <= size; entry++) {
        augmented[row][entry] -= factor * augmented[column][entry];
      }
    }
  }
  return augmented.map((row, rowIndex) => row[size] / row[rowIndex]);
}

export function computeHomography(fromPoints: Point[], toPoints: Point[]): number[] {
  const coefficients: number[][] = [];
  const constants: number[] = [];

  for (let index = 0; index < 4; index++) {
    const { x, y } = fromPoints[index];
    const { x: targetX, y: targetY } = toPoints[index];
    coefficients.push([x, y, 1, 0, 0, 0, -targetX * x, -targetX * y]);
    constants.push(targetX);
    coefficients.push([0, 0, 0, x, y, 1, -targetY * x, -targetY * y]);
    constants.push(targetY);
  }
  return [...solveLinearSystem(coefficients, constants), 1];
}

// True when TL, TR, BR, BL form a clockwise convex quad; crossed or mirrored corners break the warp.
export function isClockwiseConvexQuad(corners: Point[]): boolean {
  return corners.every((corner, index) => {
    const next = corners[(index + 1) % 4];
    const after = corners[(index + 2) % 4];
    return (next.x - corner.x) * (after.y - next.y) - (next.y - corner.y) * (after.x - next.x) > 0;
  });
}

// Orders four unordered points as TL, TR, BR, BL.
export function orderCorners(points: Point[]): Point[] {
  const bySum = [...points].sort((first, second) => first.x + first.y - (second.x + second.y));
  const byDifference = [...points].sort((first, second) => first.y - first.x - (second.y - second.x));
  return [bySum[0], byDifference[0], bySum[3], byDifference[3]];
}

export function isInsideClockwiseQuad(point: Point, corners: Point[]): boolean {
  return corners.every((corner, index) => {
    const next = corners[(index + 1) % 4];
    return (next.x - corner.x) * (point.y - corner.y) - (next.y - corner.y) * (point.x - corner.x) >= 0;
  });
}

function readChannel(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  channel: number,
) {
  const clampedX = Math.min(width - 1, Math.max(0, x));
  const clampedY = Math.min(height - 1, Math.max(0, y));
  return pixels[(clampedY * width + clampedX) * 4 + channel];
}

export function warpPerspective(source: ImageData, corners: Point[]): ImageData {
  const distance = (start: Point, end: Point) => Math.hypot(start.x - end.x, start.y - end.y);
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;

  const outputWidth = Math.max(
    1,
    Math.round(Math.max(distance(topLeft, topRight), distance(bottomLeft, bottomRight))),
  );
  const outputHeight = Math.max(
    1,
    Math.round(Math.max(distance(topLeft, bottomLeft), distance(topRight, bottomRight))),
  );

  const matrix = computeHomography(
    [
      { x: 0, y: 0 },
      { x: outputWidth, y: 0 },
      { x: outputWidth, y: outputHeight },
      { x: 0, y: outputHeight },
    ],
    corners,
  );

  const output = new ImageData(outputWidth, outputHeight);
  const outputPixels = output.data;
  const sample = (sampleX: number, sampleY: number, channel: number) =>
    readChannel(source.data, source.width, source.height, sampleX, sampleY, channel);

  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      const centerX = x + 0.5;
      const centerY = y + 0.5;
      const weight = matrix[6] * centerX + matrix[7] * centerY + matrix[8];
      const sourceX = (matrix[0] * centerX + matrix[1] * centerY + matrix[2]) / weight - 0.5;
      const sourceY = (matrix[3] * centerX + matrix[4] * centerY + matrix[5]) / weight - 0.5;

      const left = Math.floor(sourceX);
      const top = Math.floor(sourceY);
      const fractionX = sourceX - left;
      const fractionY = sourceY - top;
      const outputIndex = (y * outputWidth + x) * 4;

      for (let channel = 0; channel < 4; channel++) {
        const topValue =
          sample(left, top, channel) * (1 - fractionX) + sample(left + 1, top, channel) * fractionX;
        const bottomValue =
          sample(left, top + 1, channel) * (1 - fractionX) +
          sample(left + 1, top + 1, channel) * fractionX;
        outputPixels[outputIndex + channel] = topValue * (1 - fractionY) + bottomValue * fractionY;
      }
    }
  }
  return output;
}